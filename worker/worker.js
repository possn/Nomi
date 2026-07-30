const DEFAULT_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const VERSION = "3.1.9";

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
      return json({
        ok: true,
        service: "OneArete Decision Engine",
        product: "Nomi",
        version: VERSION,
        defaultModel: env.GEMINI_MODEL || DEFAULT_MODEL,
        geminiConfigured: Boolean(env.GEMINI_API_KEY)
      }, 200, cors);
    }
    if (request.method === "GET" && url.pathname === "/version") {
      return json({ version: VERSION, defaultModel: env.GEMINI_MODEL || DEFAULT_MODEL }, 200, cors);
    }
    if (request.method !== "POST" || url.pathname !== "/decision") {
      return json({ error: "Usa POST /decision para pedir uma decisão." }, 405, cors);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY não configurada no Worker." }, 500, cors);
    }

    try {
      const input = await request.json();
      validate(input);
      return json(await decide(input, env), 200, cors);
    } catch (error) {
      console.error("ODE decision error", {
        message: error?.message || String(error),
        status: error?.status || 500,
        details: error?.details || null
      });
      return json({
        error: error?.message || "Erro interno do OneArete Decision Engine.",
        code: error?.code || "ODE_ERROR"
      }, error?.status || 500, cors);
    }
  }
};

async function decide(input, env) {
  const configuredModel = env.GEMINI_MODEL || DEFAULT_MODEL;
  const models = [...new Set([configuredModel, ...FALLBACK_MODELS].filter(Boolean))];
  const body = {
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    tools: [{ googleMaps: {} }],
    toolConfig: {
      retrievalConfig: {
        latLng: {
          latitude: Number(input.latitude),
          longitude: Number(input.longitude)
        }
      }
    },
    generationConfig: {
      maxOutputTokens: 8192
    }
  };

  let raw = {};
  let chosenModel = "";
  const attempts = [];

  for (const model of models) {
    const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify(body)
    });

    raw = await response.json().catch(() => ({}));
    const message = raw?.error?.message || "pedido recusado";
    attempts.push({ model, status: response.status, message });

    console.log("Gemini attempt", {
      model,
      status: response.status,
      statusText: response.statusText,
      errorStatus: raw?.error?.status || null,
      message
    });

    if (response.ok) {
      chosenModel = model;
      break;
    }

    const retryable = response.status === 404 || response.status === 429 || response.status >= 500;
    if (!retryable) {
      throw odeError(`Gemini ${response.status}: ${message}`, response.status, "GEMINI_REQUEST_FAILED", attempts);
    }
  }

  if (!chosenModel) {
    const last = attempts.at(-1) || {};
    const allQuota = attempts.length > 0 && attempts.every(a => a.status === 429);
    throw odeError(
      allQuota
        ? "A quota Gemini está temporariamente indisponível para os modelos atuais. Tenta novamente mais tarde ou ativa faturação no projeto Google AI Studio."
        : `Não foi possível contactar um modelo Gemini disponível. Último erro: ${last.message || "desconhecido"}`,
      allQuota ? 429 : (last.status || 503),
      allQuota ? "GEMINI_QUOTA_EXHAUSTED" : "NO_GEMINI_MODEL_AVAILABLE",
      attempts
    );
  }

  const candidate = raw.candidates?.[0];
  const text = (candidate?.content?.parts || []).map(part => part.text || "").join("\n").trim();
  const sources = (candidate?.groundingMetadata?.groundingChunks || [])
    .filter(chunk => chunk.maps)
    .map(chunk => ({
      title: chunk.maps.title || "Google Maps",
      uri: chunk.maps.uri || "",
      placeId: chunk.maps.placeId || ""
    }));

  const parsed = parseJson(text);
  if (!parsed) {
    throw odeError(
      "A resposta fundamentada da Gemini não veio num formato utilizável. Tenta novamente.",
      502,
      "GEMINI_RESPONSE_PARSE_FAILED",
      { model: chosenModel, preview: text.slice(0, 500) }
    );
  }
  const recommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  const requestedMaxResults = clamp(Number(input.maxResults || 30), 10, 40);
  const maxRadiusKm = Math.max(1.5, Number(input.radiusMeters || 6000) / 1000);
  let places = recommendations
    .slice(0, requestedMaxResults)
    .map((item, index) => normalize(item, sources, input, index))
    .filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lon))
    .map(place => ({
      ...place,
      distanceKm: round1(haversineKm(Number(input.latitude), Number(input.longitude), place.lat, place.lon))
    }))
    .filter(place => place.distanceKm <= maxRadiusKm * 1.08);

  places = places
    .map(place => ({ ...place, decisionScore: calculateDecisionScore(place, input, maxRadiusKm) }))
    .filter(place => passesHardConstraints(place, input));

  places.sort((a, b) => b.decisionScore - a.decisionScore || a.distanceKm - b.distanceKm);
  places = places.map(place => ({ ...place, matchScore: Math.round(place.decisionScore) }));

  // Enrich results with public images from official websites where available.
  places = await enrichPlaceImages(places);

  if (!places.length) {
    throw odeError(
      "Não encontrei opções com evidência suficiente para esta ocasião. Aumenta a distância ou o orçamento.",
      422,
      "INSUFFICIENT_EVIDENCE"
    );
  }

  return {
    provider: "Gemini + Google Maps",
    engine: "OneArete Decision Engine",
    version: VERSION,
    model: chosenModel,
    domain: input.domain || "restaurant",
    confidence: clamp(Number(parsed.confidence || 0.82), 0.3, 0.99),
    uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty.filter(Boolean).slice(0, 4) : [],
    places,
    sources
  };
}

