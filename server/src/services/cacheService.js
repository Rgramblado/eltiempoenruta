const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

export class MemoryCache {
  constructor({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      this.entries.delete(oldest);
    }
    return value;
  }

  delete(key) {
    return this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }

  async wrap(key, factory, ttlMs = this.ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    if (value !== undefined && value !== null) this.set(key, value, ttlMs);
    return value;
  }
}

export const weatherCache = new MemoryCache({
  ttlMs: Number(process.env.WEATHER_CACHE_TTL_MIN || 30) * 60 * 1000,
});
