/**
 * @fileoverview Suggest route – returns autocomplete suggestions for a prefix.
 *
 * Phase 3: Basic suggestion API with direct DB queries (no cache).
 * Phase 6 will add the cache layer in front.
 *
 * GET /suggest?q=<prefix>
 *
 * API contract:
 *   {
 *     "prefix": "iph",
 *     "suggestions": [
 *       { "query": "iphone", "count": 100000 },
 *       { "query": "iphone 15", "count": 85000 }
 *     ],
 *     "source": "db"
 *   }
 *
 * Edge cases handled:
 *   - Empty or missing q → empty suggestions array
 *   - Very short prefixes (1 char) → allowed, SQLite handles it
 *   - Mixed case → SQLite LIKE is case-insensitive by default for ASCII
 *   - No matches → empty array, not an error
 *
 * @module routes/suggest
 */

const express = require('express');
const queryStore = require('../store/queryStore');
const logger = require('../logger');
const { defaultRing } = require('../cache/hashRing');
const cacheClient = require('../cache/cacheClient');
const metricsStore = require('../store/metricsStore');

const router = express.Router();

/**
 * GET /suggest?q=<prefix>
 * Returns top 10 suggestions matching the given prefix.
 * Checks distributed cache first, falls back to SQLite.
 */
router.get('/', async (req, res) => {
  const prefix = (req.query.q || '').trim().toLowerCase();

  // Handle empty/missing prefix
  if (!prefix) {
    return res.json({ prefix: '', suggestions: [], source: 'db' });
  }

  try {
    const startTime = Date.now();

    // 1. Determine which cache node is responsible for this prefix
    const targetNode = defaultRing.getNodeForKey(prefix);
    let suggestions = null;
    let source = 'db';

    // 2. Try to fetch from the cache node
    if (targetNode) {
      suggestions = await cacheClient.get(targetNode, prefix);
      if (suggestions) {
        source = 'cache';
        logger.cacheHit(targetNode, prefix);
        metricsStore.recordCacheHit();
      } else {
        logger.cacheMiss(targetNode, prefix);
        metricsStore.recordCacheMiss();
      }
    }

    // 3. Cache miss: fetch from DB
    if (!suggestions) {
      suggestions = queryStore.getByPrefix(prefix, 10);
      
      // 4. Populate the cache asynchronously
      if (targetNode && suggestions.length > 0) {
        // Fire and forget cache population
        cacheClient.set(targetNode, prefix, suggestions, 60).catch(err => {
          logger.error(`Failed to populate cache on ${targetNode}: ${err.message}`);
        });
      }
    }

    const elapsed = Date.now() - startTime;
    metricsStore.recordLatency(elapsed);
    logger.info(`[SUGGEST] prefix="${prefix}" results=${suggestions.length} source=${source} latency=${elapsed}ms`);

    return res.json({
      prefix,
      suggestions,
      source
    });
  } catch (err) {
    logger.error(`[SUGGEST] Error for prefix="${prefix}": ${err.message}`);
    return res.status(500).json({
      prefix,
      suggestions: [],
      source: 'db',
      error: 'Internal server error'
    });
  }
});

module.exports = router;
