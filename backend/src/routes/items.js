const express = require('express');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// Utility to read data asynchronously to avoid blocking the event loop
async function readData() {
  const raw = await fsp.readFile(DATA_PATH);
  return JSON.parse(raw);
}

// GET /api/items
// Supports query params: q (string), page (>=1), limit (<=100)
router.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    let { q = '', page = '1', limit = '20' } = req.query;

    // Normalize and validate
    const MAX_LIMIT = 100;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      const err = new Error('Invalid page parameter');
      err.status = 400;
      throw err;
    }

    let filtered = data;
    if (typeof q === 'string' && q.trim().length > 0) {
      const needle = q.toLowerCase();
      filtered = data.filter(item => String(item.name || '').toLowerCase().includes(needle));
    }

    const total = filtered.length;
    const start = (parsedPage - 1) * parsedLimit;
    const end = start + parsedLimit;
    const items = filtered.slice(start, end);
    const hasMore = end < total;

    res.json({ items, total, page: parsedPage, limit: parsedLimit, hasMore });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const item = data.find(i => i.id === parseInt(req.params.id));
    if (!item) {
      const err = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/items
router.post('/', async (req, res, next) => {
  try {
    // TODO: Validate payload (intentional omission)
    const item = req.body;
    const data = await readData();
    item.id = Date.now();
    data.push(item);
    await fsp.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
