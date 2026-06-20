# Phase 7 Notes: Cache Invalidation Strategy

## What was built

In a highly dynamic system where data changes (like new searches trending), cache invalidation is one of the hardest problems in computer science. In Phase 7, we built the endpoints to gracefully clear stale data out of our cache layer.

1. **Cache Node Flush Support (`cache-node/src/server.js`)**:
   - Added a `POST /flush` endpoint to the cache nodes which instantly `.clear()` the in-memory Map and returns the number of keys that were flushed.

2. **Backend Cache Client Abstraction (`backend/src/cache/cacheClient.js`)**:
   - Implemented `invalidate(nodeUrl, prefix)` to selectively delete a single key by passing it to the target cache node's `DELETE /del/:key` endpoint.
   - Implemented a scatter-gather `flushAll(nodes)` method using `Promise.all`. It broadcasts a `/flush` command to all registered cache nodes concurrently and returns an aggregated status payload.

3. **Debug & Management API Routes (`backend/src/routes/cacheDebug.js`)**:
   - Designed 3 endpoints for introspection and invalidation:
     - `GET /cache/debug?prefix=<prefix>`: Determines the physical node responsible for a prefix via the Hash Ring, then queries that node to see if the key is currently cached (and returns its value if true).
     - `DELETE /cache/invalidate?prefix=<prefix>`: Determines the owning cache node via the Hash Ring and sends an invalidation request specifically to that node, precisely targeting the stale data.
     - `POST /cache/flush`: Reaches out to all physical cache nodes and aggressively drops the entire cache layer simultaneously.

## How to Test

You can play around with the caching behavior from the command line:

```bash
# 1. Warm the cache
curl -s http://localhost:3001/suggest?q=ip

# 2. Verify it's cached and see which node holds it!
curl -s "http://localhost:3001/cache/debug?prefix=ip"
# Example output: {"prefix":"ip","node":"cache-node-3:3002","hit":true,"value":[...]}

# 3. Invalidate that specific key precisely!
curl -X DELETE "http://localhost:3001/cache/invalidate?prefix=ip"

# 4. Verify the miss
curl -s "http://localhost:3001/cache/debug?prefix=ip"
# Example output: {"prefix":"ip","node":"cache-node-3:3002","hit":false,"value":null}

# 5. Global Flush (Panic button)
curl -X POST http://localhost:3001/cache/flush
```

## Next Steps
Now that the distributed cache is complete and manageable, the next phase is **Phase 8: Write Batching & Trending Topics**. We need to optimise how we record `POST /search` hits so we aren't hammering the database for every single user search!
