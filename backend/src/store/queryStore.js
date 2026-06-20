/**
 * @fileoverview Query Store – SQLite-backed persistence layer for search queries.
 *
 * Manages the `queries` table which stores each unique query string alongside
 * its cumulative count, a last_searched_at timestamp, and a recent_count for
 * time-decay ranking. The store is the single source of truth that the cache
 * layer sits in front of.
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite access with
 * WAL mode enabled for concurrent read performance.
 *
 * @module store/queryStore
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');

/** @type {import('better-sqlite3').Database | null} */
let db = null;

/**
 * Initialise the SQLite database and create the queries table if needed.
 * Enables WAL journal mode for better concurrent read performance.
 * Should be called once at server startup.
 *
 * @returns {import('better-sqlite3').Database} The database instance.
 */
function initDB() {
  const dbPath = process.env.DB_PATH || './data/typeahead.db';

  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`[queryStore] Created database directory: ${dbDir}`);
  }

  logger.info(`[queryStore] initDB — opening SQLite at ${dbPath}`);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  logger.info('[queryStore] WAL journal mode enabled');

  // Create the queries table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS queries (
      query TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      last_searched_at INTEGER,
      recent_count INTEGER DEFAULT 0
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_query_prefix ON queries(query);
  `);

  logger.info('[queryStore] initDB — queries table and index ready');

  return db;
}

/**
 * Retrieve queries matching a prefix, ordered by count descending.
 * SQLite LIKE is case-insensitive for ASCII characters by default.
 *
 * @param {string} prefix - The prefix to search for.
 * @param {number} [limit=10] - Maximum number of results.
 * @returns {Array<{ query: string, count: number }>}
 */
function getByPrefix(prefix, limit = 10) {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  logger.info(`[queryStore] getByPrefix prefix="${prefix}" limit=${limit}`);

  const stmt = db.prepare(
    'SELECT query, count FROM queries WHERE query LIKE ? ORDER BY count DESC LIMIT ?'
  );
  const rows = stmt.all(prefix + '%', limit);

  logger.info(`[queryStore] getByPrefix returned ${rows.length} results`);
  return rows;
}

/**
 * Increment the count for an existing query by a given amount.
 *
 * @param {string} query - The query string to update.
 * @param {number} [by=1] - The amount to add.
 * @returns {{ changes: number }} Number of rows affected.
 */
function incrementCount(query, by = 1) {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  logger.info(`[queryStore] incrementCount query="${query}" by=${by}`);

  const stmt = db.prepare(
    'UPDATE queries SET count = count + ?, last_searched_at = ? WHERE query = ?'
  );
  const now = Math.floor(Date.now() / 1000);
  const result = stmt.run(by, now, query);

  return { changes: result.changes };
}

/**
 * Insert a query if it doesn't exist, otherwise replace its count and timestamp.
 *
 * @param {string} query - The query string to upsert.
 * @param {number} [count=1] - The count value to set.
 */
function upsertQuery(query, count = 1) {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  logger.info(`[queryStore] upsertQuery query="${query}" count=${count}`);

  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO queries (query, count, last_searched_at, recent_count) VALUES (?, ?, ?, ?)'
  );
  stmt.run(query, count, now, count);
}

/**
 * Bulk upsert an array of {query, count} entries, wrapped in a single
 * transaction for performance. Uses INSERT OR IGNORE then UPDATE to
 * handle both new and existing rows.
 *
 * @param {Array<{ query: string, count: number }>} entries
 */
function bulkUpsert(entries) {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  logger.info(`[queryStore] bulkUpsert — processing ${entries.length} entries`);

  const now = Math.floor(Date.now() / 1000);

  const upsertStmt = db.prepare(`
    INSERT INTO queries (query, count, last_searched_at, recent_count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET
      count = count + excluded.count,
      last_searched_at = excluded.last_searched_at,
      recent_count = recent_count + excluded.recent_count
  `);

  const upsertTransaction = db.transaction((entries) => {
    for (const entry of entries) {
      const q = entry.query;
      const c = entry.count || 1;
      upsertStmt.run(q, c, now, c);
    }
  });

  upsertTransaction(entries);
  logger.info(`[queryStore] bulkUpsert — completed ${entries.length} entries`);
}

/**
 * Apply exponential time-decay to all stored recent_count values.
 * Intended to be run periodically so that trending queries eventually
 * lose weight if they stop being searched.
 *
 * @param {number} [factor=0.9] - Decay multiplier (0 < factor < 1).
 */
function applyDecay(factor = 0.9) {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  logger.info(`[queryStore] applyDecay factor=${factor}`);

  const stmt = db.prepare(
    'UPDATE queries SET recent_count = CAST(recent_count * ? AS INTEGER)'
  );
  const result = stmt.run(factor);

  logger.info(`[queryStore] applyDecay — affected ${result.changes} rows`);
}

/**
 * Get the total number of rows in the queries table.
 *
 * @returns {number} Total row count.
 */
function getCount() {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  const row = db.prepare('SELECT COUNT(*) as total FROM queries').get();
  return row.total;
}

/**
 * Load the dataset from disk into the database.
 * Searches for the dataset at multiple paths (Docker mount paths and local paths).
 * Skips loading if the database already has data (idempotent).
 */
function loadDataset() {
  if (!db) throw new Error('[queryStore] DB not initialised — call initDB() first');

  // Check if DB already has data — skip for idempotency
  const existingCount = getCount();
  if (existingCount > 0) {
    logger.info(`[queryStore] loadDataset — skipped, DB already has ${existingCount} entries`);
    return;
  }

  // Search for dataset in multiple locations
  const candidatePaths = [
    '/app/data/queries.json',
    '/app/dataset/processed/queries.json',
    path.resolve('data/queries.json'),
    path.resolve('dataset/processed/queries.json'),
  ];

  let datasetPath = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      datasetPath = p;
      break;
    }
  }

  if (!datasetPath) {
    logger.warn('[queryStore] loadDataset — no dataset file found at any candidate path');
    logger.warn(`[queryStore]   searched: ${candidatePaths.join(', ')}`);
    return;
  }

  logger.info(`[queryStore] loadDataset — reading from ${datasetPath}`);

  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const entries = JSON.parse(raw);

  if (!Array.isArray(entries)) {
    logger.error('[queryStore] loadDataset — dataset is not a JSON array');
    return;
  }

  logger.info(`[queryStore] loadDataset — found ${entries.length} entries, bulk upserting…`);
  bulkUpsert(entries);

  const finalCount = getCount();
  logger.info(`[queryStore] loadDataset — done. DB now has ${finalCount} entries`);
}

module.exports = {
  initDB,
  getByPrefix,
  incrementCount,
  upsertQuery,
  bulkUpsert,
  applyDecay,
  getCount,
  loadDataset,
};
