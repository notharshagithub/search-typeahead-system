# Phase 9 Notes: Analytics & Performance Metrics

## What was built

We've reached the point where we need to know *how well* the system is performing, particularly to justify the complexity of the distributed cache. In Phase 9, we built an in-memory observability layer.

1. **Metrics Store (`backend/src/store/metricsStore.js`)**:
   - A lightweight, entirely in-memory singleton that collects runtime telemetry.
   - Tracks `uptimeSeconds`, `totalSearches`, `cacheHits`, `cacheMisses`.
   - Maintains a sliding window (array) of the last 100 API latencies to compute a real-time `avgLatencyMs`.

2. **Metrics Ingestion**:
   - Instrumented `backend/src/routes/suggest.js` to call `recordCacheHit()`, `recordCacheMiss()`, and `recordLatency()` based on the path taken to serve the request.
   - Instrumented `backend/src/routes/search.js` to call `recordSearch()`.

3. **Analytics API & Frontend Panel**:
   - Exposed `GET /analytics` which calculates the `hitRatePercent` and `avgLatencyMs` on the fly.
   - Created a gorgeous `AnalyticsPanel` React component in `frontend/src/components/AnalyticsPanel.jsx`.
   - This panel sits beneath the trending section and polls the analytics endpoint every 2 seconds, providing a live "Command Center" dashboard of system health.

## Dataset Upgrade

As an added bonus during this phase, we ingested the massive ~130,000 query dataset provided via `typeahead_dataset.json`. 
- We replaced the synthetic data with this real dataset.
- We purged the SQLite database (`data/typeahead.db`) and restarted the backend.
- The backend's idempotent `loadDataset()` routine immediately picked up the new JSON file and performed a `bulkUpsert` of all 130k rows in a few seconds!

## How to Test

1. Open the frontend and look at the bottom **📊 System Analytics** panel.
2. Type a query that you haven't searched for yet. The first keystrokes will be **Cache Misses**.
3. Backspace and type it again. You will see the **Cache Hits** increment and the **Cache Hit Rate** percentage skyrocket!
4. Notice how the **Avg Latency** is usually < 5ms when hitting the cache.

## Next Steps
This concludes the core architecture! We now have a robust, distributed, cached, auto-batching, real-time-trending, fully-instrumented Typeahead System running in Docker!
