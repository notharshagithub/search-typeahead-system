# Phase 1-3 Notes: Dataset, Data Store, and Basic API

## What was built

1. **Synthetic Dataset Generator (`dataset/load_dataset.js`)**
   - We created a self-contained Node.js script that generates 110,000 unique search queries.
   - **Why?** We needed realistic data to test prefix-matching performance and ranking. The dataset includes diverse categories (tech, shopping, questions, locations) and uses combinatorics to ensure uniqueness.
   - **Distribution:** We applied a Zipfian (power-law) distribution where a few queries have massive counts (up to 500k), while the long tail of 90k+ queries have counts under 100. This mimics real-world search traffic.

2. **Primary Data Store (`backend/src/store/queryStore.js`)**
   - We implemented the system's source of truth using `better-sqlite3`.
   - **Why SQLite?** It's lightweight, requires no separate infrastructure to manage (saving Docker overhead), and is exceptionally fast for read-heavy workloads when configured correctly.
   - **WAL Mode:** We enabled Write-Ahead Logging (`PRAGMA journal_mode=WAL`). **Why?** WAL mode allows simultaneous readers and writers, preventing DB locks when we eventually batch-write new queries while serving thousands of read requests.
   - **Schema & Indexing:** We created a `queries` table with `query TEXT PRIMARY KEY` and an index `idx_query_prefix ON queries(query)`. The index allows `LIKE 'prefix%'` queries to execute in logarithmic time instead of scanning the whole table.

3. **Basic API Routes (`/suggest` and `/search`)**
   - **`/suggest?q=...`:** Directly queries the SQLite DB using a `LIKE` clause and orders by `count DESC` returning the top 10 matches. (No caching yet).
   - **`/search`:** A POST endpoint that simulates a user hitting "enter" on a search. Currently, it performs a synchronous `INSERT OR REPLACE` or `UPDATE` to increment the count. We immediately respond with `{"message": "Searched"}` to decouple client latency from DB writes.
   - **Idempotent Loader:** On backend startup (`server.js`), we call `loadDataset()` which checks if the DB is empty, and if so, runs a bulk upsert wrapped in a transaction (for speed) to load the 110k dataset records.

## How to test it

You can query the backend directly to see the SQLite prefix matching in action:

```bash
# Test the suggest endpoint
curl -s "http://localhost:3001/suggest?q=iphone" | jq

# Test the write path
curl -s -X POST -H "Content-Type: application/json" -d '{"query": "iphone 16 pro max"}' "http://localhost:3001/search"
```

## Next Steps

With the core DB and dataset functioning, we're ready for **Phase 4: Frontend**. We'll build the React search box with debouncing and a dropdown to display these suggestions.
