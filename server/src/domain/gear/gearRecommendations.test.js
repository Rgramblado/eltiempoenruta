import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendGear } from './gearRecommendations.js';

function point(overrides = {}) {
  return {
    apparentTemp: 20,
    temp: 21,
    precipProb: 5,
    precip: 0,
    windspeed: 10,
    windGust: 15,
    weatherCode: 'CLEAR',
    ...overrides,
  };
}

test('ruta suave devuelve equipación habitual', () => {
  const items = recommendGear({ conditions: [point(), point(), point()] });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 'default');
});

test('frío extremo recomienda invierno completo', () => {
  const items = recommendGear({ conditions: [point({ apparentTemp: 2 }), point()] });
  assert.ok(items.some(item => item.id === 'cold-extreme'));
});

test('lluvia probable recomienda traje de agua', () => {
  const items = recommendGear({ conditions: [point({ precipProb: 75, precip: 1.4 })] });
  assert.ok(items.some(item => item.id === 'rain-high'));
});

test('lluvia posible recomienda impermeable a mano', () => {
  const items = recommendGear({ conditions: [point({ precipProb: 40 })] });
  assert.ok(items.some(item => item.id === 'rain-maybe'));
  assert.ok(!items.some(item => item.id === 'rain-high'));
});

test('viento fuerte avisa de ropa ceñida', () => {
  const items = recommendGear({ conditions: [point({ windGust: 70 })] });
  assert.ok(items.some(item => item.id === 'wind'));
});

test('nieve genera aviso crítico con máxima prioridad', () => {
  const items = recommendGear({ conditions: [point({ weatherCode: 'SNOW' })] });
  assert.equal(items[0].id, 'winter-road');
});

test('tramo nocturno recomienda pantalla clara', () => {
  const items = recommendGear({ conditions: [point()], hasNightSegment: true });
  assert.ok(items.some(item => item.id === 'night'));
});

test('gran variación térmica recomienda capas', () => {
  const items = recommendGear({ conditions: [point({ apparentTemp: 9 }), point({ apparentTemp: 24 })] });
  assert.ok(items.some(item => item.id === 'layers'));
});

test('sin condiciones devuelve lista vacía', () => {
  assert.deepEqual(recommendGear({ conditions: [] }), []);
});
