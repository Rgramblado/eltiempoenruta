import { getGoogleKey } from '../config/index.js';

const FIELD_MASK = [
  'routes.distanceMeters',
  'routes.duration',
  'routes.staticDuration',
  'routes.polyline.encodedPolyline',
  'routes.legs.distanceMeters',
  'routes.legs.duration',
  'routes.legs.staticDuration',
  'routes.description',
  'routes.warnings',
  'routes.routeLabels',
].join(',');

export async function computeGoogleRoutes({ waypoints, routeModifiers = {}, computeAlternativeRoutes = true }) {
  const key = getGoogleKey();
  const [origin, ...rest] = waypoints;
  const destination = rest[rest.length - 1];
  const intermediates = rest.slice(0, -1).map(toWaypoint);

  const googleBody = {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    intermediates,
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: intermediates.length ? false : Boolean(computeAlternativeRoutes),
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    routeModifiers: {
      avoidTolls: Boolean(routeModifiers.avoidTolls),
      avoidHighways: Boolean(routeModifiers.avoidHighways),
      avoidFerries: Boolean(routeModifiers.avoidFerries),
    },
    languageCode: 'es-ES',
    units: 'METRIC',
  };

  const googleRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(googleBody),
  });

  const text = await googleRes.text();
  const data = text ? JSON.parse(text) : {};
  if (!googleRes.ok) {
    const error = new Error(data.error?.message || 'Google Routes no pudo calcular la ruta.');
    error.statusCode = googleRes.status;
    throw error;
  }

  return data.routes || [];
}

function toWaypoint(point) {
  return {
    location: {
      latLng: {
        latitude: Number(point.lat),
        longitude: Number(point.lng),
      },
    },
  };
}
