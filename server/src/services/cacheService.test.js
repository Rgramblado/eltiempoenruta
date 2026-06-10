import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache } from './cacheService.js';

test('get devuelve undefined para clave inexistente', () => {
  const cache = new MemoryCache();
  assert.equal(cache.get('nope'), undefined);
});

test('set y get básicos', () => {
  const cache = new MemoryCache();
  cache.set('a', { x: 1 });
  assert.deepEqual(cache.get('a'), { x: 1 });
});

test('respeta TTL', async () => {
  const cache = new MemoryCache({ ttlMs: 10 });
  cache.set('a', 'valor');
  assert.equal(cache.get('a'), 'valor');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(cache.get('a'), undefined);
});

test('delete elimina la entrada', () => {
  const cache = new MemoryCache();
  cache.set('a', 1);
  assert.equal(cache.delete('a'), true);
  assert.equal(cache.get('a'), undefined);
});

test('wrap solo ejecuta la factory en miss', async () => {
  const cache = new MemoryCache();
  let calls = 0;
  const factory = async () => {
    calls += 1;
    return 'resultado';
  };
  assert.equal(await cache.wrap('k', factory), 'resultado');
  assert.equal(await cache.wrap('k', factory), 'resultado');
  assert.equal(calls, 1);
});

test('wrap no cachea null', async () => {
  const cache = new MemoryCache();
  let calls = 0;
  const factory = async () => {
    calls += 1;
    return null;
  };
  await cache.wrap('k', factory);
  await cache.wrap('k', factory);
  assert.equal(calls, 2);
});

test('expulsa la entrada más antigua al superar maxEntries', () => {
  const cache = new MemoryCache({ maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});
