const express = require('express');
const request = require('supertest');

// Helper to build an express app with the stats router loaded fresh per test
function buildApp() {
  const app = express();
  // Load the router after mocks are in place
  const statsRouter = require('../src/routes/stats');
  app.use('/api/stats', statsRouter);
  return app;
}

describe('/api/stats caching', () => {
  let fsPromisesMock;
  let fsMock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Mock fs.watch to avoid real file watchers
    fsMock = { watch: jest.fn(() => ({ unref: jest.fn() })) };
    jest.doMock('fs', () => fsMock, { virtual: true });

    // Default mocks for fs/promises
    fsPromisesMock = {
      stat: jest.fn(),
      readFile: jest.fn()
    };
    jest.doMock('fs/promises', () => fsPromisesMock, { virtual: true });
  });

  test('first request MISS then subsequent HIT with unchanged mtime', async () => {
    // Arrange mtime stable
    fsPromisesMock.stat.mockResolvedValue({ mtimeMs: 123 });
    fsPromisesMock.readFile.mockResolvedValue(
      JSON.stringify([{ price: 10 }, { price: 20 }])
    );

    const app = buildApp();

    // First call -> MISS
    let res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body).toEqual({ total: 2, averagePrice: 15 });

    // Second call -> HIT (mtime unchanged and cache present)
    res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
    expect(res.body).toEqual({ total: 2, averagePrice: 15 });

    // Ensure readFile was only needed on MISS
    expect(fsPromisesMock.readFile).toHaveBeenCalledTimes(1);
  });

  test('mtime change triggers MISS and recompute', async () => {
    // mtime changes between calls
    let currentMtime = 100;
    fsPromisesMock.stat.mockImplementation(() => Promise.resolve({ mtimeMs: currentMtime }));
    fsPromisesMock.readFile.mockResolvedValueOnce(
      JSON.stringify([{ price: 5 }, { price: 15 }])
    );

    const app = buildApp();

    // First call -> MISS, average 10
    let res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body).toEqual({ total: 2, averagePrice: 10 });

    // Change mtime and returned data; next call should MISS again
    currentMtime = 200;
    fsPromisesMock.readFile.mockResolvedValueOnce(
      JSON.stringify([{ price: 0 }, { price: 0 }, { price: 30 }])
    );

    res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.body).toEqual({ total: 3, averagePrice: 10 });
  });
});

