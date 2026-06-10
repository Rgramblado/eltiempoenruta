import { analyzeWeatherForPoints } from '../services/weatherService.js';

export async function getWeather(req, res) {
  const { points, riderProfile } = req.body || {};
  const { weather, rideScore, gear } = await analyzeWeatherForPoints(points, riderProfile);
  res.json({ weather, rideScore, gear });
}
