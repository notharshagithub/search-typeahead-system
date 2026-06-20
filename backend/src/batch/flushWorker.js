/**
 * @fileoverview Flush Worker – periodically drains the BatchQueue into the QueryStore.
 *
 * Runs on a fixed interval (default 5 s). Each tick:
 *   1. Calls queue.flush() to retrieve buffered queries.
 *   2. Aggregates duplicate queries into a count map.
 *   3. Calls store.incrementCount(query, count) for each entry.
 *
 * Future implementation will:
 *   - Make the interval configurable via FLUSH_INTERVAL_MS env var.
 *   - Add error handling and retry logic for failed writes.
 *   - Optionally invalidate affected cache prefixes after a flush.
 *
 * @module batch/flushWorker
 */

const logger = require('../logger');

/** Default flush interval in milliseconds. */
const DEFAULT_INTERVAL_MS = 5000;

/**
 * Start the periodic flush worker.
 *
 * @param {import('./queue')} queue - The BatchQueue instance to drain.
 * @param {import('../store/queryStore')} store - The QueryStore used for persistence.
 * @param {number} [intervalMs=5000] - Flush interval in milliseconds.
 * @returns {NodeJS.Timeout} The interval handle (can be cleared to stop the worker).
 */
function startFlushWorker(queue, store, intervalMs = DEFAULT_INTERVAL_MS) {
  logger.batch(`Flush worker started — stub  interval=${intervalMs}ms`);

  const handle = setInterval(() => {
    const size = queue.getSize();
    if (size === 0) return;

    logger.batch(`Flushing ${size} buffered queries — stub`);
    // TODO: queue.flush() → aggregate → store.incrementCount()
  }, intervalMs);

  return handle;
}

module.exports = { startFlushWorker };
