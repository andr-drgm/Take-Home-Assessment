import React, { useEffect, useState, useMemo } from 'react';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import '../styles.css';

function Items() {
  const { items, total, page, limit, q, hasMore, setQ, setPage, fetchItems, addItem } = useData();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', price: '' });
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const name = form.name.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    const errors = [];
    if (!name) errors.push('Name is required');
    if (!category) errors.push('Category is required');
    if (Number.isNaN(price)) errors.push('Price must be a number');
    if (!Number.isNaN(price) && price < 0) errors.push('Price must be >= 0');
    if (errors.length) {
      setSubmitError(errors.join(', '));
      return;
    }

    setSubmitting(true);
    const controller = new AbortController();
    try {
      await addItem({ name, category, price }, { signal: controller.signal });
      // Refresh list to include the new item (may appear on a later page based on sort)
      await fetchItems({ signal: controller.signal, page: 1 });
      setPage(1);
      setForm({ name: '', category: '', price: '' });
    } catch (err) {
      if (err?.name !== 'AbortError') setSubmitError(err.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
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
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, marginBottom: 12 }} aria-describedby={submitError ? 'form-error' : undefined}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" name="name" placeholder="Name" value={form.name} onChange={onFormChange} aria-label="Name" />
          <input className="input" name="category" placeholder="Category" value={form.category} onChange={onFormChange} aria-label="Category" />
          <input className="input" name="price" placeholder="Price" value={form.price} onChange={onFormChange} aria-label="Price" inputMode="decimal" />
        </div>
        {submitError ? <div id="form-error" role="alert" className="muted" style={{ color: '#b00020' }}>{submitError}</div> : null}
        <div>
          <button className="btn" type="submit" disabled={submitting}>Add Item</button>
        </div>
      </form>
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
