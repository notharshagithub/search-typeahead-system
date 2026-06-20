/**
 * @fileoverview Batch Queue – buffers incoming search queries for deferred writes.
 *
 * Instead of writing every single search event to SQLite immediately, the
 * queue collects them in memory and flushes in bulk at a configurable
 * interval. This dramatically reduces write contention and disk I/O.
 *
 * Future implementation will:
 *   - Use a Map<string, number> to aggregate counts per query in the buffer.
 *   - Support a configurable max-size that triggers an early flush.
 *   - Emit an event on flush so downstream consumers can react.
 *
 * @module batch/queue
 */

const logger = require('../logger');

/**
 * @class BatchQueue
 * In-memory buffer for batching search-count updates.
 */
class BatchQueue {
  constructor() {
    /** @type {string[]} */
    this._buffer = [];

    logger.batch('BatchQueue created — stub');
  }

  /**
   * Add a query to the buffer.
   *
   * @param {string} query - The search query to enqueue.
   */
  enqueue(query) {
    logger.batch(`enqueue — stub  query="${query}"`);
    this._buffer.push(query);
  }

  /**
   * Flush the buffer, returning all queued queries and clearing internal state.
   *
   * @returns {string[]} The queries that were in the buffer.
   */
  flush() {
    logger.batch(`flush — stub  size=${this._buffer.length}`);
    const items = [...this._buffer];
    this._buffer = [];
    return items;
  }

  /**
   * Return the current number of buffered queries.
   *
   * @returns {number}
   */
  getSize() {
    return this._buffer.length;
  }
}

module.exports = BatchQueue;
