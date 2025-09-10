import React, { useEffect, useState, useMemo } from 'react';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import '../styles.css';

function Items() {
  const { items, total, page, limit, q, hasMore, setQ, setPage, fetchItems } = useData();
  const [loading, setLoading] = useState(false);

  // Must be declared before any conditional returns to keep hooks order stable
  const itemKey = useMemo(() => (index) => items[index]?.id ?? index, [items]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchItems({ signal: controller.signal })
      .catch(err => {
        if (err?.name !== 'AbortError') console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchItems, q, page, limit]);

  const onSearchChange = (e) => {
    setQ(e.target.value);
    setPage(1);
  };

  if (loading && !items.length) {
    return (
      <div className="container" aria-busy="true">
        <p role="status" aria-live="polite" className="muted" style={{ marginBottom: 8 }}>Loading items…</p>
        <div className="listBox" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton-row skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container" aria-busy={loading ? 'true' : 'false'}>
      <div style={{ marginBottom: 12 }}>
        <input
          aria-label="Search items"
          placeholder="Search..."
          value={q}
          onChange={onSearchChange}
          className="input"
        />
      </div>
      <div className="muted" style={{ marginBottom: 8 }}>
        Showing {items.length} of {total} items
      </div>
      <div className="listBox">
        <List
          height={480}
          itemCount={items.length}
          itemSize={44}
          width={'100%'}
          itemKey={itemKey}
        >
          {({ index, style }) => {
            const item = items[index];
            if (!item) return null;
            return (
              <div style={{ ...style, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid #f2f2f2' }}>
                <Link to={'/items/' + item.id}>{item.name}</Link>
              </div>
            );
          }}
        </List>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button className="btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
          Prev
        </button>
        <span>Page {page}</span>
        <button className="btn" onClick={() => setPage(page + 1)} disabled={!hasMore || loading}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Items;
