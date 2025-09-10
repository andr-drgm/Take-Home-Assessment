import React, { useEffect, useState } from 'react';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';

function Items() {
  const { items, total, page, limit, q, hasMore, setQ, setPage, fetchItems } = useData();
  const [loading, setLoading] = useState(false);

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

  if (loading && !items.length) return <p>Loading...</p>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <input
          aria-label="Search items"
          placeholder="Search..."
          value={q}
          onChange={onSearchChange}
          style={{ padding: 8, width: '100%', maxWidth: 320 }}
        />
      </div>
      <div style={{ marginBottom: 8, color: '#555' }}>
        Showing {items.length} of {total} items
      </div>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <Link to={'/items/' + item.id}>{item.name}</Link>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
          Prev
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)} disabled={!hasMore || loading}>
          Next
        </button>
      </div>
    </div>
  );
}

export default Items;
