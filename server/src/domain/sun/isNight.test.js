import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNightAt, solarElevationDegrees } from './isNight.js';

const MADRID = { lat: 40.4168, lng: -3.7038 };

test('mediodía de junio en Madrid es de día', () => {
  // 12:00 UTC ≈ 14:00 local en verano
  const noon = new Date('2026-06-21T12:00:00Z');
  assert.equal(isNightAt(MADRID.lat, MADRID.lng, noon), false);
  assert.ok(solarElevationDegrees(MADRID.lat, MADRID.lng, noon) > 50);
});

test('medianoche en Madrid es de noche', () => {
  const midnight = new Date('2026-06-21T00:00:00Z');
  assert.equal(isNightAt(MADRID.lat, MADRID.lng, midnight), true);
  assert.ok(solarElevationDegrees(MADRID.lat, MADRID.lng, midnight) < -10);
});

test('madrugada de invierno es de noche', () => {
  const winterEarly = new Date('2026-12-21T06:00:00Z');
  assert.equal(isNightAt(MADRID.lat, MADRID.lng, winterEarly), true);
});

test('media tarde de invierno es de día', () => {
  const winterAfternoon = new Date('2026-12-21T13:00:00Z');
  assert.equal(isNightAt(MADRID.lat, MADRID.lng, winterAfternoon), false);
});

test('hemisferio sur invertido: mediodía UTC en Buenos Aires es de día', () => {
  // 15:00 UTC = 12:00 local en Buenos Aires
  const baNoon = new Date('2026-12-21T15:00:00Z');
  assert.equal(isNightAt(-34.6, -58.4, baNoon), false);
});
