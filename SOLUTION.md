# Solution

## Backend

### 1) Async I/O Refactor

Refactored the items routes to avoid blocking the event loop.

Changes

- Switched to `fs/promises` and `async/await` for reads/writes.
- Converted route handlers to `async` and `await` I/O calls.
- Preserved existing behavior (supports `q` and `limit` query params and basic POST create).
- New tests in `backend/__tests__/items.test.js` mount the items router on a throwaway Express app with `express.json()`.
- Happy paths: list all items, search via `q`, limit results, get by `:id`, and create via POST.
- Error cases: 404 on missing `:id`; 500 when read/write fails (mocked).

### 2) Logger Middleware Enhancement

Improved request logging for better observability and performance insight.

Changes

- Replaced simple request line log with a duration-aware logger that records completion.
- Uses `res.on('finish')` to log after the response is sent, including status and latency.
- Includes ISO timestamp, HTTP method, URL, status code, and duration in ms.

### 3) `/api/stats` Caching

Implemented in-memory caching with mtime validation.

Changes

- Fixed data path to `../../../data/items.json` from `../../data/items.json`.
- Added cache storing computed stats and source file `mtimeMs`.
- On each request, compare `fs.stat` mtime to validate cache; recompute on mismatch.
- Added `X-Cache: HIT|MISS` response header for debuggability.
- New tests in `backend/__tests__/stats.test.js` mount the stats router on a throwaway Express app.
- Verifies first request returns `X-Cache: MISS` and subsequent request `HIT` when mtime is unchanged.
- Verifies changing `mtimeMs` forces a `MISS` and recomputation.

## Frontend
