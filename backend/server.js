const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initFirebase } = require('./config/firebase');
const { startCronJobs } = require('./jobs/cronJobs');

// Load env vars
dotenv.config();

// Init Express
const app = express();

// Connect MongoDB
connectDB();

// Init Firebase Admin
initFirebase();

// CORS: local Vite dev server + production frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://insightifyweb.vercel.app',
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ── Routes ──────────────────────────────────
app.use('/api/auth',    require('./routes/authRoutes'));
app.use('/api/github',  require('./routes/githubRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use('/api/news',    require('./routes/newsRoutes'));
app.use('/api/insight', require('./routes/insightRoutes'));
app.use('/api/user',    require('./routes/userRoutes'));
app.use('/api/tasks',   require('./routes/taskRoutes'));
app.use('/api/spotify', require('./routes/spotifyRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/security', require('./routes/securityRoutes'));
app.use('/api/public',   require('./routes/publicRoutes'));
// Feature modules
app.use('/api/autopilot', require('./routes/autopilotRoutes'));
app.use('/api/codebase', require('./routes/codebaseRoutes'));
app.use('/api/flow', require('./routes/flowRoutes'));
app.use('/api/skills', require('./routes/skillsRoutes'));
app.use('/api/briefing', require('./routes/briefingRoutes'));
app.use('/api/rooms', require('./routes/roomsRoutes'));


// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV })
);

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Insightify API running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
  // Start cron jobs after server boots
  startCronJobs();
});
