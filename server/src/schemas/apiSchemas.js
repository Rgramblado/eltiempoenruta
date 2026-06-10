import { z } from 'zod';

const latLng = {
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
};

const weatherPoint = z.object({
  ...latLng,
  eta: z.string().refine(value => Number.isFinite(new Date(value).getTime()), 'ETA debe ser una fecha válida.'),
  distanceFromStart: z.coerce.number().min(0).optional(),
});

const riderProfile = z.object({
  rainTolerance: z.enum(['low', 'medium', 'high']).optional(),
  coldTolerance: z.enum(['low', 'medium', 'high']).optional(),
  experience: z.string().max(40).optional(),
  bikeType: z.string().max(40).optional(),
  ridesWithPassenger: z.boolean().optional(),
}).optional();

export const weatherRequestSchema = z.object({
  points: z.array(weatherPoint).min(1, 'Se necesita al menos un punto.').max(120, 'Demasiados puntos: reduce el muestreo.'),
  riderProfile,
});

export const routeRequestSchema = z.object({
  waypoints: z.array(z.object({
    ...latLng,
    label: z.string().max(300).optional(),
  })).min(2, 'Se necesitan al menos origen y destino.').max(27, 'Google Routes admite 25 paradas intermedias como máximo.'),
  routeModifiers: z.object({
    avoidHighways: z.boolean().optional(),
    avoidTolls: z.boolean().optional(),
    avoidFerries: z.boolean().optional(),
  }).optional(),
  computeAlternativeRoutes: z.boolean().optional(),
});

export const departureOptionsSchema = z.object({
  points: z.array(weatherPoint).min(2, 'Se necesitan al menos dos puntos muestreados.').max(120, 'Demasiados puntos: reduce el muestreo.'),
  offsetsMinutes: z.array(z.coerce.number()).max(16).optional(),
  riderProfile,
});

export const expandQuerySchema = z.object({
  url: z.string().url('La URL no es válida.').max(2048)
    .refine(value => /^https:\/\/(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+)\//.test(value),
      'Solo se admiten enlaces de Google Maps.'),
});
