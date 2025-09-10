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

const { normalize } = require('../utils/items');

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

    // Build a prepared array with a precomputed normalized name (nameNorm)
    const prepared = data.map(item => ({ item, nameNorm: normalize(item.name) }));
    const needle = normalize(q).trim();
    const filtered = needle
      ? prepared.filter(p => p.nameNorm.includes(needle)).map(p => p.item)
      : data;

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
    const payload = req.body || {};

    // Basic validation
    const errors = [];
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const category = typeof payload.category === 'string' ? payload.category.trim() : '';
    const priceNum = typeof payload.price === 'string' ? Number(payload.price) : payload.price;
    const price = typeof priceNum === 'number' && !Number.isNaN(priceNum) ? priceNum : NaN;

    if (!name) errors.push('name is required');
    if (name && name.length > 100) errors.push('name must be <= 100 characters');
    if (!category) errors.push('category is required');
    if (category && category.length > 50) errors.push('category must be <= 50 characters');
    if (Number.isNaN(price)) errors.push('price must be a number');
    if (!Number.isNaN(price) && price < 0) errors.push('price must be >= 0');

    if (errors.length) {
      const err = new Error(errors.join(', '));
      err.status = 400;
      throw err;
    }

    const data = await readData();
    const item = { id: Date.now(), name, category, price };
    data.push(item);
    await fsp.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
