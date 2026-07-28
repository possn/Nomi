
const GOOGLE_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, cors);
    }

    if (!env.GOOGLE_PLACES_API_KEY) {
      return json({ error: "GOOGLE_PLACES_API_KEY não configurada." }, 500, cors);
    }

    try {
      const input = await request.json();
      validate(input);

      const queries = buildQueries(input);
      const batches = await Promise.all(
        queries.map((textQuery) => googleTextSearch(textQuery, input, env.GOOGLE_PLACES_API_KEY))
      );

      const unique = dedupe(batches.flat());
      const enriched = await Promise.all(
        unique.slice(0, 24).map((place) => enrichPlace(place, input, env.GOOGLE_PLACES_API_KEY))
      );

      const ranked = enriched
        .filter((p) => Number.isFinite(p.distanceKm))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 12);

      return json({
        provider: "Google Places",
        queryStrategy: queries,
        places: ranked
      }, 200, cors);
    } catch (error) {
      return json({ error: error?.message || "Erro interno." }, 500, cors);
    }
  }
};

function validate(input) {
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Localização inválida.");
  }
}

function buildQueries(input) {
  const intent = {
    eat: "restaurante",
    coffee: "café",
    drink: "bar cocktails wine bar",
    dessert: "pastelaria sobremesas gelataria",
    surprise: "restaurante café bar"
  }[input.intent] || "restaurante";

  const cuisine = [];
  for (const p of input.preferences || []) {
    if (p === "Sushi") cuisine.push("sushi japonês");
    if (p === "Massa") cuisine.push("italiano massas");
    if (p === "Carne") cuisine.push("steakhouse carne grelhada");
    if (p === "Peixe") cuisine.push("peixe marisco seafood");
    if (p === "Vegetariano") cuisine.push("vegetariano");
    if (p === "Vegan") cuisine.push("vegan");
  }

  const atmosphere = [];
  if (input.mood === "Romântico") atmosphere.push("romântico elegante intimate date night");
  if (input.mood === "Família") atmosphere.push("familiar crianças");
  if (input.mood === "Trabalho") atmosphere.push("tranquilo negócios");
  if (input.mood === "Relaxado") atmosphere.push("calmo descontraído");
  if (input.mood === "Celebrar") atmosphere.push("celebração especial");
  if ((input.preferences || []).includes("Vista")) atmosphere.push("com vista rooftop waterfront");
  if ((input.preferences || []).includes("Esplanada")) atmosphere.push("com esplanada");
  if ((input.preferences || []).includes("Silêncio")) atmosphere.push("silencioso tranquilo");

  const base = [intent, cuisine.join(" "), atmosphere.join(" ")].filter(Boolean).join(" ");
  const variants = [
    base,
    `${base} melhor avaliação`,
    `${base} recomendado`,
  ];

  return [...new Set(variants.map((q) => q.trim()).filter(Boolean))].slice(0, 3);
}

async function googleTextSearch(textQuery, input, apiKey) {
  const radius = Math.min(50000, Math.max(1500, Number(input.radiusMeters) || 5000));
  const body = {
    textQuery,
    languageCode: "pt-PT",
    regionCode: "PT",
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: {
          latitude: Number(input.latitude),
          longitude: Number(input.longitude)
        },
        radius
      }
    }
  };

  const response = await fetch(GOOGLE_TEXT_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.types",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.photos",
        "places.googleMapsUri",
        "places.websiteUri",
        "places.regularOpeningHours",
        "places.currentOpeningHours",
        "places.servesWine",
        "places.outdoorSeating",
        "places.goodForChildren",
        "places.reservable",
        "places.accessibilityOptions"
      ].join(",")
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Places ${response.status}: ${details.slice(0, 180)}`);
  }

  const data = await response.json();
  return data.places || [];
}

async function enrichPlace(place, input, apiKey) {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const distanceKm = haversine(
    Number(input.latitude), Number(input.longitude),
    Number(lat), Number(lng)
  );

  let photoUrl = "";
  const photoName = place.photos?.[0]?.name;
  if (photoName) {
    photoUrl = await resolvePhoto(photoName, apiKey);
  }

  const matchScore = score(place, input, distanceKm);

  return {
    id: place.id,
    name: place.displayName?.text || "Sem nome",
    cuisine: place.primaryTypeDisplayName?.text || title(place.primaryType || "restaurante"),
    address: place.formattedAddress || "",
    lat,
    lon: lng,
    distanceKm,
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || 0,
    priceLevel: place.priceLevel || null,
    imageUrl: photoUrl,
    actualPhoto: Boolean(photoUrl),
    website: place.websiteUri || "",
    googleUrl: place.googleMapsUri || "",
    openingHours: place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions || [],
    matchScore,
    matchDetails: scoreReasons(place, input)
  };
}

async function resolvePhoto(photoName, apiKey) {
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&maxHeightPx=900&skipHttpRedirect=true`;
    const response = await fetch(url, {
      headers: { "X-Goog-Api-Key": apiKey }
    });
    if (!response.ok) return "";
    const data = await response.json();
    return data.photoUri || "";
  } catch {
    return "";
  }
}

