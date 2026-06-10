/**
 * Elevación solar aproximada (grados) para una coordenada e instante dados.
 * Aproximación con declinación solar y ángulo horario: error < ~2°, suficiente
 * para distinguir día/noche sin depender de la zona horaria del servidor.
 */
export function solarElevationDegrees(lat, lng, date) {
  const dayOfYear = getDayOfYear(date);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const solarTime = utcHours + lng / 15;
  const hourAngle = (solarTime - 12) * 15;

  const latRad = toRadians(lat);
  const declRad = toRadians(declination);
  const hourRad = toRadians(hourAngle);

  const sinElevation = Math.sin(latRad) * Math.sin(declRad)
    + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourRad);

  return Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180 / Math.PI;
}

/**
 * Noche = sol por debajo del crepúsculo civil (-6°): oscuridad real para conducir.
 */
export function isNightAt(lat, lng, date) {
  return solarElevationDegrees(lat, lng, date) < -6;
}

function getDayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}