function buildPrompt(input) {
  const family = input.domain === "family";
  const radiusKm = Math.max(1.5, Number(input.radiusMeters || 6000) / 1000);
  const travelMinutes = Math.max(5, Number(input.travelTimeMinutes || Math.round(radiusKm / 0.6)));
  const preferences = Array.isArray(input.preferences) ? input.preferences.filter(Boolean) : [];
  const prefs = preferences.join(", ") || "nenhuma";
  const occasion = input.mood || (family ? "idades não indicadas" : "casual");
  const task = family
    ? `Encontra atividades reais para crianças/grupo com esta composição etária: ${occasion}.`
    : `Encontra ${labelIntent(input.intent)} reais para a ocasião: ${occasion}.`;

  const characteristicRules = preferences.map(pref => `- ${pref}: ${preferenceDefinition(pref, family)}`).join("\n");
  const occasionRule = family
    ? `A composição etária "${occasion}" é uma restrição obrigatória. Rejeita atividades inadequadas, inseguras ou sem interesse claro para essas idades.`
    : `A ocasião "${occasion}" é uma restrição obrigatória. ${occasionDefinition(occasion)}`;

  return `You are the OneArete Decision Engine powering Nomi. Use Google Maps grounding. ${task}
Respond in Portuguese from Portugal.
The user's current coordinates are latitude ${Number(input.latitude).toFixed(6)}, longitude ${Number(input.longitude).toFixed(6)}.

CORE DECISION PRINCIPLE:
Every user-selected characteristic is a HARD CONSTRAINT. Never treat a selected characteristic as a decorative keyword, minor bonus or optional preference. A candidate that fails even one selected characteristic must be excluded, regardless of fame, rating, review count or proximity.

SEARCH METHOD — FOLLOW IN THIS ORDER:
1. Translate the occasion, intent, budget, maximum travel time and EVERY selected characteristic into explicit acceptance tests.
2. Build a broad local candidate pool across the entire permitted area. Include nearby villages, coast, countryside, hotels, cultural venues, parks and lesser-known local options where relevant. Do not focus only on city centres or highly reviewed places.
3. Compare at least 30 plausible candidates internally (or every plausible candidate found inside the permitted area when fewer exist). Use several search formulations/synonyms for every selected characteristic and search the whole radius, including villages and coastal/countryside areas.
4. For each candidate, verify every acceptance test with grounded evidence. Mark each test pass/fail/unknown.
5. Reject all candidates with any fail or unknown mandatory test.
6. Rank survivors by total intent/occasion fit, strength of evidence for all characteristics, quality, real distance and budget fit. Popularity is only a weak tie-breaker.
7. Return EVERY candidate that truly satisfies all constraints, up to ${clamp(Number(input.maxResults || 30), 10, 40)} results. Do not stop after the first few and never add filler. The user wants a broad list, while the best option must remain first.

MANDATORY OCCASION / GROUP RULE:
${occasionRule}

MANDATORY SELECTED CHARACTERISTICS:
${characteristicRules || "- No additional selected characteristics."}

GENERAL INTERPRETATION RULES:
- A place being near something does not prove it offers that experience. Example: near the sea does not prove a sea view; near a car park does not prove practical parking; serving one vegetarian side dish does not prove a meaningful vegetarian option.
- Require concrete, place-specific evidence. If evidence cannot be verified, reject the candidate.
- Use synonyms and context, but never lower the standard just to fill the list.
- For "Aberto agora" or "Evento hoje", verify against the user's current local date/time; do not rely on generic weekly descriptions.
- For dietary, accessibility, children, dogs, payment, parking and opening status, current operational evidence is required.
- For cuisine/product characteristics such as Sushi, Massa, Carne, Peixe or Vinho, the characteristic must be a meaningful part of the offering, not a token item.

GEOGRAPHIC CONSTRAINT:
Every place must be within approximately ${travelMinutes} minutes by car and never farther than ${radiusKm.toFixed(1)} km straight-line from the supplied coordinates. Verify actual coordinates and full address using Google Maps grounding. Never substitute a famous option in another city for a genuinely local candidate.
Maximum straight-line radius: ${radiusKm.toFixed(1)} km.

BUDGET CONSTRAINT:
Budget is ${Number(input.budget || 30)} EUR ${family ? "for the group" : "per person"}. Treat this as a real constraint. Prefer verified price/menu evidence. Reject candidates clearly above budget; if exact price cannot be verified, state uncertainty and do not award a high score.

INTENT CONSTRAINT:
The requested intent is ${labelIntent(input.intent)}. The result must actually match that intent, not merely be a nearby venue.

EVIDENCE AND SCORING STANDARD:
- Every factual claim must be grounded.
- Return an explicit evidence record for the occasion/group rule and for EACH selected characteristic.
- mandatoryChecks must contain one entry for the occasion/group and one entry for every selected characteristic, all with passed=true.
- If any mandatory check is false or uncertain, omit the candidate.
- Never invent coordinates, ratings, review counts, prices, views, facilities, menus, opening hours, policies or links.
- Scores above 90 require exceptional fit across ALL constraints with strong evidence. Scores above 80 require strong evidence for every constraint. Popularity alone never justifies a high score.

Return ONLY valid JSON:
{
  "confidence": 0.0,
  "uncertainty": [""],
  "recommendations": [
    {
      "name": "",
      "category": "",
      "address": "",
      "latitude": 0,
      "longitude": 0,
      "rating": null,
      "reviewCount": 0,
      "estimatedPrice": "",
      "score": 0,
      "why": ["", "", ""],
      "bestFor": "",
      "occasionEvidence": "",
      "characteristicEvidence": { "Selected characteristic": "specific grounded evidence" },
      "mandatoryChecks": [
        { "characteristic": "occasion/group or selected characteristic", "passed": true, "evidence": "" }
      ],
      "evidenceStrength": "strong|moderate|weak",
      "mapsTitle": "",
      "website": "",
      "reservationUrl": "",
      "ticketUrl": "",
      "imageUrl": ""
    }
  ]
}
Latitude and longitude are mandatory actual coordinates. Do not estimate distance; the engine calculates it. Return recommendations ordered best first.`;
}

