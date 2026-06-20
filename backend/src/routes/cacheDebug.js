/**
 * @fileoverview Cache debug route – introspection endpoint for the distributed cache.
 *
 * Provides a way to inspect which cache node owns a given prefix and whether
 * the entry is currently cached. Useful during development and for the
 * frontend's "Cache Inspector" panel.
 *
 * Future implementation will:
 *   1. Use the HashRing to resolve the owning cache node.
 *   2. Query that node to check for a hit/miss.
 *   3. Return the cached data if present.
 *
 * @module routes/cacheDebug
 */

const express = require('express');
const { defaultRing } = require('../cache/hashRing');
const cacheClient = require('../cache/cacheClient');
const logger = require('../logger');

const router = express.Router();

/**
 * GET /cache/debug?prefix=<prefix>
 * Returns cache status for a given prefix.
 */
router.get('/debug', async (req, res) => {
  const prefix = (req.query.prefix || '').trim().toLowerCase();
  
  if (!prefix) {
    return res.json({ prefix: '', node: null, hit: false, value: null });
  }

  const targetNode = defaultRing.getNodeForKey(prefix);
  if (!targetNode) {
    return res.json({ prefix, node: null, hit: false, error: 'No cache nodes available' });
  }

  const value = await cacheClient.get(targetNode, prefix);
  res.json({
    prefix,
    node: targetNode,
    hit: value !== null,
    value
  });
});

/**
 * DELETE /cache/invalidate?prefix=<prefix>
 * Invalidates a specific cache key.
 */
router.delete('/invalidate', async (req, res) => {
  const prefix = (req.query.prefix || '').trim().toLowerCase();
  
  if (!prefix) {
    return res.status(400).json({ error: 'Missing prefix parameter' });
  }

  const targetNode = defaultRing.getNodeForKey(prefix);
  if (targetNode) {
    await cacheClient.invalidate(targetNode, prefix);
    logger.info(`[CACHE] Invalidated prefix="${prefix}" on node="${targetNode}"`);
    res.json({ success: true, prefix, node: targetNode });
  } else {
    res.status(500).json({ error: 'No cache nodes available' });
  }
});

/**
 * POST /cache/flush
 * Flushes all data across all cache nodes.
 */
router.post('/flush', async (req, res) => {
  const nodes = Array.from(defaultRing.nodes);
  
  if (nodes.length === 0) {
    return res.status(500).json({ error: 'No cache nodes available' });
  }

  const results = await cacheClient.flushAll(nodes);
  logger.info(`[CACHE] Global flush executed across ${nodes.length} nodes`);
  
  res.json({
    success: true,
    nodes: nodes.length,
    details: results
  });
});

module.exports = router;
