import { computeDepartureOptions } from '../services/departureOptimizerService.js';

export async function getDepartureOptions(req, res) {
  const { points, offsetsMinutes, riderProfile } = req.body || {};
  const result = await computeDepartureOptions({ points, offsetsMinutes, riderProfile });
  res.json(result);
}
