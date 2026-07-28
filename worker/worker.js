const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const VERSION = "3.1.1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
    if (request.method === "GET" && ["/", "/health"].includes(url.pathname)) {
      return json({ ok: true, service: "OneArete Decision Engine", product: "Nomi", version: VERSION, geminiConfigured: Boolean(env.GEMINI_API_KEY) }, 200, cors);
    }
    if (request.method === "GET" && url.pathname === "/version") return json({ version: VERSION }, 200, cors);
    if (request.method !== "POST" || url.pathname !== "/decision") return json({ error: "Usa POST /decision para pedir uma decisão." }, 405, cors);
    if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada no Worker." }, 500, cors);

    try {
      const input = await request.json();
      validate(input);
      return json(await decide(input, env), 200, cors);
    } catch (error) {
      return json({ error: error?.message || "Erro interno do OneArete Decision Engine." }, 500, cors);
    }
  }
};

async function decide(input, env) {
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const body = {
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    tools: [{ googleMaps: {} }],
    toolConfig: { retrievalConfig: { latLng: { latitude: Number(input.latitude), longitude: Number(input.longitude) } } },
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json" }
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
  let places = recommendations.slice(0, 8).map((item, index) => normalize(item, sources, input, index));
  if (input.domain !== "family" && input.mood === "Romântico") {
    places = places.filter(place => isRomanticCandidate(place));
  }
  if (!places.length) throw new Error("Não encontrei opções com evidência suficiente para esta ocasião. Aumenta a distância ou o orçamento.");

  return {
    provider: "Gemini + Google Maps",
    engine: "OneArete Decision Engine",
    version: VERSION,
    domain: input.domain || "restaurant",
    confidence: clamp(Number(parsed.confidence || 0.82), 0.3, 0.99),
    uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty.filter(Boolean).slice(0, 4) : [],
    places,
    sources
  };
}

function buildPrompt(input) {
  const family = input.domain === "family";
  const radiusKm = Math.round(Number(input.radiusMeters || 15000) / 1000);
  const prefs = (input.preferences || []).join(", ") || "sem preferências adicionais";
  const occasion = input.mood || "casual";
  const task = family
    ? `Encontra atividades reais para fazer com crianças. Idades/grupo: ${occasion}.`
    : `Encontra ${labelIntent(input.intent)} reais. A ocasião pedida é: ${occasion}.`;
  const romanticRules = !family && occasion === "Romântico" ? `
ROMANTIC OCCASION IS A HARD CONSTRAINT, NOT A SOFT PREFERENCE.
Reject snack-bars, cervejarias, fast-food, take-away counters, generic cafés, food courts, noisy sports bars and purely practical neighbourhood eateries unless there is strong grounded evidence of an intimate romantic atmosphere.
Prefer restaurants with at least two grounded romantic signals such as: intimate or elegant ambience, scenic view, candlelit/refined setting, quiet atmosphere, special-occasion positioning, strong wine/dinner experience, terrace with view, or repeated review evidence mentioning romance/anniversary/date-night.
Do not award a score above 85 without grounded evidence of occasion fit. If evidence is weak, omit the place. It is better to return only 3 strong options than 8 weak ones.
` : "";

  return `You are the OneArete Decision Engine powering Nomi. Use Google Maps grounding. ${task}
Maximum radius: ${radiusKm} km. Budget: ${Number(input.budget || 30)} EUR ${family ? "for the group" : "per person"}. Preferences: ${prefs}.
${romanticRules}
Deliberate across occasion fit FIRST, then quality, distance, budget, popularity, accessibility and preference fit. Select only real places. Never invent factual data. Every recommendation must include concrete reasons tied to grounded evidence. For missing facts use null or empty strings. Reservation or ticket URLs may only be returned when grounded or clearly official.

Return ONLY valid JSON:
{
  "confidence": 0.0,
  "uncertainty": [""],
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
      "mapsTitle": "",
      "website": "",
      "reservationUrl": "",
      "ticketUrl": ""
    }
  ]
}
Return 3 to 6 recommendations ordered best first. Score is an integer 1-99 and must reflect evidence-backed occasion fit.`;
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
    website: safeUrl(item.website),
    reservationUrl: safeUrl(item.reservationUrl),
    ticketUrl: safeUrl(item.ticketUrl),
    googleUrl: source?.uri || `https://www.google.com/maps/search/?api=1&query=${query}`,
    openingHours: [],
    matchScore: Math.round(clamp(Number(item.score || 78), 1, 99)),
    matchDetails: why.length ? why : [item.bestFor || "adequado ao contexto pedido"],
    bestFor: item.bestFor || ""
  };
}


function isRomanticCandidate(place) {
  const text = normalizeText([place.name, place.cuisine, place.bestFor, ...(place.matchDetails || [])].join(" "));
  const excluded = ["snack bar", "cervejaria", "fast food", "take away", "food court", "sports bar"];
  if (excluded.some(term => text.includes(term))) return false;
  const signals = ["romant", "intim", "elegant", "vista", "tranquil", "silenc", "vinho", "especial", "anivers", "date night", "terraco", "esplanada"];
  const evidence = signals.filter(term => text.includes(term)).length;
  return place.matchScore >= 78 && evidence >= 2;
}

function safeUrl(value) { try { const u = new URL(String(value || "")); return ["http:", "https:"].includes(u.protocol) ? u.toString() : ""; } catch { return ""; } }
function findSource(title, sources) { const needle = normalizeText(title); if (!needle) return null; return sources.find(s => { const hay = normalizeText(s.title); return hay.includes(needle) || needle.includes(hay); }) || null; }
function parseJson(text) { const clean = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(); try { return JSON.parse(clean); } catch {} const start = clean.indexOf("{"); const end = clean.lastIndexOf("}"); if (start >= 0 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch {} } return null; }
function validate(input) { if (!Number.isFinite(Number(input.latitude)) || !Number.isFinite(Number(input.longitude))) throw new Error("Localização inválida."); if (!["restaurant", "family"].includes(input.domain || "restaurant")) throw new Error("Domínio de decisão inválido."); }
function labelIntent(intent) { return ({ eat: "restaurants", coffee: "cafés", drink: "bars", dessert: "dessert places", surprise: "food and drink places" })[intent] || "restaurants"; }
function readGeminiError(data, status) { return `Gemini ${status}: ${data?.error?.message || "pedido recusado"}`; }
function normalizeText(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
function slug(v) { return normalizeText(v).replace(/ /g, "-").slice(0, 48); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function json(data, status, headers) { return new Response(JSON.stringify(data, null, 2), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } }); }
