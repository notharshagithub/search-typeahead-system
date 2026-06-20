/**
 * @fileoverview Cache Client – thin abstraction over per-node cache storage.
 *
 * Each cache node in the system exposes a simple key-value interface. This
 * module wraps HTTP (or in-process) calls to a single node, providing
 * get / set / invalidate operations.
 *
 * Future implementation will:
 *   - Accept a node URL at construction time.
 *   - Use fetch() or a lightweight HTTP client to talk to cache-node services.
 *   - Support TTL-based expiration set by the caller.
 *
 * @module cache/cacheClient
 */

const logger = require('../logger');

/**
 * Retrieve cached suggestions for a prefix from a specific node.
 */
async function get(nodeUrl, prefix) {
  try {
    const res = await fetch(`http://${nodeUrl}/get/${encodeURIComponent(prefix)}`, {
      signal: AbortSignal.timeout(100) // 100ms timeout so we fallback to DB fast
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.hit ? data.value : null;
  } catch (err) {
    logger.error(`[cacheClient] GET failed on ${nodeUrl} for "${prefix}": ${err.message}`);
    return null;
  }
}

/**
 * Store suggestions in the cache node.
 */
async function set(nodeUrl, prefix, data, ttl = 60) {
  try {
    await fetch(`http://${nodeUrl}/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: prefix, value: data, ttl }),
      signal: AbortSignal.timeout(200) // Don't block forever
    });
  } catch (err) {
    logger.error(`[cacheClient] SET failed on ${nodeUrl} for "${prefix}": ${err.message}`);
  }
}

/**
 * Invalidate (delete) a cached entry.
 */
async function invalidate(nodeUrl, prefix) {
  try {
    await fetch(`http://${nodeUrl}/del/${encodeURIComponent(prefix)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(200)
    });
  } catch (err) {
    logger.error(`[cacheClient] INVALIDATE failed on ${nodeUrl} for "${prefix}": ${err.message}`);
  }
}

/**
 * Flush all cache nodes.
 */
async function flushAll(nodes) {
  const promises = nodes.map(async (nodeUrl) => {
    try {
      const res = await fetch(`http://${nodeUrl}/flush`, {
        method: 'POST',
        signal: AbortSignal.timeout(500)
      });
      return await res.json();
    } catch (err) {
      logger.error(`[cacheClient] FLUSH failed on ${nodeUrl}: ${err.message}`);
      return { success: false, error: err.message };
    }
  });
  return Promise.all(promises);
}

module.exports = { get, set, invalidate, flushAll };
