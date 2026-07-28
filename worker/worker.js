const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed === "*" ? "*" : (origin === allowed ? origin : allowed),
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method === "GET") return json({ ok: true, service: "OneArete Decision Engine", product: "Nomi", version: "3.0.1" }, 200, cors);
    if (request.method !== "POST") return json({ error: "Use POST para pedir uma decisão." }, 405, cors);
    if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada no Worker." }, 500, cors);

    try {
      const input = await request.json();
      validate(input);
      const result = await decide(input, env);
      return json(result, 200, cors);
    } catch (error) {
      return json({ error: error?.message || "Erro interno do OneArete Decision Engine." }, 500, cors);
    }
  }
};

async function decide(input, env) {
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const prompt = buildPrompt(input);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ googleMaps: {} }],
    toolConfig: {
      retrievalConfig: {
        latLng: { latitude: Number(input.latitude), longitude: Number(input.longitude) }
      }
    },
    generationConfig: { temperature: 0.25, maxOutputTokens: 4096 }
  };

  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body)
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readGeminiError(raw, response.status));

  const candidate = raw.candidates?.[0];
  const text = (candidate?.content?.parts || []).map(p => p.text || "").join("\n").trim();
  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .filter(chunk => chunk.maps)
    .map(chunk => ({ title: chunk.maps.title || "Google Maps", uri: chunk.maps.uri || "", placeId: chunk.maps.placeId || "" }));

  const parsed = parseJson(text);
  const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  const places = recommendations.slice(0, 8).map((item, index) => normalize(item, sources, input, index));
  if (!places.length) throw new Error("O Gemini não devolveu recomendações estruturadas. Repete a pesquisa.");

  return {
    provider: "Gemini + Google Maps",
    engine: "OneArete Decision Engine",
    domain: input.domain || "restaurant",
    confidence: clamp(Number(parsed.confidence || 0.82), 0.3, 0.99),
    places,
    sources
  };
}

function buildPrompt(input) {
  const family = input.domain === "family";
  const radiusKm = Math.round(Number(input.radiusMeters || 15000) / 1000);
  const prefs = (input.preferences || []).join(", ") || "sem preferências adicionais";
  const task = family
    ? `Encontra atividades reais para fazer com crianças. Idades/grupo: ${input.mood || "idades não indicadas"}.`
    : `Encontra ${labelIntent(input.intent)} reais. Contexto: ${input.mood || "casual"}.`;

  return `You are the OneArete Decision Engine powering Nomi. Use Google Maps grounding. ${task}
User location is supplied to the Maps tool. Maximum radius: ${radiusKm} km. Budget: ${Number(input.budget || 30)} EUR ${family ? "for the group" : "per person"}. Preferences: ${prefs}.

Select only real places that fit the request. Prioritize contextual fit, quality, review evidence, distance, budget plausibility, current relevance, and diversity. For family activities, reject generic shops and adult-only venues. For restaurants, reject results that conflict with cuisine or occasion. Do not invent ratings, prices, addresses, opening hours, or distances. When exact data is unavailable, use null or an empty string.

Return ONLY valid JSON, with no markdown and no prose outside JSON, using this exact shape:
{
  "confidence": 0.0,
  "recommendations": [
    {
      "name": "",
      "category": "",
      "address": "",
      "distanceKm": 0,
      "rating": null,
      "reviewCount": 0,
      "estimatedPrice": "",
      "score": 0,
      "why": ["", "", ""],
      "bestFor": "",
      "mapsTitle": ""
    }
  ]
}
Return 5 to 8 recommendations, ordered best first. Score must be an integer from 1 to 99.`;
}

function normalize(item, sources, input, index) {
  const name = String(item.name || "Opção sem nome").trim();
  const source = findSource(item.mapsTitle || name, sources);
  const why = Array.isArray(item.why) ? item.why.filter(Boolean).slice(0, 4) : [];
  const query = encodeURIComponent(`${name} ${item.address || ""}`.trim());
  return {
    id: source?.placeId || `ode-${slug(name)}-${index}`,
    name,
    cuisine: item.category || (input.domain === "family" ? "Atividade em família" : "Restaurante"),
    address: item.address || "",
    lat: Number(input.latitude),
    lon: Number(input.longitude),
    distanceKm: Math.max(0, Number(item.distanceKm || 0)),
    rating: item.rating == null ? null : Number(item.rating),
    userRatingCount: Math.max(0, Number(item.reviewCount || 0)),
    priceLevel: item.estimatedPrice || null,
    imageUrl: "",
    website: "",
    googleUrl: source?.uri || `https://www.google.com/maps/search/?api=1&query=${query}`,
    openingHours: [],
    matchScore: Math.round(clamp(Number(item.score || 78), 1, 99)),
    matchDetails: why.length ? why : [item.bestFor || "adequado ao contexto pedido"],
    bestFor: item.bestFor || ""
  };
}

function findSource(title, sources) {
  const needle = normalizeText(title);
  if (!needle) return null;
  return sources.find(s => {
    const hay = normalizeText(s.title);
    return hay.includes(needle) || needle.includes(hay);
  }) || null;
}

function parseJson(text) {
  const clean = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(clean); } catch {}
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch {}
  }
  return null;
}

function validate(input) {
  if (!Number.isFinite(Number(input.latitude)) || !Number.isFinite(Number(input.longitude))) throw new Error("Localização inválida.");
  if (!['restaurant','family'].includes(input.domain || 'restaurant')) throw new Error("Domínio de decisão inválido.");
}
function labelIntent(intent) { return ({ eat:"restaurants", coffee:"cafés", drink:"bars", dessert:"dessert places", surprise:"food and drink places" })[intent] || "restaurants"; }
function readGeminiError(data, status) { return `Gemini ${status}: ${data?.error?.message || "pedido recusado"}`; }
function normalizeText(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
function slug(v) { return normalizeText(v).replace(/ /g, "-").slice(0, 48); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function json(data, status, headers) { return new Response(JSON.stringify(data, null, 2), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } }); }
