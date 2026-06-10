import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { apiRouter } from './apiRoutes.js';

export const router = Router();

router.use(healthRouter);
router.use('/api', apiRouter);
