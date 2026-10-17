import { geocodeWithGoogle } from '../providers/googleGeocodingProvider.js';

export async function geocodePlaces(input) {
  const { places, region = 'es', language = 'es' } = input || {};
  if (!Array.isArray(places) || !places.length) {
    const error = new Error('Se necesita al menos un lugar.');
    error.statusCode = 400;
    throw error;
  }

  const results = [];
  for (const place of places) {
    results.push(await geocodeWithGoogle(place, { region, language }));
  }

  return results;
}
