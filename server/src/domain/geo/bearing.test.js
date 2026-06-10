import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearingDegrees } from './bearing.js';

test('hacia el norte es ~0°', () => {
  const bearing = bearingDegrees({ lat: 40, lng: -3 }, { lat: 41, lng: -3 });
  assert.ok(Math.abs(bearing) < 1 || Math.abs(bearing - 360) < 1);
});

test('hacia el este es ~90°', () => {
  const bearing = bearingDegrees({ lat: 40, lng: -3 }, { lat: 40, lng: -2 });
  assert.ok(Math.abs(bearing - 90) < 1);
});

test('hacia el sur es ~180°', () => {
  const bearing = bearingDegrees({ lat: 41, lng: -3 }, { lat: 40, lng: -3 });
  assert.ok(Math.abs(bearing - 180) < 1);
});

test('hacia el oeste es ~270°', () => {
  const bearing = bearingDegrees({ lat: 40, lng: -2 }, { lat: 40, lng: -3 });
  assert.ok(Math.abs(bearing - 270) < 1);
});
