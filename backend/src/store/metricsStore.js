/**
 * @fileoverview Metrics Store – In-memory collection of Analytics and Performance metrics.
 * 
 * Tracks cache hit rates, total searches, and sliding-window average latencies.
 * 
 * @module store/metricsStore
 */

const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  totalSearches: 0,
  latencies: [], // Stores last 100 requests for sliding average
  startTime: Date.now()
};

function recordCacheHit() {
  metrics.cacheHits++;
}

function recordCacheMiss() {
  metrics.cacheMisses++;
}

function recordSearch() {
  metrics.totalSearches++;
}

function recordLatency(ms) {
  metrics.latencies.push(ms);
  if (metrics.latencies.length > 100) {
    metrics.latencies.shift();
  }
}

function getMetrics() {
  const avgLatency = metrics.latencies.length > 0 
    ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length 
    : 0;
  
  const totalRequests = metrics.cacheHits + metrics.cacheMisses;
  const hitRate = totalRequests > 0 
    ? (metrics.cacheHits / totalRequests) * 100 
    : 0;

  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);

  return {
    uptimeSeconds,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    totalSearches: metrics.totalSearches,
    hitRatePercent: hitRate.toFixed(2),
    avgLatencyMs: avgLatency.toFixed(2)
  };
}

module.exports = {
  recordCacheHit,
  recordCacheMiss,
  recordSearch,
  recordLatency,
  getMetrics
};
