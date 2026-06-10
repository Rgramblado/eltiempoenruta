/**
 * Recomendaciones de equipación a partir de la previsión de toda la ruta.
 * Entrada: lista de condiciones por punto muestreado (formato del weather provider)
 * y flags de noche por segmento. Salida: lista ordenada por prioridad.
 */
export function recommendGear(input = {}) {
  const conditions = (input.conditions || []).filter(Boolean);
  if (!conditions.length) return [];

  const apparentTemps = conditions
    .map(c => firstNumber(c.apparentTemp, c.apparentTemperatureC, c.temp))
    .filter(isFiniteNumber);
  const minApparent = apparentTemps.length ? Math.min(...apparentTemps) : null;
  const maxApparent = apparentTemps.length ? Math.max(...apparentTemps) : null;
  const maxPrecipProb = Math.max(0, ...conditions.map(c => numberOr(c.precipProb ?? c.precipitationProbability, 0)));
  const maxPrecipMm = Math.max(0, ...conditions.map(c => numberOr(c.precip ?? c.precipitationMm, 0)));
  const maxWind = Math.max(0, ...conditions.map(c => numberOr(c.windspeed ?? c.windKmh, 0)));
  const maxGust = Math.max(0, ...conditions.map(c => numberOr(c.windGust ?? c.windGustKmh, 0)));
  const conditionText = conditions.map(c => String(c.weatherCode || c.condition || '').toLowerCase()).join(' ');
  const hasNight = Boolean(input.hasNightSegment);

  const items = [];

  if (isFiniteNumber(minApparent)) {
    if (minApparent <= 4) {
      items.push(gear('cold-extreme', 'Equipación de invierno completa', `Sensación mínima de ${Math.round(minApparent)}°C: térmica, guantes de invierno y braga de cuello.`, 1));
    } else if (minApparent <= 8) {
      items.push(gear('cold-high', 'Guantes de invierno y capa térmica', `Sensación mínima de ${Math.round(minApparent)}°C en algún tramo.`, 1));
    } else if (minApparent <= 13) {
      items.push(gear('cold-mild', 'Forro interior y guantes de entretiempo', `Sensación mínima de ${Math.round(minApparent)}°C: fresco en marcha.`, 2));
    }
  }

  if (isFiniteNumber(maxApparent) && maxApparent >= 30) {
    items.push(gear('heat', 'Equipación ventilada e hidratación', `Sensación máxima de ${Math.round(maxApparent)}°C: chaqueta perforada y agua a mano.`, 1));
  }

  if (maxPrecipProb >= 60 || maxPrecipMm >= 1) {
    items.push(gear('rain-high', 'Traje de agua puesto o muy a mano', `Lluvia probable (${Math.round(maxPrecipProb)}%${maxPrecipMm >= 1 ? `, hasta ${formatMm(maxPrecipMm)} mm/h` : ''}).`, 1));
  } else if (maxPrecipProb >= 35 || maxPrecipMm >= 0.3) {
    items.push(gear('rain-maybe', 'Impermeable en la maleta', `Posible lluvia (${Math.round(maxPrecipProb)}%): mejor llevarlo accesible.`, 2));
  }

  if (maxWind >= 45 || maxGust >= 60) {
    items.push(gear('wind', 'Ropa ceñida y atención al viento', `Viento de hasta ${Math.round(Math.max(maxWind, maxGust))} km/h: evita prendas sueltas y bolsas altas.`, 1));
  }

  if (conditionText.includes('fog') || conditionText.includes('niebla')) {
    items.push(gear('fog', 'Alta visibilidad', 'Niebla en ruta: chaleco reflectante y pantalla limpia y antivaho.', 1));
  }

  if (conditionText.includes('snow') || conditionText.includes('hail') || conditionText.includes('sleet') || conditionText.includes('nieve') || conditionText.includes('granizo')) {
    items.push(gear('winter-road', 'Plantéate no salir', 'Hay nieve o granizo previstos en ruta: condiciones críticas en moto.', 0));
  }

  if (hasNight) {
    items.push(gear('night', 'Pantalla clara y elementos reflectantes', 'Parte de la ruta es de noche: evita pantalla ahumada.', 2));
  }

  if (isFiniteNumber(minApparent) && isFiniteNumber(maxApparent) && maxApparent - minApparent >= 10) {
    items.push(gear('layers', 'Vístete por capas', `Variación de ${Math.round(maxApparent - minApparent)}°C entre tramos: capas fáciles de quitar.`, 2));
  }

  if (!items.length) {
    items.push(gear('default', 'Equipación habitual', 'Condiciones suaves en toda la ruta. Equipación de siempre y a disfrutar.', 3));
  }

  return items.sort((a, b) => a.priority - b.priority);
}

function gear(id, label, reason, priority) {
  return { id, label, reason, priority };
}

function firstNumber(...values) {
  for (const value of values) {
    if (isFiniteNumber(value)) return Number(value);
  }
  return null;
}

function numberOr(value, fallback) {
  return isFiniteNumber(value) ? Number(value) : fallback;
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function formatMm(value) {
  return Number(value).toFixed(1).replace(/\.0$/, '');
}
