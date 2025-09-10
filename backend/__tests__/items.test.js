const express = require('express');
const request = require('supertest');

function buildApp() {
  const app = express();
  app.use(express.json());
  const itemsRouter = require('../src/routes/items');
  app.use('/api/items', itemsRouter);

  // Basic error handler mirroring prod behavior
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

describe('/api/items routes', () => {
  let fsp;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    fsp = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };

    jest.doMock('fs/promises', () => fsp, { virtual: true });
  });

  test('GET /api/items returns all items (happy path)', async () => {
    const data = [
      { id: 1, name: 'Apple', price: 1 },
      { id: 2, name: 'Banana', price: 2 },
    ];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));

    const app = buildApp();
    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
    expect(fsp.readFile).toHaveBeenCalledTimes(1);
  });

  test('GET /api/items supports search (q) and limit', async () => {
    const data = [
      { id: 1, name: 'Alpha', price: 1 },
      { id: 2, name: 'Beta', price: 2 },
      { id: 3, name: 'Alphabet Soup', price: 3 },
    ];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));

    const app = buildApp();
    const res = await request(app).get('/api/items').query({ q: 'alp', limit: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: 'Alpha', price: 1 }]);
  });

  test('GET /api/items/:id returns matching item', async () => {
    const data = [
      { id: 10, name: 'Thing', price: 4 },
      { id: 20, name: 'Other', price: 5 },
    ];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));

    const app = buildApp();
    const res = await request(app).get('/api/items/20');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 20, name: 'Other', price: 5 });
  });

  test('GET /api/items/:id returns 404 when not found', async () => {
    const data = [{ id: 1, name: 'Only', price: 1 }];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));

    const app = buildApp();
    const res = await request(app).get('/api/items/999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Item not found');
  });

  test('GET /api/items returns 500 on read error', async () => {
    fsp.readFile.mockRejectedValueOnce(new Error('boom'));
    const app = buildApp();
    const res = await request(app).get('/api/items');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/items creates item and writes file', async () => {
    const data = [{ id: 1, name: 'Existing', price: 1 }];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));
    fsp.writeFile.mockResolvedValueOnce();

    const fixedNow = 1234567890;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    const app = buildApp();
    const payload = { name: 'New', price: 10 };
    const res = await request(app).post('/api/items').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ...payload, id: fixedNow });
    expect(fsp.writeFile).toHaveBeenCalledTimes(1);

    // Ensure the new item was appended in the written JSON
    const written = JSON.parse(fsp.writeFile.mock.calls[0][1]);
    expect(written).toEqual([...data, { ...payload, id: fixedNow }]);

    nowSpy.mockRestore();
  });

  test('POST /api/items returns 500 on write error', async () => {
    const data = [{ id: 1, name: 'Existing', price: 1 }];
    fsp.readFile.mockResolvedValueOnce(JSON.stringify(data));
    fsp.writeFile.mockRejectedValueOnce(new Error('disk full'));

    const app = buildApp();
    const res = await request(app).post('/api/items').send({ name: 'New', price: 10 });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

