import { expandMapsUrl } from '../services/expandService.js';

export async function expandUrl(req, res) {
  const url = await expandMapsUrl((req.validatedQuery || req.query).url);
  res.json({ url });
}