function preferenceDefinition(pref, family) {
  const definitions = {
    "Vista": "must have verified views visible from the dining/activity area (sea, ocean, river, valley, mountain, city, panoramic landscape or landmark). Nearby scenery alone is insufficient.",
    "Estacionamento": "must have verified practical parking on-site or clearly identified very nearby parking; vague street-parking assumptions are insufficient.",
    "Vinho": "must offer a meaningful wine experience, wine list, pairing or recognised wine focus; merely serving wine is insufficient.",
    "Esplanada": "must have a verified usable terrace, rooftop or outdoor seating/activity area.",
    "Vegetariano": "must have several meaningful vegetarian choices or a clearly vegetarian-focused menu, not just side dishes.",
    "Vegan": "must have verified substantive vegan options or a vegan menu.",
    "Crianças": "must be demonstrably suitable for children through menu, facilities, space, atmosphere or repeated family evidence.",
    "Cães": "must have a verified dog-friendly policy in the relevant area.",
    "Sushi": "sushi must be a core, well-evidenced part of the menu and venue identity.",
    "Massa": "pasta must be a meaningful and well-evidenced part of the menu, not a single incidental dish.",
    "Carne": "must have a strong, verified meat offering appropriate to the request.",
    "Peixe": "must have a strong, verified fish/seafood offering appropriate to the request.",
    "Silêncio": "must have evidence of a calm, quiet or low-noise atmosphere; reject lively/noisy venues.",
    "Acessível": "must have verified relevant accessibility (step-free/wheelchair access and suitable facilities where applicable).",
    "Aberto agora": "must be verified open at the user's current local date and time.",
    "Cartão": "must have verified card/contactless payment acceptance.",
    "Indoor": "must provide a verified indoor experience suitable for the age group.",
    "Outdoor": "must provide a verified outdoor experience suitable for the age group.",
    "Natureza": "nature must be central to the experience, not merely nearby.",
    "Ciência": "science, discovery or hands-on learning must be central to the experience.",
    "Animais": "meaningful animal interaction/observation must be central and currently available.",
    "Criativo": "must involve meaningful creative participation such as art, making, music or crafts.",
    "Ativo": "must involve substantial physical activity appropriate for the age group.",
    "Água": "water must be central to the activity and currently accessible/safe.",
    "Dia de chuva": "must remain genuinely enjoyable and operational in rainy weather, normally indoors or weather-protected.",
    "Bom tempo": "must specifically benefit from and be suitable for good weather.",
    "Com refeição": "must include food/meal access on-site or as an integrated part of the experience.",
    "Evento hoje": "must be a verified event occurring today, with current time/date and availability evidence.",
    "Gratuito": "must be verified free for the relevant group; conditional or partial free access must be stated.",
    "Meio dia": "must realistically fit within approximately half a day including travel and normal participation time."
  };
  return definitions[pref] || `must be specifically and concretely verified as part of the ${family ? "activity" : "venue"} experience.`;
}

