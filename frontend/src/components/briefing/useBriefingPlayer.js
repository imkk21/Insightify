import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { briefingAPI } from './briefingApi';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
const PREFERRED = ['Natural', 'Google', 'Samantha', 'Daniel'];

const pickVoice = () => {
  const en = (synth?.getVoices() || []).filter((v) => /^en[-_]/i.test(v.lang) || v.lang === 'en');
  for (const name of PREFERRED) {
    const v = en.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return en.find((v) => v.default) || en[0] || null;
};

/**
 * Plays a briefing with ElevenLabs audio (when `serverVoice`) or the browser's speech synthesis.
 * Speech goes sentence by sentence so highlight, pause/resume and chapter jumps work everywhere.
 */
export default function useBriefingPlayer(briefing, serverVoice) {
  const { list, total } = useMemo(() => {
    const out = [];
    let start = 0;
    (briefing?.sections || []).forEach((sec, si) => sec.sentences.forEach((text) => {
      out.push({ text, si, start });
      start += text.length + 1;
    }));
    return { list: out, total: start || 1 };
  }, [briefing]);
  const est = briefing?.estSeconds || 0;

  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [mode, setMode] = useState(null); // null until first play, then 'audio' | 'speech'
  const [loadingAudio, setLoadingAudio] = useState(false);

  const r = useRef({});
  Object.assign(r.current, { list, total, est, rate, index, mode });
  const token = useRef(0);
  const audio = useRef(null);
  const voice = useRef(null);
  const utterance = useRef(null);

  const supported = serverVoice || !!synth;

  useEffect(() => {
    if (!synth) return undefined;
    const update = () => { voice.current = pickVoice(); };
    update();
    synth.addEventListener?.('voiceschanged', update);
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, []);

  const stopSpeech = () => { token.current += 1; synth?.cancel(); }; // bump token first: cancel may fire onend synchronously

  const speak = useCallback((i) => {
    stopSpeech();
    const t = token.current;
    const { list: l } = r.current;
    if (i >= l.length) { setPlaying(false); setIndex(0); setElapsed(0); return; }
    setIndex(i);
    const u = new SpeechSynthesisUtterance(l[i].text);
    if (voice.current) { u.voice = voice.current; u.lang = voice.current.lang; }
    u.rate = r.current.rate;
    u.onend = () => { if (t === token.current) speak(i + 1); };
    u.onerror = (e) => { if (t === token.current && !['interrupted', 'canceled'].includes(e.error)) setPlaying(false); };
    utterance.current = u; // keep a reference: Chrome drops events for GC'd utterances
    synth.speak(u);
  }, []);

  // Reset whenever the briefing changes (e.g. regenerated).
  useEffect(() => {
    setPlaying(false); setIndex(0); setElapsed(0); setDuration(0); setMode(null);
    return () => {
      stopSpeech();
      if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null; }
    };
  }, [briefing]);

  // Speech has no clock: tick an estimate in "content time" (scaled by rate).
  useEffect(() => {
    if (!playing || mode !== 'speech') return undefined;
    const id = setInterval(() => setElapsed((e) => Math.min(r.current.est, e + 0.25 * r.current.rate)), 250);
    return () => clearInterval(id);
  }, [playing, mode]);

  const loadAudio = async () => {
    setLoadingAudio(true);
    try {
      const { data } = await briefingAPI.audio();
      const a = new Audio(URL.createObjectURL(data));
      a.playbackRate = r.current.rate;
      // ponytail: highlight follows playback by character share; ElevenLabs timestamps endpoint if it drifts too much.
      a.ontimeupdate = () => {
        setElapsed(a.currentTime);
        const pos = (a.currentTime / (a.duration || 1)) * r.current.total;
        const l = r.current.list;
        let i = 0;
        while (i + 1 < l.length && l[i + 1].start <= pos) i += 1;
        setIndex(i);
      };
      a.onloadedmetadata = () => {
        setDuration(a.duration);
        const { index: i, list: l, total: t } = r.current; // honour a chapter picked before the first play
        if (i && !a.currentTime) a.currentTime = (l[i].start / t) * a.duration;
      };
      a.onended = () => { setPlaying(false); setIndex(0); setElapsed(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audio.current = a;
      return 'audio';
    } catch {
      return 'speech'; // 501 / 502 / network: fall back to the browser voice
    } finally {
      setLoadingAudio(false);
    }
  };

  const play = async () => {
    if (!list.length || loadingAudio) return;
    let m = r.current.mode;
    if (!m) {
      m = serverVoice ? await loadAudio() : 'speech';
      if (m === 'speech' && !synth) return;
      setMode(m);
      r.current.mode = m; // pause() may run before the next render
    }
    if (m === 'audio') {
      const a = audio.current;
      a.play().catch(() => setPlaying(false)); // autoplay blocked: user presses play again
    } else {
      setPlaying(true);
      speak(r.current.index);
    }
  };

  const pause = () => {
    if (r.current.mode === 'audio') audio.current?.pause();
    else stopSpeech();
    setPlaying(false);
  };

  const jump = (sectionIndex) => {
    const i = list.findIndex((s) => s.si === sectionIndex);
    if (i < 0) return;
    const share = list[i].start / total;
    setIndex(i);
    if (r.current.mode === 'audio' && audio.current) {
      audio.current.currentTime = share * (audio.current.duration || 0);
      return;
    }
    setElapsed(share * est);
    if (playing) speak(i);
  };

  const setRate = (v) => {
    setRateState(v);
    r.current.rate = v;
    if (audio.current) audio.current.playbackRate = v;
    if (playing && r.current.mode === 'speech') speak(r.current.index); // restart current sentence at new speed
  };

  return {
    list, playing, index, section: list[index]?.si ?? 0, elapsed,
    total: mode === 'audio' && duration ? duration : est,
    rate, setRate, mode, loadingAudio, supported,
    play, pause, toggle: () => (playing ? pause() : play()), jump,
  };
}
