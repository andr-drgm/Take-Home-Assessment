import React, { createContext, useCallback, useContext, useState } from 'react';
import { API_BASE } from '../config';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);

  const fetchItems = useCallback(async ({ signal } = {}) => {
    // Support abortable fetch to avoid memory leaks if caller unmounts
    try {
      const res = await fetch(`${API_BASE}/api/items?limit=500`, { signal });
      const json = await res.json();
      setItems(json);
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        // Request was aborted; safely ignore
        return;
      }
      throw err;
    }
  }, []);

  return (
    <DataContext.Provider value={{ items, fetchItems }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
