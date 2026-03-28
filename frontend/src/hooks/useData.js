import { useState, useEffect, useCallback, useRef } from 'react';
import { githubAPI, weatherAPI, newsAPI, insightAPI } from '../services/api';

// ── GitHub ─────────────────────────────────────────────────────────────
export const useGithub = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.getStats();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sync = async () => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.sync();
      setData(res.data.stats || res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  const connect = async (username, token) => {
    setLoading(true); setError(null);
    try {
      const res = await githubAPI.connect(username, token);
      setData(res.data.stats);
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg); throw new Error(msg);
    } finally { setLoading(false); }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await githubAPI.disconnect();
      setData(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return { data, loading, error, refetch: fetch, sync, connect, disconnect };
};

// ── Weather (geolocation-first) ────────────────────────────────────────
export const useWeather = () => {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [locating, setLocating] = useState(false);
  const fetched = useRef(false);

  const fetchWeather = useCallback(async (params = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await weatherAPI.get(params);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, []);

  // On mount: try browser geolocation, fallback to stored/default
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          setLocating(false);
          fetchWeather({}); // fallback to stored/default city
        },
        { timeout: 8000 }
      );
    } else {
      fetchWeather({});
    }
  }, [fetchWeather]);

  const sync = async (params = {}) => {
    setLoading(true);
    try {
      const res = await weatherAPI.sync(params);
      setData(res.data.weather);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const refreshWithLocation = () => {
    if (!navigator.geolocation) return fetchWeather({});
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => { setLocating(false); fetchWeather({}); },
      { timeout: 8000 }
    );
  };

  return { data, loading, error, locating, refetch: fetchWeather, sync, refreshWithLocation };
};

// ── News ───────────────────────────────────────────────────────────────
export const useNews = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await newsAPI.get();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const sync = async () => {
    setLoading(true);
    try { const res = await newsAPI.sync(); setData(res.data); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return { data, loading, error, refetch: fetch, sync };
};

// ── Insight ────────────────────────────────────────────────────────────
export const useInsight = () => {
  const [latest,     setLatest]     = useState(null);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchLatest = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await insightAPI.getLatest();
      setLatest(res.data);
    } catch (e) {
      // 404 = no insight yet, not a real error
      if (e.response?.status !== 404) setError(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await insightAPI.getHistory(20);
      setHistory(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchHistory();
  }, [fetchLatest, fetchHistory]);

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const res = await insightAPI.generate();
      setLatest(res.data);
      fetchHistory(); // refresh history list
      return res.data;
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      setError(msg); throw new Error(msg);
    } finally { setGenerating(false); }
  };

  const askCustom = async (prompt) => {
    setGenerating(true);
    try {
      const res = await insightAPI.custom(prompt);
      fetchHistory();
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data?.error || e.message);
    } finally { setGenerating(false); }
  };

  return { latest, history, loading, error, generating, generate, askCustom, refetch: fetchLatest };
};