function occasionDefinition(occasion) {
  const rules = {
    "Romântico": "Require at least two distinct grounded romantic signals, including atmosphere/setting. Reject generic, noisy or purely practical venues.",
    "Amigos": "Require a sociable setting suitable for conversation and shared enjoyment; reject places mismatched to groups.",
    "Família": "Require a genuinely family-suitable atmosphere/menu/facilities, not merely permission for children.",
    "Trabalho": "Require a setting suitable for a professional meal or conversation, with appropriate noise, service and seating.",
    "Relaxado": "Require a genuinely informal, comfortable and low-pressure experience.",
    "Celebrar": "Require a special-occasion-worthy setting/service and practical suitability for celebration or booking."
  };
  return rules[occasion] || "Require concrete evidence that the venue fits the stated occasion.";
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
    lat: Number(item.latitude),
    lon: Number(item.longitude),
    distanceKm: Math.max(0, Number(item.distanceKm || 0)),
    rating: item.rating == null ? null : Number(item.rating),
    userRatingCount: Math.max(0, Number(item.reviewCount || 0)),
    priceLevel: item.estimatedPrice || null,
    imageUrl: safeUrl(item.imageUrl),
    website: safeUrl(item.website),
    reservationUrl: safeUrl(item.reservationUrl),
    ticketUrl: safeUrl(item.ticketUrl),
    googleUrl: source?.uri || `https://www.google.com/maps/search/?api=1&query=${query}`,
    openingHours: [],
    matchScore: Math.round(clamp(Number(item.score || 78), 1, 99)),
    matchDetails: why.length ? why : [item.bestFor || "adequado ao contexto pedido"],
    bestFor: item.bestFor || "",
    occasionEvidence: String(item.occasionEvidence || "").trim(),
    characteristicEvidence: normalizeEvidenceMap(item.characteristicEvidence),
    mandatoryChecks: normalizeMandatoryChecks(item.mandatoryChecks),
    romanticSignals: Array.isArray(item.romanticSignals) ? item.romanticSignals.filter(Boolean).slice(0, 5) : [],
    viewEvidence: String(item.viewEvidence || item?.characteristicEvidence?.Vista || "").trim(),
    preferenceEvidence: evidenceMapValues(item.characteristicEvidence),
    evidenceStrength: String(item.evidenceStrength || "").toLowerCase()
  };
}


