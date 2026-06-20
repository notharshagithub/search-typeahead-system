# Typeahead System: Viva & Architecture Guide

This document explains everything we built in the Typeahead Search System using simple, easy-to-understand English. You can use this as a reference or a study guide to confidently explain your design choices in a viva (interview/presentation).

---

## 1. The Big Picture (System Architecture)
The goal was to build a Google-style autocomplete box. As the user types, we need to suggest the most popular searches starting with those letters. We must do this *instantly*, even if millions of people are searching at the same time.

To achieve this, we built a **microservices architecture** running entirely inside **Docker Containers**. 
- **Frontend**: A React application that users interact with.
- **Backend API**: An Express.js Node server that coordinates everything.
- **Database (The Source of Truth)**: A SQLite database that stores all query counts.
- **Cache Nodes**: Three separate in-memory servers to speed up reads.

---

## 2. The Frontend (React UI)
### Problem: 
If a user types "iphone", they hit 6 keys. If we send an API request for every single keystroke, the server will be overwhelmed with 6 requests from a single user.
### Solution: **Debouncing**
We implemented a **300ms Debounce** in the React app. When the user types, the browser waits until they stop typing for 300 milliseconds before it sends the request. If they type quickly, we only send 1 request instead of 6. This protects the backend from unnecessary spam traffic.

---

## 3. The Database Layer (SQLite)
### Problem:
We need a place to permanently store the 130,000+ searches and their exact popularity counts. When we ask the database "Give me everything starting with 'ip'", it needs to find it quickly.
### Solution: **Indexes & WAL Mode**
- **B-Tree Indexing:** We created an index on the `query` column (`CREATE INDEX idx_query_prefix`). This allows the database to instantly jump to words starting with "ip" instead of scanning all 130,000 rows one by one.
- **WAL Mode:** We turned on "Write-Ahead Logging" (WAL) in SQLite. This allows multiple users to read from the database at the exact same time that someone else is writing to it, without locking or blocking each other.

---

## 4. The Distributed Cache Layer
### Problem:
Even with an index, asking the database for suggestions on every keystroke across millions of users is too slow. The database is stored on a hard drive, which is relatively slow.
### Solution: **In-Memory Caching & Consistent Hashing**
We created 3 independent "Cache Node" servers. They store search results directly in computer memory (RAM), which is 100x faster than a hard drive.

- **Read-Through Caching:** When a user searches for "mac":
  1. The backend checks the cache.
  2. If the cache doesn't have it (Cache Miss), the backend asks the database.
  3. The backend returns the result to the user, but *also saves it in the cache* so the next person asking for "mac" gets it instantly (Cache Hit).
- **Consistent Hashing:** How do we know which of the 3 cache nodes has the data? We use a "Hash Ring". We pass the word "mac" through a math function (MD5 hash) which outputs a number. Based on that number, we always know exactly which cache node (Node 1, 2, or 3) holds the data for "mac". If one node crashes, only 1/3rd of the cache is lost, and the system continues working.

### Problem: 
What if a query becomes unpopular, but it's stuck in the cache forever?
### Solution: **TTL (Time to Live) & Cache Invalidation**
Every item in the cache is given a 60-second expiration timer (TTL). After 60 seconds, it deletes itself. We also built a "Cache Invalidation" API that allows us to manually flush or delete specific stale data from the cache on command.

---

## 5. Write Batching (Protecting the Database)
### Problem:
When a user hits "Enter", we need to update the database to increase that search's popularity count. If 1,000 users hit "Enter" on "docker" at the same time, doing 1,000 separate database writes will crash the hard drive.
### Solution: **Asynchronous Write Batching**
Instead of writing to the database immediately, our backend intercepts the request, replies "OK" to the user, and puts the query into a temporary holding area (an in-memory Map). 
Every **5 seconds**, a background worker takes all the aggregated counts (e.g., `{"docker": 1000, "apple": 500}`) and writes them to the database in **one single transaction**. We turned 1,500 database writes into exactly 1 database write.

---

## 6. Real-time Trending Topics & Analytics
### Problem:
We want to show users what is trending *right now*, and we want to monitor system health without doing heavy database queries.
### Solution: **In-Memory Sliding Windows**
- **Trending API:** Because we are already holding recent searches in memory for write-batching, we simply keep a "sliding window" of the last 50 seconds of searches. When the frontend asks for Trending Topics, we instantly return the highest counts from this in-memory window. It takes 0 database queries!
- **Analytics:** We built a lightweight `metricsStore` that simply counts +1 every time there is a Cache Hit or Miss, and records the speed (latency) of the response. The React UI polls this data every 2 seconds to show a live Command Center dashboard.

---

## Summary for your Viva
If the examiner asks you **"Why is your system highly scalable?"**, you should answer:

1. **"I protected the frontend"** using Debouncing.
2. **"I protected the read path"** using a Distributed Cache with Consistent Hashing.
3. **"I protected the write path"** using Asynchronous Write-Batching.
4. **"I decoupled analytics from the database"** by using sliding-window in-memory aggregation.
