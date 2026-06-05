/**
 * Fetches weather forecasts from Open-Meteo (free, no API key required)
 * For each sample point, queries the forecast at the estimated arrival time
 */

/**
 * Given array of sample points with ETA (ISO string), fetch weather for each
 * Batches by proximity to reduce API calls (Open-Meteo allows single point per call)
 */
export async function fetchWeatherForPoints(points) {
  // Fetch all points in parallel (Open-Meteo is free and rate-limit friendly)
  const results = await Promise.all(
    points.map(p => fetchWeatherForPoint(p.lat, p.lng, p.eta))
  );
  return results;
}

async function fetchWeatherForPoint(lat, lng, etaISO) {
  const date = etaISO.split('T')[0]; // YYYY-MM-DD
  
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: 'temperature_2m,precipitation_probability,precipitation,weathercode,windspeed_10m,apparent_temperature',
    timezone: 'auto',
    start_date: date,
    end_date: date,
    wind_speed_unit: 'kmh',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const data = await res.json();

  if (data.error) throw new Error(`Open-Meteo error: ${data.reason}`);

  // Find the closest hour to ETA
  const etaHour = new Date(etaISO).getUTCHours();
  // Open-Meteo returns times in local timezone
  const times = data.hourly.time; // array of "YYYY-MM-DDTHH:00"
  
  let closestIdx = 0;
  let minDiff = Infinity;
  times.forEach((t, i) => {
    const h = parseInt(t.split('T')[1].split(':')[0]);
    const diff = Math.abs(h - new Date(etaISO).getHours());
    if (diff < minDiff) { minDiff = diff; closestIdx = i; }
  });

  return {
    lat, lng,
    temp: data.hourly.temperature_2m[closestIdx],
    apparentTemp: data.hourly.apparent_temperature[closestIdx],
    precipProb: data.hourly.precipitation_probability[closestIdx],
    precip: data.hourly.precipitation[closestIdx],
    weatherCode: data.hourly.weathercode[closestIdx],
    windspeed: data.hourly.windspeed_10m[closestIdx],
    time: times[closestIdx],
  };
}

/**
 * WMO Weather Codes → human-readable description + icon
 */
export function interpretWeatherCode(code) {
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
 * Overall segment alert level (0=ok, 1=caution, 2=warning, 3=danger)
 */
export function getAlertLevel(weather) {
  const severity = interpretWeatherCode(weather.weatherCode).severity;
  if (severity >= 4 || weather.apparentTemp <= 2 || weather.windspeed > 80) return 3;
  if (severity >= 3 || weather.apparentTemp <= 5 || weather.precipProb > 70 || weather.windspeed > 60) return 2;
  if (severity >= 2 || weather.apparentTemp <= 10 || weather.precipProb > 40 || weather.windspeed > 40) return 1;
  return 0;
}
