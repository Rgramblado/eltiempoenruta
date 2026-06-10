import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validateMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { expandUrl } from '../controllers/expandController.js';
import { calculateRoute } from '../controllers/routeController.js';
import { getWeather } from '../controllers/weatherController.js';
import { getDepartureOptions } from '../controllers/departureController.js';
import { weatherRequestSchema, routeRequestSchema, departureOptionsSchema, expandQuerySchema } from '../schemas/apiSchemas.js';

export const apiRouter = Router();

apiRouter.use(apiRateLimiter);

apiRouter.get('/expand', validate(expandQuerySchema, 'query'), asyncHandler(expandUrl));
apiRouter.post('/route', validate(routeRequestSchema), asyncHandler(calculateRoute));
apiRouter.post('/weather', validate(weatherRequestSchema), asyncHandler(getWeather));
apiRouter.post('/departure-options', validate(departureOptionsSchema), asyncHandler(getDepartureOptions));
