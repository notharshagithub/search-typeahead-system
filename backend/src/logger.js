/**
 * @fileoverview Structured logging utility for the Typeahead Backend.
 *
 * Provides domain-specific log helpers so every subsystem emits messages
 * in a consistent, grep-friendly format:
 *
 *   [LEVEL] YYYY-MM-DDTHH:mm:ss.sssZ  <message>
 *
 * Future improvements:
 *   - Pluggable transports (file, external log aggregator)
 *   - Log-level filtering via LOG_LEVEL env var
 *   - Structured JSON output for production
 *
 * @module logger
 */

/**
 * Return the current ISO-8601 timestamp.
 * @returns {string}
 */
function ts() {
  return new Date().toISOString();
}

/**
 * Log an informational message.
 * @param {string} message
 * @param {...any} args
 */
function info(message, ...args) {
  console.log(`[INFO] ${ts()}  ${message}`, ...args);
}

/**
 * Log a warning.
 * @param {string} message
 * @param {...any} args
 */
function warn(message, ...args) {
  console.warn(`[WARN] ${ts()}  ${message}`, ...args);
}

/**
 * Log an error.
 * @param {string} message
 * @param {...any} args
 */
function error(message, ...args) {
  console.error(`[ERROR] ${ts()}  ${message}`, ...args);
}

/**
 * Log a cache hit event.
 * @param {string} node  - Cache node that served the response.
 * @param {string} prefix - The prefix that was looked up.
 */
function cacheHit(node, prefix) {
  console.log(`[CACHE HIT] ${ts()}  node=${node} prefix="${prefix}"`);
}

/**
 * Log a cache miss event.
 * @param {string} node  - Cache node that was queried.
 * @param {string} prefix - The prefix that was looked up.
 */
function cacheMiss(node, prefix) {
  console.log(`[CACHE MISS] ${ts()}  node=${node} prefix="${prefix}"`);
}

/**
 * Log a batch-processing message.
 * @param {string} message
 * @param {...any} args
 */
function batch(message, ...args) {
  console.log(`[BATCH] ${ts()}  ${message}`, ...args);
}

/**
 * Log a consistent-hashing message.
 * @param {string} message
 * @param {...any} args
 */
function hash(message, ...args) {
  console.log(`[HASH] ${ts()}  ${message}`, ...args);
}

/**
 * Log a trending/ranking message.
 * @param {string} message
 * @param {...any} args
 */
function trending(message, ...args) {
  console.log(`[TRENDING] ${ts()}  ${message}`, ...args);
}

module.exports = { info, warn, error, cacheHit, cacheMiss, batch, hash, trending };
