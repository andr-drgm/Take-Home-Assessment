import React, { createContext, useCallback, useContext, useState } from 'react';
import { API_BASE } from '../config';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const fetchItems = useCallback(async ({ signal, q: qParam = q, page: pageParam = page, limit: limitParam = limit } = {}) => {
    // Support abortable fetch to avoid memory leaks if caller unmounts
    try {
      const url = new URL(`${API_BASE}/api/items`);
      if (qParam) url.searchParams.set('q', qParam);
      url.searchParams.set('page', String(pageParam));
      url.searchParams.set('limit', String(limitParam));

      const res = await fetch(url.toString(), { signal });
      const json = await res.json();

      setItems(json.items || []);
      setTotal(json.total || 0);
      setPage(json.page || 1);
      setLimit(json.limit || limitParam);
      setHasMore(Boolean(json.hasMore));
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        // Request was aborted; safely ignore
        return;
      }
      throw err;
    }
  }, [API_BASE, q, page, limit]);

  return (
    <DataContext.Provider value={{ items, total, page, limit, q, hasMore, setQ, setPage, setLimit, fetchItems }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
