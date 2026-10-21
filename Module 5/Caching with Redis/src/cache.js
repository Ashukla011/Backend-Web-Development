'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Implement three Redis helper functions using ioredis.
//
// cacheGet(key)
//   - redis.get(key) → string | null
//   - If string: JSON.parse and return the object
//   - If null: return null (cache miss)
//   - Wrap in try/catch: on error, log and return null (graceful degradation)
//
// cacheSet(key, data, ttlSeconds)
//   - redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
//   - Wrap in try/catch: on error, log (don't fail the request)
//
// cacheDel(key)
//   - redis.del(key)
//   - Wrap in try/catch: on error, log
//
// Redis connection:
//   host: process.env.REDIS_HOST || 'localhost'
//   port: parseInt(process.env.REDIS_PORT || '6379')
//   lazyConnect: true

'use strict';

const Redis = require('ioredis');

// Create Redis instance with lazy connection and environment configurations
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  lazyConnect: true,
});

async function cacheGet(key) {
  try {
    const data = await redis.get(key);
    if (data !== null) {
      return JSON.parse(data);
    }
    return null;
  } catch (err) {
    console.error('[cacheGet] error:', err);
    return null; // Graceful degradation on error
  }
}

async function cacheSet(key, data, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    console.error('[cacheSet] error:', err);
  }
}

async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('[cacheDel] error:', err);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };