/**
 * @fileoverview Batch queue for buffering writes to the database.
 * 
 * Instead of hitting SQLite on every /search request, this module buffers
 * search counts in memory. Every FLUSH_INTERVAL_MS, it writes the aggregated
 * counts to the database in a single transaction.
 * 
 * It also maintains a sliding window of recent searches to calculate trending topics.
 * 
 * @module store/batchQueue
 */

const queryStore = require('./queryStore');
const logger = require('../logger');

const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const TRENDING_WINDOW_SIZE = 10; // keep track of last 10 flush periods (50 seconds window)

// Buffer for the current flush interval
let currentBuffer = new Map();

// Ring buffer of historical search counts for trending analysis
// Array of Map<query, count>
const trendingHistory = [];

/**
 * Add a search query to the current batch.
 */
function recordSearch(query) {
  const currentCount = currentBuffer.get(query) || 0;
  currentBuffer.set(query, currentCount + 1);
}

/**
 * Flush current buffer to DB and cycle the trending history.
 */
function flush() {
  if (currentBuffer.size === 0) {
    // Just cycle empty history for trending
    pushTrendingHistory(new Map());
    return;
  }

  const batchToFlush = currentBuffer;
  currentBuffer = new Map(); // swap out buffer immediately

  pushTrendingHistory(batchToFlush);

  try {
    const startTime = Date.now();
    // Convert Map to array format expected by bulkUpsert
    const entries = Array.from(batchToFlush.entries()).map(([query, count]) => ({
      query,
      count
    }));
    
    // Start transaction
    queryStore.bulkUpsert(entries);
    const elapsed = Date.now() - startTime;
    logger.info(`[BATCH QUEUE] Flushed ${batchToFlush.size} unique queries to DB in ${elapsed}ms`);
  } catch (err) {
    logger.error(`[BATCH QUEUE] Failed to flush batch: ${err.message}`);
    // Optional: could push back to buffer on failure
  }
}

function pushTrendingHistory(batch) {
  trendingHistory.push(batch);
  if (trendingHistory.length > TRENDING_WINDOW_SIZE) {
    trendingHistory.shift();
  }
}

/**
 * Get top trending queries from the recent sliding window.
 */
function getTrending(limit = 10) {
  const aggregated = new Map();
  
  // Aggregate counts over the sliding window
  for (const batch of trendingHistory) {
    for (const [query, count] of batch.entries()) {
      aggregated.set(query, (aggregated.get(query) || 0) + count);
    }
  }

  // Also include the current un-flushed buffer for absolute real-time trends
  for (const [query, count] of currentBuffer.entries()) {
    aggregated.set(query, (aggregated.get(query) || 0) + count);
  }

  // Sort by count descending
  const sorted = Array.from(aggregated.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }));

  return sorted;
}

// Start the periodic flusher
setInterval(flush, FLUSH_INTERVAL_MS);

module.exports = {
  recordSearch,
  getTrending,
  flush // exported for testing/graceful shutdown
};
