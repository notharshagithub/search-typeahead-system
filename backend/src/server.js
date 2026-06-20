/**
 * @fileoverview Main Express application entry point for the Typeahead Backend.
 *
 * This server exposes three route groups:
 *   - /suggest  – returns autocomplete suggestions for a given prefix
 *   - /search   – records a completed search (write path)
 *   - /cache    – debug/introspection endpoints for the distributed cache layer
 *
 * On startup, the server:
 *   1. Initialises the SQLite database (creates tables if needed).
 *   2. Loads the dataset into the DB (idempotent — skips if data already present).
 *   3. Starts the Express listener.
 *
 * @module server
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./logger');
const queryStore = require('./store/queryStore');

const suggestRouter = require('./routes/suggest');
const searchRouter = require('./routes/search');
const trendingRouter = require('./routes/trending');
const cacheDebugRouter = require('./routes/cacheDebug');
const analyticsRouter = require('./routes/analytics');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/** Enable Cross-Origin Resource Sharing for the frontend. */
app.use(cors());

/** HTTP request logger in dev format. */
app.use(morgan('dev'));

/** Parse incoming JSON payloads. */
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/suggest', suggestRouter);
app.use('/search', searchRouter);
app.use('/trending', trendingRouter);
app.use('/cache', cacheDebugRouter);
app.use('/analytics', analyticsRouter);

/**
 * GET /health
 * Lightweight liveness / readiness probe.
 *
 * @returns {{ status: string, service: string }}
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// ---------------------------------------------------------------------------
// Startup – initialise DB, load dataset, then listen
// ---------------------------------------------------------------------------

const port = process.env.PORT || 3001;

try {
  // Phase 2: Initialise SQLite database
  queryStore.initDB();

  // Phase 1/2: Load dataset into DB (idempotent)
  queryStore.loadDataset();

  const totalQueries = queryStore.getCount();
  logger.info(`[SERVER] Database ready with ${totalQueries} queries`);
} catch (err) {
  logger.error(`[SERVER] Failed to initialise database: ${err.message}`);
  logger.error(err.stack);
  // Continue running — health endpoint should still work for debugging
}

app.listen(port, () => {
  logger.info(`[SERVER] Backend started on port ${port}`);
});
