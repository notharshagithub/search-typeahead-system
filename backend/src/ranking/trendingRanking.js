/**
 * @fileoverview Trending Ranking Strategy – promotes recently popular queries.
 *
 * Unlike basicRanking (pure count), this strategy will factor in recency so
 * that queries with a sudden spike in searches appear higher even if their
 * all-time count is lower.
 *
 * Future implementation will:
 *   - Compute a trending score: score = count * decay(age)
 *   - Use a configurable half-life (e.g. 6 hours) for the decay function.
 *   - Optionally blend with the base count for stability.
 *
 * @module ranking/trendingRanking
 */

const logger = require('../logger');

/**
 * Rank suggestion results by a trending score.
 *
 * Currently a no-op stub that returns results in their existing order.
 *
 * @param {Array<{ query: string, count: number }>} results - Unranked suggestion list.
 * @returns {Array<{ query: string, count: number }>} Results (unchanged for now).
 */
function rankByTrending(results) {
  logger.trending('rankByTrending — stub (returning results as-is)');
  return results;
}

module.exports = { rankByTrending };
