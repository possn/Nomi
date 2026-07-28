
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
    coffee: "café specialty coffee",
    drink: "cocktail bar wine bar rooftop bar",
    dessert: "pastelaria sobremesas gelataria",
    surprise: "restaurante café bar"
  }[input.intent] || "restaurante";

  const cuisine = [];
  for (const p of input.preferences || []) {
    if (p === "Sushi") cuisine.push("sushi japonês");
    if (p === "Massa") cuisine.push("restaurante italiano massas");
    if (p === "Carne") cuisine.push("steakhouse fine dining grelhados");
    if (p === "Peixe") cuisine.push("restaurante peixe marisco seafood");
    if (p === "Vegetariano") cuisine.push("restaurante vegetariano");
    if (p === "Vegan") cuisine.push("restaurante vegan");
  }

  const moodTerms = [];
  if (input.mood === "Romântico") moodTerms.push("romântico elegante intimate date night fine dining");
  if (input.mood === "Família") moodTerms.push("familiar crianças");
  if (input.mood === "Trabalho") moodTerms.push("tranquilo negócios");
  if (input.mood === "Relaxado") moodTerms.push("calmo descontraído");
  if (input.mood === "Celebrar") moodTerms.push("celebração especial");
  if ((input.preferences || []).includes("Vista")) moodTerms.push("vista panorâmica rooftop waterfront ocean view river view");
  if ((input.preferences || []).includes("Esplanada")) moodTerms.push("esplanada outdoor seating");
  if ((input.preferences || []).includes("Silêncio")) moodTerms.push("silencioso tranquilo");

  const budgetTerm = Number(input.budget || 30) >= 70
    ? "premium fine dining"
    : Number(input.budget || 30) >= 40
      ? "qualidade elevada"
      : "bom preço";

  const core = [intent, cuisine.join(" "), moodTerms.join(" "), budgetTerm].filter(Boolean).join(" ").trim();
  const variants = [
    core,
    `${core} melhor avaliação`,
    `${core} recomendado para ocasião especial`,
    input.mood === "Romântico" ? `${intent} romantic restaurant with view` : "",
    (input.preferences || []).includes("Vista") ? `${intent} rooftop panoramic view` : ""
  ];

  return [...new Set(variants.map(q => q.trim()).filter(Boolean))].slice(0, 5);
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
  let points = 34;
  const rating = Number(place.rating || 0);
  const reviews = Number(place.userRatingCount || 0);
  const prefs = input.preferences || [];
  const text = [
    place.primaryType || "",
    place.primaryTypeDisplayName?.text || "",
    ...(place.types || [])
  ].join(" ").toLowerCase();

  if (rating) points += Math.max(-10, (rating - 3.8) * 22);
  if (reviews) points += Math.min(18, Math.log10(Math.max(1, reviews)) * 6);
  points += Math.max(-16, 14 - distanceKm * 0.9);

  if (input.mood === "Romântico") {
    if (place.reservable) points += 10;
    if (rating >= 4.5) points += 12;
    if (reviews >= 150) points += 8;
    if (/fine_dining|restaurant/.test(text)) points += 5;
  }

  if (prefs.includes("Vista")) {
    const viewSignal = /rooftop|view|waterfront|tourist_attraction|marina/.test(text);
    points += viewSignal ? 22 : -14;
  }
  if (prefs.includes("Esplanada")) points += place.outdoorSeating ? 14 : -6;
  if (prefs.includes("Vinho")) points += place.servesWine ? 10 : -2;
  if (prefs.includes("Crianças")) points += place.goodForChildren ? 12 : -3;
  if (prefs.includes("Acessível")) {
    points += place.accessibilityOptions?.wheelchairAccessibleEntrance ? 10 : -4;
  }

  if (prefs.includes("Sushi")) points += /sushi|japanese/.test(text) ? 26 : -20;
  if (prefs.includes("Massa")) points += /italian|pizza/.test(text) ? 22 : -16;
  if (prefs.includes("Carne")) points += /steak|barbecue|grill/.test(text) ? 22 : -14;
  if (prefs.includes("Peixe")) points += /seafood/.test(text) ? 22 : -14;
  if (prefs.includes("Vegan")) points += /vegan/.test(text) ? 24 : -18;
  if (prefs.includes("Vegetariano")) points += /vegetarian/.test(text) ? 22 : -14;

  points += budgetFit(place.priceLevel, Number(input.budget || 30));

  if (Number(input.budget || 30) >= 70 && place.priceLevel === "PRICE_LEVEL_INEXPENSIVE") {
    points -= 10;
  }

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
