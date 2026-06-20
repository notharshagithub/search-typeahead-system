/**
 * @fileoverview Search route – records a completed search query.
 *
 * Phase 5: POST /search accepts a query, responds immediately with
 * { "message": "Searched" }, and increments the query count.
 *
 * Currently performs a direct DB write (synchronous increment).
 * Phase 8 will replace this with batch buffering via the BatchQueue.
 *
 * API contract:
 *   Request:  { "query": "iphone 15 pro" }
 *   Response: { "message": "Searched" }
 *
 * @module routes/search
 */

const express = require('express');
const batchQueue = require('../store/batchQueue');
const metricsStore = require('../store/metricsStore');
const logger = require('../logger');

const router = express.Router();

/**
 * POST /search
 * Records that a user searched for the given query.
 * Responds immediately with a confirmation message.
 */
router.post('/', (req, res) => {
  const query = (req.body.query || '').trim().toLowerCase();

  // Respond immediately regardless of write outcome
  res.json({ message: 'Searched' });

  // Don't process empty queries
  if (!query) {
    logger.warn('[SEARCH] Empty query received, skipping write');
    return;
  }

  // Record asynchronously in the in-memory batch queue
  batchQueue.recordSearch(query);
  metricsStore.recordSearch();
  logger.info(`[SEARCH] Queued for batching: "${query}"`);
});

module.exports = router;
