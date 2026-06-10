/**
 * Given array of sample points with ETA (ISO string), fetch weather + route analysis
 * Returns { weather: [...], rideScore, gear }
 */
export async function fetchWeatherForPoints(points, riderProfile = {}) {
  const res = await fetch('/api/weather', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points.map(p => ({ lat: p.lat, lng: p.lng, eta: p.eta, distanceFromStart: p.distanceFromStart })),
      riderProfile,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No pude consultar Google Weather.');
  return { weather: data.weather || [], rideScore: data.rideScore || null, gear: data.gear || [] };
}

/**
 * Compare alternative departure times for the already-sampled route.
 * Returns { recommendedOffsetMinutes, recommendation, options: [...] }
 */
export async function fetchDepartureOptions(points, riderProfile = {}) {
  const res = await fetch('/api/departure-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: points.map(p => ({ lat: p.lat, lng: p.lng, eta: p.eta, distanceFromStart: p.distanceFromStart })),
      riderProfile,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No pude comparar horas de salida.');
  return data;
}

/**
 * WMO Weather Codes → human-readable description + icon
 */
export function interpretWeatherCode(code) {
  if (typeof code === 'string') return interpretGoogleWeatherType(code);

  const codes = {
    0: { label: 'Despejado', icon: '☀️', severity: 0 },
    1: { label: 'Mayormente despejado', icon: '🌤️', severity: 0 },
    2: { label: 'Parcialmente nublado', icon: '⛅', severity: 0 },
    3: { label: 'Nublado', icon: '☁️', severity: 1 },
    45: { label: 'Niebla', icon: '🌫️', severity: 2 },
    48: { label: 'Niebla helada', icon: '🌫️', severity: 3 },
    51: { label: 'Llovizna ligera', icon: '🌦️', severity: 2 },
    53: { label: 'Llovizna moderada', icon: '🌦️', severity: 2 },
    55: { label: 'Llovizna intensa', icon: '🌧️', severity: 3 },
    61: { label: 'Lluvia ligera', icon: '🌧️', severity: 2 },
    63: { label: 'Lluvia moderada', icon: '🌧️', severity: 3 },
    65: { label: 'Lluvia intensa', icon: '🌧️', severity: 4 },
    71: { label: 'Nieve ligera', icon: '🌨️', severity: 3 },
    73: { label: 'Nieve moderada', icon: '❄️', severity: 4 },
    75: { label: 'Nieve intensa', icon: '❄️', severity: 5 },
    77: { label: 'Granizo', icon: '🌨️', severity: 4 },
    80: { label: 'Chubascos ligeros', icon: '🌦️', severity: 2 },
    81: { label: 'Chubascos moderados', icon: '🌧️', severity: 3 },
    82: { label: 'Chubascos fuertes', icon: '⛈️', severity: 4 },
    85: { label: 'Chubascos de nieve', icon: '🌨️', severity: 4 },
    86: { label: 'Chubascos de nieve fuertes', icon: '❄️', severity: 5 },
    95: { label: 'Tormenta', icon: '⛈️', severity: 5 },
    96: { label: 'Tormenta con granizo', icon: '⛈️', severity: 5 },
    99: { label: 'Tormenta con granizo fuerte', icon: '⛈️', severity: 5 },
  };
  return codes[code] || { label: `Código ${code}`, icon: '🌡️', severity: 1 };
}

function interpretGoogleWeatherType(type) {
  const normalized = String(type || '').toUpperCase();
  const map = {
    CLEAR: { label: 'Despejado', icon: 'Sol', severity: 0 },
    MOSTLY_CLEAR: { label: 'Mayormente despejado', icon: 'Sol', severity: 0 },
    PARTLY_CLOUDY: { label: 'Parcialmente nublado', icon: 'Nubes', severity: 0 },
    MOSTLY_CLOUDY: { label: 'Mayormente nublado', icon: 'Nubes', severity: 1 },
    CLOUDY: { label: 'Nublado', icon: 'Nubes', severity: 1 },
    FOG: { label: 'Niebla', icon: 'Niebla', severity: 2 },
    LIGHT_RAIN: { label: 'Lluvia ligera', icon: 'Lluvia', severity: 2 },
    RAIN: { label: 'Lluvia', icon: 'Lluvia', severity: 3 },
    HEAVY_RAIN: { label: 'Lluvia intensa', icon: 'Lluvia fuerte', severity: 4 },
    RAIN_SHOWERS: { label: 'Chubascos', icon: 'Chubascos', severity: 3 },
    DRIZZLE: { label: 'Llovizna', icon: 'Llovizna', severity: 2 },
    THUNDERSTORM: { label: 'Tormenta', icon: 'Tormenta', severity: 5 },
    SNOW: { label: 'Nieve', icon: 'Nieve', severity: 4 },
    LIGHT_SNOW: { label: 'Nieve ligera', icon: 'Nieve', severity: 3 },
    HEAVY_SNOW: { label: 'Nieve intensa', icon: 'Nieve fuerte', severity: 5 },
    FLURRIES: { label: 'Nevadas débiles', icon: 'Nieve', severity: 3 },
    HAIL: { label: 'Granizo', icon: 'Granizo', severity: 5 },
    SLEET: { label: 'Aguanieve', icon: 'Aguanieve', severity: 4 },
  };
  return map[normalized] || { label: normalized.replace(/_/g, ' ').toLowerCase() || 'Sin datos', icon: 'Meteo', severity: 1 };
}

/**
 * Color based on temperature (for motorist context, apparent temp matters)
 */
export function tempToColor(temp) {
  if (temp <= 0) return '#a8d4f5';   // freezing - light blue
  if (temp <= 5) return '#7bbde0';   // very cold
  if (temp <= 10) return '#6ab0d4';  // cold
  if (temp <= 15) return '#5bb5a0';  // cool
  if (temp <= 20) return '#6abf7a';  // comfortable
  if (temp <= 25) return '#f5c842';  // warm
  if (temp <= 30) return '#f5a623';  // hot
  if (temp <= 35) return '#e05c2a';  // very hot
  return '#c0392b';                  // extreme
}

/**
 * Map layers: each one colors the route by a different weather dimension.
 */
export const MAP_LAYERS = [
  { id: 'temp', label: 'Temperatura' },
  { id: 'rain', label: 'Lluvia' },
  { id: 'wind', label: 'Viento' },
  { id: 'risk', label: 'Riesgo' },
];

export function layerColorFor(layerId, sample, segmentRisk) {
  const weather = sample.weather;
  if (!weather) return '#888';
  switch (layerId) {
    case 'rain':
      return rainToColor(weather.precipProb ?? 0, weather.precip ?? 0);
    case 'wind':
      return windToColor(weather.windspeed ?? 0);
    case 'risk':
      if (segmentRisk) return riskScoreToColor(segmentRisk.score);
      return ['#4caf88', '#f5c842', '#f5843a', '#e03a3a'][sample.alertLevel ?? 0];
    case 'temp':
    default:
      return tempToColor(weather.apparentTemp ?? weather.temp);
  }
}

export function layerLegend(layerId) {
  switch (layerId) {
    case 'rain':
      return {
        title: 'Probabilidad de lluvia',
        stops: [['0%', '#4caf88'], ['20%', '#a5c95c'], ['40%', '#f5c842'], ['60%', '#f5843a'], ['80%', '#e03a3a']],
      };
    case 'wind':
      return {
        title: 'Viento (km/h)',
        stops: [['0', '#4caf88'], ['20', '#a5c95c'], ['30', '#f5c842'], ['45', '#f5843a'], ['65', '#e03a3a']],
      };
    case 'risk':
      return {
        title: 'Riesgo del tramo',
        stops: [['OK', '#4caf88'], ['Bien', '#8bc34a'], ['Ojo', '#f5c842'], ['Mal', '#f5843a'], ['Evitar', '#e03a3a']],
      };
    case 'temp':
    default:
      return {
        title: 'Temperatura aparente',
        stops: [['-10°', '#a8d4f5'], ['0°', '#7bbde0'], ['5°', '#6ab0d4'], ['10°', '#5bb5a0'], ['15°', '#6abf7a'], ['20°', '#f5c842'], ['25°', '#f5a623'], ['30°', '#e05c2a'], ['35°', '#c0392b']],
      };
  }
}

function rainToColor(prob, mm) {
  if (prob >= 80 || mm >= 3) return '#e03a3a';
  if (prob >= 60 || mm >= 1) return '#f5843a';
  if (prob >= 40 || mm >= 0.3) return '#f5c842';
  if (prob >= 20) return '#a5c95c';
  return '#4caf88';
}

function windToColor(kmh) {
  if (kmh >= 65) return '#e03a3a';
  if (kmh >= 45) return '#f5843a';
  if (kmh >= 30) return '#f5c842';
  if (kmh >= 20) return '#a5c95c';
  return '#4caf88';
}

function riskScoreToColor(score) {
  if (score >= 90) return '#4caf88';
  if (score >= 75) return '#8bc34a';
  if (score >= 55) return '#f5c842';
  if (score >= 35) return '#f5843a';
  return '#e03a3a';
}

/**
 * Overall segment alert level (0=ok, 1=caution, 2=warning, 3=danger)
 */
export function getAlertLevel(weather) {
  const severity = interpretWeatherCode(weather.weatherCode).severity;
  if (severity >= 4 || weather.apparentTemp <= 2 || weather.windspeed > 80) return 3;
  if (severity >= 3 || weather.apparentTemp <= 5 || weather.precipProb > 70 || weather.windspeed > 60) return 2;
  if (severity >= 2 || weather.apparentTemp <= 10 || weather.precipProb > 40 || weather.windspeed > 40) return 1;
  return 0;
}
