const SecurityScan = require('../models/SecurityScan');
const User = require('../models/User');
const { scanUser } = require('../services/securityService');

const MIN_INTERVAL = 2 * 60 * 1000; // a scan makes ~100 outbound requests; don't let it be spammed

/** Shared by the API and the weekly cron job. */
const runScan = async (uid, username) => {
  const result = await scanUser(username);
  return SecurityScan.findOneAndReplace({ uid }, { uid, ...result }, { upsert: true, new: true });
};

/** GET /api/security – latest full scan (or { scan: null }) */
const getScan = async (req, res) => {
  try {
    res.json({ scan: await SecurityScan.findOne({ uid: req.user.uid }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/** GET /api/security/summary – just the counts, for the Today page */
const getSummary = async (req, res) => {
  try {
    const scan = await SecurityScan.findOne({ uid: req.user.uid }, { scannedAt: 1, totals: 1 });
    res.json({ scannedAt: scan?.scannedAt || null, totals: scan?.totals || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/** POST /api/security/scan */
const scan = async (req, res) => {
  try {
    const uid = req.user.uid;
    const user = await User.findOne({ uid });
    if (!user?.githubUsername) return res.status(400).json({ error: 'Connect GitHub first.' });

    const last = await SecurityScan.findOne({ uid }, { scannedAt: 1 });
    if (last?.scannedAt && Date.now() - last.scannedAt.getTime() < MIN_INTERVAL) {
      return res.status(429).json({ error: 'You just scanned. Try again in a couple of minutes.' });
    }
    res.json({ scan: await runScan(uid, user.githubUsername) });
  } catch (err) {
    console.error('security scan error:', err.message);
    res.status(err.status === 404 ? 404 : 502).json({ error: `Scan failed: ${err.message}` });
  }
};

module.exports = { getScan, getSummary, scan, runScan };
