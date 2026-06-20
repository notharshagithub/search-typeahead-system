const express = require('express');
const batchQueue = require('../store/batchQueue');

const router = express.Router();

/**
 * GET /trending
 * Returns the top trending searches over the last sliding window.
 */
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  
  // Use our batchQueue's sliding window aggregator to get real-time trends
  const trending = batchQueue.getTrending(limit);
  
  res.json({
    trending,
    windowSizeSeconds: 50 // 10 batches * 5 seconds
  });
});

module.exports = router;