async function enrichPlaceImages(places) {
  const enriched = await Promise.all(places.map(async (place, index) => {
    if (place.imageUrl || !place.website || index >= 24) return place;
    const imageUrl = await fetchOpenGraphImage(place.website);
    return imageUrl ? { ...place, imageUrl } : place;
  }));
  return enriched;
}

async function fetchOpenGraphImage(website) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(website, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Nomi/3.1 (+https://onearete.com)" }
    });
    clearTimeout(timer);
    if (!response.ok) return "";
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return "";
    const html = (await response.text()).slice(0, 350000);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match?.[1]) continue;
      try {
        const absolute = new URL(match[1].replace(/&amp;/g, "&"), response.url).toString();
        return safeUrl(absolute);
      } catch {}
    }
  } catch {}
  return "";
}

function passesHardConstraints(place, input) {
  const preferences = Array.isArray(input.preferences) ? input.preferences.filter(Boolean) : [];
  const text = evidenceText(place);
  const excluded = ["snack bar", "cervejaria", "fast food", "take away", "food court", "sports bar"];
  if (input.domain !== "family" && excluded.some(term => text.includes(term)) && input.mood === "Romântico") return false;

  // The model must explicitly pass the occasion/group plus every selected characteristic.
  const checks = new Map((place.mandatoryChecks || []).map(check => [normalizeText(check.characteristic), check]));
  const required = [input.domain === "family" ? String(input.mood || "grupo etario") : String(input.mood || "ocasiao"), ...preferences];
  for (const characteristic of required) {
    const key = normalizeText(characteristic);
    const check = findCheck(checks, key);
    if (!check || check.passed !== true || !hasSubstantiveEvidence(check.evidence)) return false;
  }

  if (!hasSubstantiveEvidence(place.occasionEvidence)) return false;
  for (const pref of preferences) {
    const evidence = getCharacteristicEvidence(place, pref);
    if (!hasSubstantiveEvidence(evidence)) return false;
    if (!evidenceMatchesCharacteristic(pref, evidence, text)) return false;
  }

  // Extra deterministic occasion tests prevent generic high-scoring candidates.
  if (input.domain !== "family" && !occasionEvidenceMatches(input.mood, place)) return false;
  if (input.domain === "family" && !familyAgeEvidenceMatches(input.mood, place)) return false;

  return place.evidenceStrength !== "weak";
}

function calculateDecisionScore(place, input, maxRadiusKm) {
  const preferences = Array.isArray(input.preferences) ? input.preferences.filter(Boolean) : [];
  let score = 0;

  // Occasion/group fit: 28 points.
  score += hasSubstantiveEvidence(place.occasionEvidence) ? 24 : 0;
  if (input.domain !== "family" && input.mood === "Romântico") score += Math.min(4, countRomanticSignals(place));

  // Every selected characteristic has equal mandatory weight: total 36 points.
  if (preferences.length) {
    const perPreference = 36 / preferences.length;
    for (const pref of preferences) {
      const evidence = getCharacteristicEvidence(place, pref);
      if (hasSubstantiveEvidence(evidence) && evidenceMatchesCharacteristic(pref, evidence, evidenceText(place))) score += perPreference;
    }
  } else {
    score += 24;
  }

  // Evidence strength: 12 points.
  score += place.evidenceStrength === "strong" ? 12 : place.evidenceStrength === "moderate" ? 6 : 0;

  // Quality: 10 points; popularity is deliberately capped.
  if (Number.isFinite(Number(place.rating))) score += Math.max(0, Math.min(7, (Number(place.rating) - 3.5) * 5.5));
  score += Math.min(3, Math.log10(Math.max(1, Number(place.userRatingCount || 0))));

  // Distance: 10 points.
  const distanceRatio = Math.min(1, Number(place.distanceKm || maxRadiusKm) / maxRadiusKm);
  score += 10 * (1 - distanceRatio);

  // Budget evidence/fit: 4 points. Do not reward unknown prices heavily.
  if (hasSubstantiveEvidence(place.priceLevel)) score += 4;

  return clamp(score, 1, 99);
}

