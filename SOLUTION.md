# Solution

## Backend

### 1) Async I/O Refactor + Items Pagination/Search

Refactored the items routes to avoid blocking the event loop.

Changes

- Switched to `fs/promises` and `async/await` for reads/writes.
- Converted route handlers to `async` and `await` I/O calls.
- Added server-side pagination and search to `/api/items`.
  - Params: `q` (string), `page` (>=1), `limit` (<=100, default 20)
  - Response: `{ items, total, page, limit, hasMore }`
  - Input validation: returns 400 on invalid `page`.
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

### 1) Fix Items.js Memory Leak

Changes

- Made data fetching abortable to prevent `setState` after unmount.
- `frontend/src/state/DataContext.js`: `fetchItems` now accepts an optional `{ signal }` and ignores `AbortError`.
- `frontend/src/pages/Items.js`: creates `AbortController`, passes `signal` to `fetchItems`, and aborts in cleanup.

### 2) Frontend API Base URL

Changes

- Introduced `frontend/src/config.js` exporting `API_BASE` (default `http://localhost:5000`, override via `REACT_APP_API_BASE_URL`).
- Switched fetch calls to use `${API_BASE}/api/...` in `DataContext.js` and `ItemDetail.js` so the frontend targets port 5000, not 3000.

### 3) Items Pagination & Search UI

Changes

- `frontend/src/state/DataContext.js`: tracks `items`, `total`, `page`, `limit`, `q`, `hasMore`; `fetchItems` builds URL with `q`, `page`, `limit` and updates state from the new API shape.
- `frontend/src/pages/Items.js`: adds a search input, shows total, and provides Prev/Next pagination controls; fetches whenever `q`, `page`, or `limit` change.

### 4) Virtualized List (react-window)

Changes

- Added `react-window` to `frontend/package.json`.
- Updated `frontend/src/pages/Items.js` to render items with `FixedSizeList` (44px rows, 480px viewport) instead of mapping the entire array.
- Uses stable `itemKey` derived from item id to keep rows consistent.