function score(place, input, distanceKm) {
  let points = 44;
  const rating = Number(place.rating || 0);
  const reviews = Number(place.userRatingCount || 0);

  points += Math.max(0, (rating - 3.5) * 15);
  points += Math.min(16, Math.log10(Math.max(1, reviews)) * 5);
  points += Math.max(-18, 16 - distanceKm * 1.35);

  const prefs = input.preferences || [];
  const types = (place.types || []).join(" ").toLowerCase();
  const label = `${place.primaryType || ""} ${place.primaryTypeDisplayName?.text || ""}`.toLowerCase();

  if (input.mood === "Romântico") {
    if (place.reservable) points += 7;
    if (rating >= 4.4) points += 7;
    if (reviews >= 100) points += 4;
  }
  if (input.mood === "Família" && place.goodForChildren) points += 12;
  if (prefs.includes("Esplanada") && place.outdoorSeating) points += 12;
  if (prefs.includes("Vinho") && place.servesWine) points += 9;
  if (prefs.includes("Acessível") && place.accessibilityOptions?.wheelchairAccessibleEntrance) points += 10;

  if (prefs.includes("Sushi") && /sushi|japanese/.test(types + label)) points += 22;
  if (prefs.includes("Massa") && /italian|pizza/.test(types + label)) points += 18;
  if (prefs.includes("Carne") && /steak|barbecue|grill/.test(types + label)) points += 18;
  if (prefs.includes("Peixe") && /seafood/.test(types + label)) points += 18;
  if (prefs.includes("Vegan") && /vegan/.test(types + label)) points += 20;
  if (prefs.includes("Vegetariano") && /vegetarian/.test(types + label)) points += 18;

  points += budgetFit(place.priceLevel, Number(input.budget || 30));
  return Math.max(1, Math.min(99, Math.round(points)));
}

function scoreReasons(place, input) {
  const reasons = [];
  if (place.rating >= 4.5) reasons.push("avaliação elevada");
  if (place.userRatingCount >= 250) reasons.push("muitas avaliações");
  if (input.mood === "Romântico" && place.reservable) reasons.push("aceita reservas");
  if ((input.preferences || []).includes("Esplanada") && place.outdoorSeating) reasons.push("esplanada");
  if ((input.preferences || []).includes("Vinho") && place.servesWine) reasons.push("serve vinho");
  if (place.priceLevel) reasons.push("preço compatível");
  return reasons.slice(0, 4);
}

function budgetFit(level, budget) {
  const estimate = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 15,
    PRICE_LEVEL_MODERATE: 30,
    PRICE_LEVEL_EXPENSIVE: 60,
    PRICE_LEVEL_VERY_EXPENSIVE: 100
  }[level];

  if (estimate === undefined) return 0;
  const difference = Math.abs(estimate - budget);
  return Math.max(-12, 12 - difference / 4);
}

function dedupe(places) {
  const seen = new Set();
  return places.filter((p) => {
    const key = p.id || `${p.displayName?.text}|${p.formattedAddress}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function title(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function json(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}
