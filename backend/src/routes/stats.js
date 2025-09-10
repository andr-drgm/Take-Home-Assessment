const express = require('express');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// In-memory cache with file mtime validation.
let cache = { stats: null, mtimeMs: 0 };

function computeStats(items) {
  const total = items.length;
  const sum = items.reduce((acc, cur) => acc + (Number(cur.price) || 0), 0);
  const averagePrice = total ? sum / total : 0;
  return { total, averagePrice };
}

async function getStats() {
  const { mtimeMs } = await fsp.stat(DATA_PATH);
  if (cache.stats && cache.mtimeMs === mtimeMs) {
    return { stats: cache.stats, cache: 'HIT' };
  }

  const raw = await fsp.readFile(DATA_PATH, 'utf8');
  const items = JSON.parse(raw);
  const stats = computeStats(items);
  cache = { stats, mtimeMs };
  return { stats, cache: 'MISS' };
}

// Note: We intentionally avoid fs.watch for portability; cache validity is
// checked via file mtime on each request.

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    const { stats, cache: cacheHeader } = await getStats();
    res.set('X-Cache', cacheHeader);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
