import { geocodePlaces } from '../services/geocodingService.js';

export async function geocode(req, res) {
  const results = await geocodePlaces(req.body);
  res.json({ results });
}