function findCheck(checks, requiredKey) {
  if (checks.has(requiredKey)) return checks.get(requiredKey);
  for (const [key, value] of checks.entries()) {
    if (key.includes(requiredKey) || requiredKey.includes(key)) return value;
  }
  return null;
}

function normalizeMandatoryChecks(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => ({
    characteristic: String(item?.characteristic || "").trim(),
    passed: item?.passed === true,
    evidence: String(item?.evidence || "").trim()
  })).filter(item => item.characteristic);
}

function normalizeEvidenceMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([key, evidence]) => [String(key).trim(), String(evidence || "").trim()])
    .filter(([key, evidence]) => key && evidence));
}

function evidenceMapValues(value) {
  return Object.values(normalizeEvidenceMap(value)).filter(Boolean).slice(0, 16);
}

function getCharacteristicEvidence(place, characteristic) {
  const target = normalizeText(characteristic);
  for (const [key, evidence] of Object.entries(place.characteristicEvidence || {})) {
    const normalizedKey = normalizeText(key);
    if (normalizedKey === target || normalizedKey.includes(target) || target.includes(normalizedKey)) return evidence;
  }
  return "";
}

function hasSubstantiveEvidence(value) {
  const text = normalizeText(value);
  return text.length >= 12 && !/(unknown|desconhecid|nao confirmado|sem evidencia|not verified|uncertain)/.test(text);
}

function evidenceMatchesCharacteristic(pref, evidence, allText) {
  const text = normalizeText(`${evidence} ${allText}`);
  const patterns = {
    "Vista": /(vista|panoram|mar|oceano|rio|vale|serra|montanha|cidade|rooftop|sunset|por do sol|falésia)/,
    "Estacionamento": /(estacionamento|parking|parque|garage|garagem)/,
    "Vinho": /(vinho|wine|garrafeira|sommelier|pairing|harmonizacao)/,
    "Esplanada": /(esplanada|terraco|rooftop|outdoor|ao ar livre)/,
    "Vegetariano": /(vegetarian|vegetariano|vegetais|plant based)/,
    "Vegan": /(vegan|vegano|100 plant based)/,
    "Crianças": /(crianca|familia|menu infantil|cadeira de bebe|kids|playground)/,
    "Cães": /(cao|caes|dog friendly|pet friendly|animais permitidos)/,
    "Sushi": /(sushi|sashimi|nigiri|maki|japones)/,
    "Massa": /(massa|pasta|spaghetti|tagliatelle|ravioli|italiano)/,
    "Carne": /(carne|steak|bife|grelhad|churrasco|meat)/,
    "Peixe": /(peixe|marisco|seafood|fish)/,
    "Silêncio": /(silencio|silencioso|calmo|tranquilo|quiet|low noise)/,
    "Acessível": /(acessivel|cadeira de rodas|wheelchair|step free|sem degraus|rampa)/,
    "Aberto agora": /(aberto agora|open now|aberto neste momento|fecha as|horario confirmado)/,
    "Cartão": /(cartao|visa|mastercard|multibanco|contactless|pagamento eletronico)/,
    "Indoor": /(indoor|interior|coberto|dentro)/,
    "Outdoor": /(outdoor|exterior|ao ar livre|parque|trilho)/,
    "Natureza": /(natureza|floresta|parque natural|campo|trilho|paisagem natural)/,
    "Ciência": /(ciencia|cientifico|museu de ciencia|experiencia|laboratorio|planetario)/,
    "Animais": /(animais|zoo|quinta|aquario|aves|cavalos)/,
    "Criativo": /(criativo|arte|pintura|ceramica|oficina|craft|musica)/,
    "Ativo": /(ativo|atividade fisica|trepar|correr|desporto|aventura|trampolim)/,
    "Água": /(agua|piscina|praia|rio|aquatico|barco|canoa)/,
    "Dia de chuva": /(chuva|indoor|coberto|interior|weather proof)/,
    "Bom tempo": /(bom tempo|outdoor|exterior|sol|ao ar livre)/,
    "Com refeição": /(refeicao|restaurante|cafe|almoco|jantar|comida incluida)/,
    "Evento hoje": /(hoje|today|evento|sessao|espetaculo|programacao)/,
    "Gratuito": /(gratuito|gratis|free|entrada livre|sem custo)/,
    "Meio dia": /(meio dia|half day|2 horas|3 horas|4 horas|duracao)/
  };
  const pattern = patterns[pref];
  return pattern ? pattern.test(text) : hasSubstantiveEvidence(evidence);
}

