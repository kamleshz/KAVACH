import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../services/apiEndpoints';

export const usePlantProcessHistory = ({ clientId, type, itemId, user }) => {
  const resolvedUserName = useMemo(() => user?.name || user?.username || user?.email || 'Current User', [user]);

  const historyStorageKey = useMemo(() => {
    if (!clientId || !type || !itemId) return null;
    return `eprkavach:plantprocess:history:${clientId}:${type}:${itemId}`;
  }, [clientId, type, itemId]);

  const legacyHistoryStorageKey = useMemo(() => {
    const userKey = user?.id || user?._id || user?.email || 'anonymous';
    if (!clientId || !type || !itemId) return null;
    return `eprkavach:plantprocess:history:${clientId}:${type}:${itemId}:${userKey}`;
  }, [clientId, type, itemId, user]);

  const [persistedHistory, setPersistedHistory] = useState([]);
  useEffect(() => {
    if (!historyStorageKey) return;
    try {
      const rawShared = localStorage.getItem(historyStorageKey);
      const parsedShared = rawShared ? JSON.parse(rawShared) : [];
      if (Array.isArray(parsedShared) && parsedShared.length) {
        setPersistedHistory(parsedShared);
        return;
      }

      if (!legacyHistoryStorageKey) {
        setPersistedHistory([]);
        return;
      }

      const rawLegacy = localStorage.getItem(legacyHistoryStorageKey);
      const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : [];
      if (Array.isArray(parsedLegacy) && parsedLegacy.length) {
        setPersistedHistory(parsedLegacy);
        try {
          localStorage.setItem(historyStorageKey, JSON.stringify(parsedLegacy));
        } catch (_) {
          void 0;
        }
        return;
      }

      setPersistedHistory([]);
    } catch (_) {
      setPersistedHistory([]);
    }
  }, [historyStorageKey, legacyHistoryStorageKey]);

  const appendPersistedHistory = useCallback((entries) => {
    if (!historyStorageKey || !Array.isArray(entries) || entries.length === 0) return;
    setPersistedHistory((prev) => {
      const next = [...entries, ...prev].slice(0, 2000);
      try {
        localStorage.setItem(historyStorageKey, JSON.stringify(next));
      } catch (_) {
        void 0;
      }
      if (legacyHistoryStorageKey) {
        try {
          localStorage.setItem(legacyHistoryStorageKey, JSON.stringify(next));
        } catch (_) {
          void 0;
        }
      }
      return next;
    });
  }, [historyStorageKey, legacyHistoryStorageKey]);

  const [dbHistory, setDbHistory] = useState([]);
  const [dbHistoryLoaded, setDbHistoryLoaded] = useState(false);

  const fetchHistory = useCallback((signal) => {
    if (!clientId || !type || !itemId) return;
    api.get(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_HISTORY(clientId), { params: { type, itemId }, signal })
      .then((res) => {
        const rows = res.data?.data || [];
        setDbHistory(Array.isArray(rows) ? rows : []);
        setDbHistoryLoaded(true);
      })
      .catch((error) => {
        if (error.code === 'ERR_CANCELED') return;
        setDbHistory([]);
        setDbHistoryLoaded(true);
      });
  }, [clientId, type, itemId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

  const normalizedDbHistory = useMemo(() => {
    if (!Array.isArray(dbHistory)) return [];
    return dbHistory.map((entry, idx) => {
      const userText =
        entry?.user?.name ||
        entry?.user?.email ||
        entry?.userName ||
        entry?.user ||
        '';
      return {
        ...entry,
        user: userText,
        id: entry.id || `db-${entry.table || 'unknown'}-${entry.row || idx}-${entry.field || 'unknown'}-${idx}`
      };
    });
  }, [dbHistory]);

  useEffect(() => {
    if (!clientId || !type || !itemId) return;
    if (!dbHistoryLoaded) return;
    if (!Array.isArray(persistedHistory) || persistedHistory.length === 0) return;

    if (normalizedDbHistory.length > 0) {
      setPersistedHistory([]);
      try { localStorage.removeItem(historyStorageKey); } catch (_) { void 0; }
      if (legacyHistoryStorageKey) try { localStorage.removeItem(legacyHistoryStorageKey); } catch (_) { void 0; }
      return;
    }

    api.post(API_ENDPOINTS.CLIENT.PRODUCT_COMPLIANCE_HISTORY_IMPORT(clientId), {
      type,
      itemId,
      entries: persistedHistory
    }).then(() => {
      setPersistedHistory([]);
      try { localStorage.removeItem(historyStorageKey); } catch (_) { void 0; }
      if (legacyHistoryStorageKey) try { localStorage.removeItem(legacyHistoryStorageKey); } catch (_) { void 0; }
    }).catch(() => { void 0; });
  }, [clientId, type, itemId, dbHistoryLoaded, normalizedDbHistory.length, persistedHistory, historyStorageKey, legacyHistoryStorageKey]);

  return {
    resolvedUserName,
    historyStorageKey,
    legacyHistoryStorageKey,
    persistedHistory,
    appendPersistedHistory,
    dbHistoryLoaded,
    normalizedDbHistory
  };
};
