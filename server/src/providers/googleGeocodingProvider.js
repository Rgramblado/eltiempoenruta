import { getGoogleKey } from '../config/index.js';

const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function geocodeWithGoogle(query, options = {}) {
  const key = getGoogleKey();
  const region = options.region || 'es';
  const language = options.language || 'es';
  const candidates = buildGeocodeQueries(query);

  for (const address of candidates) {
    const params = new URLSearchParams({
      address,
      region,
      language,
      components: 'country:ES',
      key,
    });

    const response = await fetch(`${GEOCODING_URL}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error_message || 'Google Geocoding no respondio correctamente.');
      error.statusCode = response.status;
      throw error;
    }

    if (data.status === 'OK' && data.results?.length) {
      return toGeocodedPlace(data.results[0], query, address);
    }

    if (data.status && !['ZERO_RESULTS'].includes(data.status)) {
      const error = new Error(toGoogleGeocodingError(data));
      error.statusCode = data.status === 'REQUEST_DENIED' ? 502 : 400;
      throw error;
    }
  }

  const error = new Error(`No encontre "${query}". Prueba con un lugar mas especifico.`);
  error.statusCode = 404;
  throw error;
}

function buildGeocodeQueries(query) {
  const clean = String(query).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  const queries = [clean];
  const lower = clean.toLowerCase();

  if (!/\bespana\b|\bespaña\b|\bspain\b/.test(lower)) {
    queries.push(`${clean}, Espana`);
  }

  if (!/\bandalucia\b|\bandalucía\b/.test(lower)) {
    queries.push(`${clean}, Andalucia, Espana`);
  }

  const parts = clean.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts.slice(-2).join(', ');
    queries.push(tail);
    queries.push(`${tail}, Espana`);
  }

  return [...new Set(queries)];
}

function toGeocodedPlace(result, originalQuery, resolvedQuery) {
  const location = result.geometry?.location;
  return {
    lat: location.lat,
    lng: location.lng,
    label: result.formatted_address || originalQuery,
    source: 'google_geocoding',
    originalQuery,
    resolvedQuery,
    placeId: result.place_id,
  };
}

function toGoogleGeocodingError(data) {
  if (data.status === 'REQUEST_DENIED') {
    return data.error_message || 'Google Geocoding no esta habilitado para la clave del servidor.';
  }
  if (data.status === 'OVER_QUERY_LIMIT') {
    return 'Google Geocoding ha superado el limite de cuota.';
  }
  return data.error_message || `Google Geocoding devolvio ${data.status}.`;
}
