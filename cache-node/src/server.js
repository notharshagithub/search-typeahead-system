const express = require('express');

const NODE_ID = process.env.NODE_ID || 'cache-node-unknown';
const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory cache store: Map<key, { value: any, expireAt: number }>
const store = new Map();

// Helper to check expiry and delete if expired
function getValidItem(key) {
  const item = store.get(key);
  if (!item) return null;
  if (item.expireAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return item.value;
}

// Log every request
app.use((req, res, next) => {
  if (req.path !== '/health') {
    // console.log(`[${NODE_ID}] ${req.method} ${req.url}`);
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', node: NODE_ID, size: store.size });
});

app.get('/get/:key', (req, res) => {
  const { key } = req.params;
  const value = getValidItem(key);
  
  if (value) {
    res.json({ key, value, hit: true });
  } else {
    res.json({ key, value: null, hit: false });
  }
});

app.post('/set', (req, res) => {
  const { key, value, ttl } = req.body; // ttl in seconds
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Missing key or value' });
  }
  
  const expireAt = Date.now() + (ttl * 1000);
  store.set(key, { value, expireAt });
  res.json({ success: true });
});

app.delete('/del/:key', (req, res) => {
  const { key } = req.params;
  store.delete(key);
  res.json({ success: true });
});

// FLUSH all keys
app.post('/flush', (req, res) => {
  const size = store.size;
  store.clear();
  console.log(`[${NODE_ID}] Flushed ${size} keys`);
  res.json({ success: true, flushed: size });
});

// Periodic cleanup of expired keys (every 1 minute)
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  for (const [key, item] of store.entries()) {
    if (item.expireAt < now) {
      store.delete(key);
      expiredCount++;
    }
  }
  if (expiredCount > 0) {
    console.log(`[${NODE_ID}] Cleaned up ${expiredCount} expired keys`);
  }
}, 60000);

app.listen(PORT, () => {
  console.log(`[CACHE NODE] ${NODE_ID} started on port ${PORT}`);
});
