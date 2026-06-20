# Typeahead System: Design Choices & Core Implementation Guide

This document is a formal architectural walkthrough. It justifies every major design choice made during the development of the Typeahead System and provides the core code snippets that power the infrastructure.

---

## 1. Data Modeling & Database Architecture

### Design Choice: SQLite with WAL Mode & B-Tree Indexing
Instead of relying on heavy databases like PostgreSQL or Elasticsearch for a local prototype, we chose **SQLite** using the `better-sqlite3` library. To achieve extreme concurrency, we enabled **Write-Ahead Logging (WAL)**. To ensure read performance is $O(\log N)$ instead of $O(N)$, we utilized **B-Tree prefix indexing**.

### Core Implementation Code:
```javascript
// backend/src/store/queryStore.js
const Database = require('better-sqlite3');
const db = new Database(dbPath);

// 1. Enable WAL mode to allow concurrent readers and writers without locking
db.pragma('journal_mode = WAL');

// 2. Data Modeling: The 'queries' table
db.exec(`
  CREATE TABLE IF NOT EXISTS queries (
    query TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    last_searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recent_count INTEGER DEFAULT 0
  )
`);

// 3. B-Tree Index: Crucial for rapid "Starts With" lookups
db.exec(`CREATE INDEX IF NOT EXISTS idx_query_prefix ON queries(query)`);
```

---

## 2. Distributed Caching Strategy

### Design Choice: In-Memory Node.js Maps & Read-Through Pattern
Instead of deploying a centralized Redis cluster (which introduces network hops and serialization overhead), we deployed three independent Node.js Express servers. These "Cache Nodes" store data natively in V8 Engine memory using JavaScript `Map` objects. The backend uses a **Read-Through** pattern: it checks the cache, falls back to the DB on a miss, and asynchronously populates the cache.

### Core Implementation Code:
```javascript
// cache-node/src/server.js (The Cache Storage)
const cache = new Map(); // Native JS Memory

app.get('/cache/:key', (req, res) => {
  const item = cache.get(req.params.key);
  if (item && item.expiresAt > Date.now()) {
    return res.json({ data: item.value });
  }
  cache.delete(req.params.key); // Evict stale data
  return res.status(404).json({ error: 'Not found' });
});
```

```javascript
// backend/src/routes/suggest.js (Read-Through Flow)
let suggestions = await cacheClient.get(targetNode, prefix);

if (!suggestions) {
  // Fallback to SQLite
  suggestions = queryStore.getByPrefix(prefix, 10);
  
  // Asynchronously populate cache (Fire-and-forget)
  cacheClient.set(targetNode, prefix, suggestions, 60).catch(err => {
    logger.error(`Cache population failed: ${err.message}`);
  });
}
```

---

## 3. Consistent Hashing Logic

### Design Choice: Cryptographic MD5 & Binary Search
To distribute keys across the 3 cache nodes evenly, standard modulo hashing (`hash % 3`) was rejected because a single node failure invalidates 100% of the cache. Instead, we built a **Hash Ring**. We used `crypto.createHash('md5')` to assign 150 "Virtual Nodes" per physical node, preventing hotspots. We used a custom Binary Search (`bisectLeft`) to find the target node in $O(\log N)$ time.

### Core Implementation Code:
```javascript
// backend/src/cache/hashRing.js
const crypto = require('crypto');

function hashStringToInt(str) {
  const hashStr = crypto.createHash('md5').update(str).digest('hex');
  return parseInt(hashStr.substring(0, 8), 16); // 32-bit Integer
}

// Binary Search to find the closest Virtual Node on the ring
function bisectLeft(array, x) {
  let low = 0, high = array.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (array[mid] < x) low = mid + 1;
    else high = mid;
  }
  return low;
}

// Routing the prefix to a node
getNodeForKey(key) {
  const hash = hashStringToInt(key);
  let idx = bisectLeft(this.ringKeys, hash);
  if (idx === this.ringKeys.length) idx = 0; // Wrap around the ring
  return this.ringNodes.get(this.ringKeys[idx]);
}
```

---

## 4. Batch-Write Logic

### Design Choice: In-Memory Buffers & Upsert Transactions
When a major event occurs, thousands of users might search for the same term. Writing to the database instantly locks the disk. We chose to buffer writes in RAM using a JavaScript `Map`. Every 5 seconds, a `setInterval` worker converts the Map to an array and writes it in a single SQLite transaction using `ON CONFLICT DO UPDATE`.

### Core Implementation Code:
```javascript
// backend/src/store/batchQueue.js (The Buffer)
let currentBatch = new Map();

function recordSearch(query) {
  currentBatch.set(query, (currentBatch.get(query) || 0) + 1);
}

// Flushed every 5000ms via setInterval
function flushBatch() {
  const batchToProcess = currentBatch;
  currentBatch = new Map(); // Reset for new incoming traffic

  const entries = Array.from(batchToProcess, ([query, count]) => ({ query, count }));
  queryStore.bulkUpsert(entries);
}
```

```javascript
// backend/src/store/queryStore.js (The Bulk Upsert)
const upsertStmt = db.prepare(`
  INSERT INTO queries (query, count, last_searched_at, recent_count)
  VALUES (@query, @count, @now, @count)
  ON CONFLICT(query) DO UPDATE SET 
    count = count + excluded.count,
    recent_count = recent_count + excluded.count,
    last_searched_at = @now
`);

const bulkUpsert = db.transaction((entries) => {
  const now = new Date().toISOString();
  for (const entry of entries) {
    upsertStmt.run({ query: entry.query, count: entry.count, now });
  }
});
```

---

## 5. Trending-Search Computation

### Design Choice: Sliding Windows
Calculating "Trending Searches" by running `ORDER BY recent_count DESC` on a 130,000-row database every time a user loads the page is too expensive. Because `batchQueue.js` already holds recent searches in memory, we maintain a **Sliding Window** of the last 10 flushed batches (50 seconds of data). Computing trends is done entirely in CPU Cache/RAM with zero database hits.

### Core Implementation Code:
```javascript
// backend/src/store/batchQueue.js
const slidingWindow = []; // Stores the last 10 Map buffers

function flushBatch() {
  // ... flushes currentBatch to DB
  slidingWindow.push(batchToProcess);
  if (slidingWindow.length > 10) {
    slidingWindow.shift(); // Remove oldest 5-second window
  }
}

function getTrending(limit = 10) {
  const aggregated = new Map();
  
  // Aggregate all 50 seconds of data
  for (const batch of slidingWindow) {
    for (const [query, count] of batch) {
      aggregated.set(query, (aggregated.get(query) || 0) + count);
    }
  }

  // Sort and slice top results in memory
  return Array.from(aggregated, ([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
```

---

## 6. Frontend Protections

### Design Choice: Debouncing
To prevent the frontend from DDOSing our backend, we wrapped the user input in a 300ms Debounce hook.

### Core Implementation Code:
```javascript
// frontend/src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Start a timer when the user types
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // If user types again before 'delay' finishes, clear the old timer
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```
