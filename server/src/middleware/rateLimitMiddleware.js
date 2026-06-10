import rateLimit from 'express-rate-limit';

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX || 100);

/**
 * Límite para los endpoints que consumen APIs de pago de Google.
 * Configurable con RATE_LIMIT_WINDOW_MIN y RATE_LIMIT_MAX.
 */
export const apiRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones seguidas. Espera unos minutos y vuelve a intentarlo.' },
});
