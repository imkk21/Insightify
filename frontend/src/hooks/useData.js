import { useState, useEffect, useCallback, useRef } from 'react';
import { githubAPI, weatherAPI, newsAPI, insightAPI, taskAPI } from '../services/api';

const errMsg = (e) => e.response?.data?.error || e.message;

// ── GitHub ─────────────────────────────────────────────────────────────
export const useGithub = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.getStats();
      setData(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.sync();
      setData(res.data.stats);
    } catch (e) {
      setError(errMsg(e));
    } finally { setLoading(false); }
  };

  const connect = async (username) => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.connect(username);
      setData(res.data.stats);
      return res.data;
    } catch (e) {
      const msg = errMsg(e);
      setError(msg); throw new Error(msg);
    } finally { setLoading(false); }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await githubAPI.disconnect();
      setData(null);
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };

  return { data, loading, error, sync, connect, disconnect };
};

// ── Weather (geolocation-first) ────────────────────────────────────────
export const useWeather = () => {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [locating, setLocating] = useState(false);
  const fetched = useRef(false);

  const load = useCallback(async (params = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await weatherAPI.get(params);
      setData(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally { setLoading(false); }
  }, []);

  // Try browser geolocation, fall back to stored/default city
  const refreshWithLocation = useCallback(() => {
    if (!navigator.geolocation) return load({});
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        load({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => { setLocating(false); load({}); },
      { timeout: 8000 }
    );
  }, [load]);

  useEffect(() => {
    if (fetched.current) return; // StrictMode runs effects twice in dev
    fetched.current = true;
    refreshWithLocation();
  }, [refreshWithLocation]);

  const sync = async (params = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await weatherAPI.sync(params);
      setData(res.data.weather);
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  };

  return { data, loading, error, locating, sync, refreshWithLocation };
};

// ── News ───────────────────────────────────────────────────────────────
export const useNews = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await newsAPI.get();
      setData(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
};

// ── Insight ────────────────────────────────────────────────────────────
export const useInsight = () => {
  const [latest,     setLatest]     = useState(null);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [generating, setGenerating] = useState(false);

  const loadLatest = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await insightAPI.getLatest();
      setLatest(res.data);
    } catch (e) {
      // 404 = no insight yet, not a real error
      if (e.response?.status !== 404) setError(errMsg(e));
    } finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await insightAPI.getHistory(20);
      setHistory(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    loadLatest();
    loadHistory();
  }, [loadLatest, loadHistory]);

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const res = await insightAPI.generate();
      setLatest(res.data);
      loadHistory();
      return res.data;
    } catch (e) {
      const msg = errMsg(e);
      setError(msg); throw new Error(msg);
    } finally { setGenerating(false); }
  };

  const askCustom = async (prompt) => {
    setGenerating(true);
    try {
      const res = await insightAPI.custom(prompt);
      loadHistory();
      return res.data;
    } catch (e) {
      throw new Error(errMsg(e));
    } finally { setGenerating(false); }
  };

  return { latest, history, loading, error, generating, generate, askCustom };
};

// ── Tasks ──────────────────────────────────────────────────────────────
export const useTasks = () => {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await taskAPI.getTasks();
      setTasks(res.data);
    } catch (e) {
      setError(errMsg(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (title) => {
    try {
      const { data } = await taskAPI.createTask({ title });
      setTasks((prev) => [data, ...prev]);
    } catch (e) { setError(errMsg(e)); }
  };

  // Optimistic: show the change immediately, reload from server if it fails
  const update = async (id, changes) => {
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, ...changes } : t)));
    try {
      await taskAPI.updateTask(id, changes);
    } catch (e) { setError(errMsg(e)); load(); }
  };

  const remove = async (id) => {
    setTasks((prev) => prev.filter((t) => t._id !== id));
    try {
      await taskAPI.deleteTask(id);
    } catch (e) { setError(errMsg(e)); load(); }
  };

  return { tasks, loading, error, create, update, remove };
};
