import { computeRoutes } from '../services/routeService.js';

export async function calculateRoute(req, res) {
  const routes = await computeRoutes(req.body);
  res.json({ routes });
}
