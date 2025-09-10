# Solution

## Backend

### 1) Async I/O Refactor

Refactored the items routes to avoid blocking the event loop.

Changes

- Switched to `fs/promises` and `async/await` for reads/writes.
- Converted route handlers to `async` and `await` I/O calls.
- Preserved existing behavior (supports `q` and `limit` query params and basic POST create).

### 2) Logger Middleware Enhancement

Improved request logging for better observability and performance insight.

Changes

- Replaced simple request line log with a duration-aware logger that records completion.
- Uses `res.on('finish')` to log after the response is sent, including status and latency.
- Includes ISO timestamp, HTTP method, URL, status code, and duration in ms.

## Frontend