function occasionEvidenceMatches(occasion, place) {
  const text = evidenceText(place);
  const patterns = {
    "Romântico": /(romant|intim|elegant|refinad|tranquil|candle|date night|anivers|ocasiao especial)/,
    "Amigos": /(amigos|grupo|partilhar|social|conversa|animado)/,
    "Família": /(familia|crianca|menu infantil|family friendly|cadeira de bebe)/,
    "Trabalho": /(trabalho|negocio|business|reuniao|profissional|calmo)/,
    "Relaxado": /(relax|informal|descontraid|confortavel|calmo)/,
    "Celebrar": /(celebr|anivers|ocasiao especial|grupo|reserva|festa)/
  };
  return patterns[occasion] ? patterns[occasion].test(text) : hasSubstantiveEvidence(place.occasionEvidence);
}

function familyAgeEvidenceMatches(ageGroup, place) {
  const text = evidenceText(place);
  if (!hasSubstantiveEvidence(place.occasionEvidence)) return false;
  const patterns = {
    "0–3 anos": /(0 3|bebe|bebes|toddler|primeira infancia|pequeninos)/,
    "4–7 anos": /(4 7|pre escolar|criancas pequenas|early years)/,
    "8–12 anos": /(8 12|idade escolar|school age|criancas)/,
    "13+ anos": /(13|adolescente|teen|jovens)/,
    "Idades diferentes": /(idades diferentes|todas as idades|familia|multi age)/,
    "Surpreende-nos": /(familia|crianca|jovens|todas as idades)/
  };
  return patterns[ageGroup] ? patterns[ageGroup].test(text) : true;
}

function countRomanticSignals(place) {
  const signals = new Set();
  const text = evidenceText(place);
  const groups = [
    ["atmosphere", /(romant|intim|elegant|refinad|tranquil|calm|candle|acolhedor)/],
    ["view", /(vista|panoram|mar|oceano|rio|vale|serra|cidade|sunset|por do sol)/],
    ["occasion", /(date night|anivers|casal|ocasiao especial|special occasion)/],
    ["dinner", /(vinho|wine|jantar|degustacao|fine dining|gastronomic)/],
    ["setting", /(terraco|rooftop|arquitetura|hotel|falésia|cliff|praia)/]
  ];
  for (const [name, pattern] of groups) if (pattern.test(text)) signals.add(name);
  return signals.size;
}

function evidenceText(place) {
  return normalizeText([
    place.name,
    place.cuisine,
    place.bestFor,
    place.occasionEvidence,
    place.viewEvidence,
    ...(place.matchDetails || []),
    ...(place.romanticSignals || []),
    ...(place.preferenceEvidence || []),
    ...Object.values(place.characteristicEvidence || {}),
    ...(place.mandatoryChecks || []).flatMap(check => [check.characteristic, check.evidence])
  ].join(" "));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = value => value * Math.PI / 180;
  const earthKm = 6371.0088;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function odeError(message, status = 500, code = "ODE_ERROR", details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}
function findSource(title, sources) {
  const needle = normalizeText(title);
  if (!needle) return null;
  return sources.find(source => {
    const haystack = normalizeText(source.title);
    return haystack.includes(needle) || needle.includes(haystack);
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
  if (!Number.isFinite(Number(input.latitude)) || !Number.isFinite(Number(input.longitude))) {
    throw odeError("Localização inválida.", 400, "INVALID_LOCATION");
  }
  if (!["restaurant", "family"].includes(input.domain || "restaurant")) {
    throw odeError("Domínio de decisão inválido.", 400, "INVALID_DOMAIN");
  }
}
function labelIntent(intent) {
  return ({ eat: "restaurants", coffee: "cafés", drink: "bars", dessert: "dessert places", surprise: "food and drink places" })[intent] || "restaurants";
}
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function slug(value) { return normalizeText(value).replace(/ /g, "-").slice(0, 48); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function json(data, status, headers) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
