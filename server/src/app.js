import express from 'express';
import cors from 'cors';
import { router } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
