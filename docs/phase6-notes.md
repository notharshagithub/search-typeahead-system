# Phase 6 Notes: Distributed Cache with Consistent Hashing

## What was built

In this phase, we implemented a robust distributed cache layer in front of the SQLite database. We simulated 3 independent cache nodes (`cache-node-1`, `cache-node-2`, `cache-node-3`) using Express and in-memory Maps, and orchestrated them from the backend using a Consistent Hashing algorithm.

1. **Cache Nodes (`cache-node/src/server.js`)**:
   - Built a lightweight Express server for each cache node.
   - Uses an in-memory `Map` as a Key-Value store.
   - Implemented `GET /get/:key`, `POST /set`, and `DELETE /del/:key` endpoints.
   - Added Time-To-Live (TTL) support logic. When setting a key, we specify an expiration time. The `get` endpoint checks if the item is expired and purges it on the fly, while a `setInterval` garbage collector runs every 60 seconds to prune stale data proactively.

2. **Consistent Hash Ring (`backend/src/cache/hashRing.js`)**:
   - Implemented a consistent hashing ring using the MD5 cryptographic hash function.
   - **Virtual Nodes:** To ensure an even distribution of keys, each physical cache node is mapped to 150 "virtual nodes" on the ring.
   - The ring uses an array sorted by hash values. When searching for a node to assign a key, we execute a **Binary Search (O(log N))** to find the first virtual node whose hash is greater than or equal to the key's hash. This provides high performance.

3. **Cache Client Abstraction (`backend/src/cache/cacheClient.js`)**:
   - A wrapper module to talk to the cache nodes over HTTP using the native Node `fetch` API.
   - Configured aggressive timeouts (`AbortSignal.timeout(100)`) so that if a cache node is down or slow, the backend fails open gracefully and queries the DB instead of hanging the user's request.

4. **Integration with Suggestion API (`backend/src/routes/suggest.js`)**:
   - Updated the `GET /suggest?q=` endpoint to use a "Read-Through" cache pattern:
     1. Determine the target node via `hashRing.getNodeForKey(prefix)`.
     2. Attempt to `cacheClient.get()` the data from that node.
     3. If it's a cache hit, return immediately!
     4. If it's a cache miss, query SQLite.
     5. Fire an asynchronous `cacheClient.set()` to populate the cache node without blocking the HTTP response.

## Why Consistent Hashing?
Instead of a simple modulo hash (`hash(key) % num_nodes`), consistent hashing dramatically reduces "cache churn" when a node is added or goes down. If `cache-node-2` crashes, only the keys assigned to it get remapped to `cache-node-1` and `cache-node-3`. The rest of the keys stay exactly where they are, preserving the cache hit rate.

## How to Test

You can test the caching visually in the browser or via curl:

```bash
# First request takes longer and hits the DB
curl -s http://localhost:3001/suggest?q=ip
# Look at the end of the JSON, you'll see: "source":"db"

# Second request to the same prefix hits the specific Cache Node assigned to "ip"
curl -s http://localhost:3001/suggest?q=ip
# You'll see: "source":"cache"
```

In the Docker logs (`docker compose logs -f`), you'll see the backend logging whether it had a `cacheHit` or `cacheMiss` on a specific node like `cache-node-2`!

## Next Steps
We've completed the Distributed Cache Layer. The next immediate step is **Phase 7: Cache Invalidation Strategy**. We need a way to selectively clear the cache when background operations happen or specific entries get stale.
