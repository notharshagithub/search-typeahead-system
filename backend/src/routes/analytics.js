const express = require('express');
const metricsStore = require('../store/metricsStore');

const router = express.Router();

/**
 * GET /analytics
 * Returns the current system metrics (cache hit rate, avg latency, etc).
 */
router.get('/', (req, res) => {
  res.json(metricsStore.getMetrics());
});

module.exports = router;
