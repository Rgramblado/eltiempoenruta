import { computeGoogleRoutes } from '../providers/googleRoutesProvider.js';

export async function computeRoutes(input) {
  const { waypoints } = input || {};
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    const error = new Error('Se necesitan al menos origen y destino.');
    error.statusCode = 400;
    throw error;
  }

  return computeGoogleRoutes(input);
}
