const axios = require('axios');
const Briefing = require('../models/Briefing');
const User = require('../models/User');
const Task = require('../models/Task');
const Weather = require('../models/Weather');
const SecurityScan = require('../models/SecurityScan');
const { freshStats } = require('./githubController');
const { getLatestNews } = require('../services/newsService');
const {
  parseTz, localInfo, buildBriefingData, generateBriefing, splitSentences, countWords, estimateSeconds,
} = require('../services/briefingService');

const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // ElevenLabs premade "George": warm, clear narrator

/** Today's briefing for `uid` (local day from `tz`), generating it if missing or `force`. Shared with cron. */
const getOrCreateBriefing = async (uid, tz = 0, { force = false } = {}) => {
  const now = new Date();
  const { date } = localInfo(now, tz);
  if (!force) {
    const cached = await Briefing.findOne({ uid, date });
    if (cached) return cached;
  }
  // Every source is optional: a failing integration just drops its section.
  const [user, gh, tasks, weather, scan, news] = await Promise.all([
    User.findOne({ uid }),
    freshStats(uid).catch(() => null),
    Task.find({ uid }).catch(() => []),
    Weather.findOne({ uid }).catch(() => null),
    SecurityScan.findOne({ uid }).catch(() => null),
    getLatestNews().catch(() => null),
  ]);
  const b = await generateBriefing(buildBriefingData({ user, gh, tasks, weather, scan, news, now, tz }));
  return Briefing.findOneAndUpdate(
    { uid, date },
    { sections: b.sections, script: b.script, model: b.model, createdAt: now },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

/** API shape: adds per-section sentences (for highlighting) and timing. */
const present = (doc) => {
  const wordCount = countWords(doc.script);
  return {
    date: doc.date,
    model: doc.model,
    createdAt: doc.createdAt,
    script: doc.script,
    sections: doc.sections.map(({ id, title, text }) => ({ id, title, text, sentences: splitSentences(text) })),
    wordCount,
    estSeconds: estimateSeconds(wordCount),
  };
};

const fail = (res, label) => (err) => {
  console.error(`${label} error:`, err.message);
  res.status(500).json({ error: 'Could not build your briefing right now.' });
};

/** GET /api/briefing?tz=-330 */
const get = (req, res) =>
  getOrCreateBriefing(req.user.uid, parseTz(req.query.tz)).then((b) => res.json(present(b))).catch(fail(res, 'getBriefing'));

/** POST /api/briefing/regenerate { tz } */
const regenerate = (req, res) =>
  getOrCreateBriefing(req.user.uid, parseTz(req.body?.tz), { force: true }).then((b) => res.json(present(b))).catch(fail(res, 'regenerateBriefing'));

/** GET /api/briefing/status */
const status = (_req, res) => res.json({ elevenlabs: !!process.env.ELEVENLABS_API_KEY });

// ponytail: one cached mp3 per user in process memory (lost on restart); move to object storage if plays get costly.
const audioCache = new Map();

/** GET /api/briefing/audio → MPEG audio of the user's latest briefing via ElevenLabs. */
const audio = async (req, res) => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return res.status(501).json({ error: 'Server voice is not configured.', fallback: 'browser' });
  try {
    const b = await Briefing.findOne({ uid: req.user.uid }).sort({ createdAt: -1 });
    if (!b) return res.status(404).json({ error: 'No briefing yet.' });
    const version = `${b._id}:${b.createdAt.getTime()}`;
    let hit = audioCache.get(req.user.uid);
    if (hit?.version !== version) {
      const voice = encodeURIComponent(process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE);
      const { data } = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
        { text: b.script, model_id: 'eleven_multilingual_v2' },
        { headers: { 'xi-api-key': key, Accept: 'audio/mpeg' }, responseType: 'arraybuffer', timeout: 60000 },
      );
      hit = { version, buf: Buffer.from(data) };
      audioCache.set(req.user.uid, hit);
    }
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': hit.buf.length, 'Cache-Control': 'private, no-store' });
    res.end(hit.buf);
  } catch (err) {
    console.error('briefing audio error:', err.response?.status || err.message);
    res.status(502).json({ error: 'Voice service unavailable.', fallback: 'browser' });
  }
};

module.exports = { get, regenerate, status, audio, getOrCreateBriefing };
