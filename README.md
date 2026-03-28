<div align="center">

# Insightify.

### AI-Powered Personalized Developer Insight Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

> A full-stack web application that aggregates your GitHub activity, real-time weather data, and technology news — then generates intelligent weekly developer insights using Google Gemini AI.

![Insightify Dashboard](https://i.imgur.com/placeholder.png)

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Scheduled Jobs](#-scheduled-jobs)
- [Authentication Flow](#-authentication-flow)
- [Key Design Decisions](#-key-design-decisions)
- [Future Scope](#-future-scope)

---

## 🧠 Overview

**Insightify** is a capstone full-stack project that acts as a personal intelligence dashboard for software developers. After signing in with Google, users connect their GitHub account, grant location access for real-time weather, and receive weekly AI-generated insights that tie together their coding activity, local environment, and the latest tech news — all powered by **Google Gemini AI**.

The platform is built on a clean **React + Vite** frontend, an **Express.js** REST API backend, **MongoDB Atlas** for persistence, and **Firebase** for secure authentication. A **Node-Cron** scheduler automatically regenerates insights and syncs news every week without any manual intervention.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Google OAuth Login** | Secure sign-in via Firebase Authentication |
| 🔗 **GitHub Connect** | Link your GitHub account by username — one account per user enforced |
| 📊 **GitHub Analytics** | Repos, stars, forks, language breakdown, top repos, recent commits |
| 📍 **Geolocation Weather** | Browser GPS → real-time weather via OpenWeather API |
| 📰 **Tech News Feed** | Hourly technology headlines from News API |
| 🤖 **AI Weekly Insight** | Personalized Gemini AI summary of your GitHub + weather + news data |
| 💬 **Custom AI Chat** | Ask Insightify AI anything about your developer data |
| 📜 **Insight History** | Full history of all generated insights |
| 📅 **Automated Scheduling** | Weekly insights + hourly news sync via Node-Cron |
| 🛡️ **Protected Routes** | Firebase token verification middleware on all API endpoints |
| 🌐 **Smart Caching** | TTL-based caching (GitHub: 1hr, Weather: 30min, News: 1hr) |
| 🔁 **AI Fallback Logic** | Template-based insight when Gemini is unavailable |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library with hooks |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **React Router 6** | Client-side routing |
| **Axios** | HTTP client with interceptors |
| **Recharts** | Data visualization charts |
| **Firebase SDK 10** | Client-side authentication |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 18+** | JavaScript runtime |
| **Express.js 4** | REST API framework |
| **Mongoose 8** | MongoDB ODM |
| **Firebase Admin SDK** | Server-side token verification |
| **@google/generative-ai** | Gemini AI integration |
| **Node-Cron** | Scheduled background jobs |
| **Axios** | External API calls |

### Cloud & External APIs
| Service | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud database (5 collections) |
| **Firebase Authentication** | Google OAuth |
| **Google Gemini 1.5 Flash** | AI insight generation |
| **GitHub API v3** | Repository & commit data |
| **OpenWeather API** | Current weather + 5-day forecast |
| **News API** | Technology headlines |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                  │
│                                                                   │
│   LoginPage → Google OAuth → Firebase Auth SDK                   │
│        │                                                          │
│        ▼                                                          │
│   Dashboard │ GitHub │ Weather │ News │ AI Insights │ Activity   │
│        │                                                          │
│   Axios (auto-attaches Firebase ID Token as Bearer header)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express.js)                           │
│                                                                   │
│   verifyToken middleware (Firebase Admin SDK)                     │
│        │                                                          │
│   ┌────┴──────────────────────────────────────────────┐          │
│   │              Routes → Controllers                  │          │
│   │                                                    │          │
│   │  /auth    → authController    (login, me)          │          │
│   │  /github  → githubController  (stats, connect)     │          │
│   │  /weather → weatherController (get, sync)          │          │
│   │  /news    → newsController    (get, sync)          │          │
│   │  /insight → insightController (generate, history)  │          │
│   │  /user    → userController    (profile, update)    │          │
│   └────┬──────────────────────────────────────────────┘          │
│        │                                                          │
│   ┌────▼──────────────────────────────────────────────┐          │
│   │                   Services Layer                   │          │
│   │                                                    │          │
│   │  githubService  → GitHub API v3                    │          │
│   │  weatherService → OpenWeather API (lat/lon or city)│          │
│   │  newsService    → News API                         │          │
│   │  insightService → Google Gemini 1.5 Flash AI       │          │
│   └────┬──────────────────────────────────────────────┘          │
│        │                                                          │
│   Node-Cron Scheduler                                             │
│   ├── Every Monday 08:00 IST → Sync all APIs + Generate Insight  │
│   └── Every Hour             → Sync news for all users           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     MongoDB Atlas                                 │
│                                                                   │
│   users │ githubstats │ weather │ news │ insights                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
insightify/
│
├── backend/
│   ├── config/
│   │   ├── db.js                   # MongoDB Atlas connection
│   │   └── firebase.js             # Firebase Admin SDK init
│   │
│   ├── controllers/
│   │   ├── authController.js       # Login/register via Firebase token
│   │   ├── githubController.js     # GitHub connect, sync, disconnect
│   │   ├── weatherController.js    # Weather fetch (lat/lon + city fallback)
│   │   ├── newsController.js       # News fetch & cache
│   │   ├── insightController.js    # AI insight generation & history
│   │   └── userController.js       # User profile CRUD
│   │
│   ├── jobs/
│   │   └── cronJobs.js             # Weekly insight + hourly news cron
│   │
│   ├── middleware/
│   │   └── authMiddleware.js       # Firebase ID token verification
│   │
│   ├── models/
│   │   ├── User.js                 # uid, email, githubUsername, lat, lon
│   │   ├── GithubStats.js          # repos, stars, languages, commits
│   │   ├── Weather.js              # current conditions + 5-day forecast
│   │   ├── News.js                 # tech articles array
│   │   └── Insight.js              # AI-generated content + dataSnapshot
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── githubRoutes.js
│   │   ├── weatherRoutes.js
│   │   ├── newsRoutes.js
│   │   ├── insightRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── scripts/
│   │   └── fixIndexes.js           # One-time DB index repair utility
│   │
│   ├── services/
│   │   ├── githubService.js        # GitHub API: repos, commits, languages
│   │   ├── weatherService.js       # OpenWeather: current + forecast
│   │   ├── newsService.js          # NewsAPI: tech headlines
│   │   └── insightService.js       # Gemini AI + fallback template
│   │
│   ├── server.js                   # Express app entry point
│   ├── .env.example                # Environment variable template
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx           # Sidebar + outlet wrapper
    │   │   ├── InsightBanner.jsx    # Weekly AI insight hero banner
    │   │   ├── NewsCard.jsx         # Article card (compact + full)
    │   │   ├── LoadingScreen.jsx    # Full-screen loader
    │   │   └── UI.jsx               # Card, StatCard, LangBar, DotLoader…
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx      # Firebase auth state + Google OAuth
    │   │
    │   ├── hooks/
    │   │   └── useData.js           # useGithub, useWeather, useNews, useInsight
    │   │
    │   ├── pages/
    │   │   ├── LoginPage.jsx        # Google sign-in
    │   │   ├── DashboardPage.jsx    # Overview of all data
    │   │   ├── GithubPage.jsx       # Connect GitHub + full analytics
    │   │   ├── WeatherPage.jsx      # Weather + 5-day forecast
    │   │   ├── NewsPage.jsx         # Tech news feed
    │   │   ├── InsightPage.jsx      # AI insight + custom chat + history
    │   │   ├── ActivityPage.jsx     # Commits heatmap + system status
    │   │   └── SettingsPage.jsx     # Profile + city + location detect
    │   │
    │   ├── services/
    │   │   ├── firebase.js          # Firebase web SDK init
    │   │   └── api.js               # Axios instance + all API helpers
    │   │
    │   ├── App.jsx                  # Router + protected/public routes
    │   ├── main.jsx                 # React entry point
    │   └── index.css                # Tailwind directives + global styles
    │
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A **MongoDB Atlas** account (free tier works)
- A **Firebase** project with Google Authentication enabled
- A **GitHub** Personal Access Token (`read:user`, `public_repo` scopes)
- An **OpenWeather** API key — [openweathermap.org](https://openweathermap.org/api)
- A **News API** key — [newsapi.org](https://newsapi.org)
- A **Google Gemini** API key — [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/insightify.git
cd insightify
```

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and fill in all values:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/insightify

# Firebase Admin SDK
# Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# GitHub API
# Generate at: https://github.com/settings/tokens/new
# Required scopes: read:user, public_repo
GITHUB_TOKEN=ghp_your_token_here

# OpenWeather API — https://openweathermap.org/api
OPENWEATHER_API_KEY=your_key_here
DEFAULT_CITY=Mumbai

# News API — https://newsapi.org
NEWS_API_KEY=your_key_here

# Google Gemini AI — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# CORS — must match your frontend URL exactly
FRONTEND_URL=http://localhost:5173
```

```bash
# Start development server
npm run dev

# Start production server
npm start
```

The backend will be available at `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Open `frontend/.env` and fill in your Firebase web config:  
*(Firebase Console → Project Settings → Your Apps → Web app)*

```env
VITE_API_BASE_URL=http://localhost:5000/api

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:5173`

---

### 4. Enable GitHub OAuth in Firebase *(optional)*

If you want GitHub sign-in as a future feature:
1. Firebase Console → Authentication → Sign-in method
2. Enable **GitHub** provider
3. Add your GitHub OAuth App credentials

---

### 5. First Run Checklist

After starting both servers:

- [ ] Open `http://localhost:5173`
- [ ] Sign in with **Google**
- [ ] Go to **GitHub Stats** → enter your GitHub username → click **Connect**
- [ ] Allow **location access** when prompted (for real-time weather)
- [ ] Go to **AI Insights** → click **Generate Weekly Insight**
- [ ] Explore the dashboard!

---

## 🔌 API Reference

All endpoints except `/api/health` require a `Authorization: Bearer <firebase_id_token>` header.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Create or update user from Firebase token |
| `GET` | `/api/auth/me` | Get current authenticated user |

### GitHub
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/github/stats` | Get cached GitHub stats (auto-fetch if stale) |
| `POST` | `/api/github/sync` | Force re-fetch GitHub data |
| `POST` | `/api/github/connect` | Link a GitHub username to this account |
| `DELETE` | `/api/github/disconnect` | Unlink GitHub from this account |

> **Connect endpoint** enforces a 1:1 mapping — a GitHub username can only be linked to one Insightify account at a time.

### Weather
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/weather?lat=&lon=` | Get weather by coordinates or stored city |
| `POST` | `/api/weather/sync` | Force refresh weather data |

### News
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/news` | Get cached tech headlines |
| `POST` | `/api/news/sync` | Force refresh news feed |

### AI Insights
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/insight` | Get latest AI insight |
| `GET` | `/api/insight/history?limit=10` | Get all past insights |
| `POST` | `/api/insight/generate` | Generate a new weekly insight |
| `POST` | `/api/insight/custom` | Generate insight from a custom prompt |

### User
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/profile` | Get user profile |
| `PATCH` | `/api/user/profile` | Update display name, city, lat/lon |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check (no auth required) |

---

## 🗄 Database Schema

### `users`
```js
{
  uid:             String,   // Firebase UID (unique)
  email:           String,
  displayName:     String,
  photoURL:        String,
  githubUsername:  String,   // Set via /github/connect
  githubToken:     String,   // Optional PAT for higher rate limits
  githubConnected: Boolean,
  city:            String,   // Fallback city for weather
  lat:             Number,   // Saved from geolocation
  lon:             Number,
  lastLogin:       Date,
  createdAt:       Date,
  updatedAt:       Date
}
```

### `githubstats`
```js
{
  uid:           String,
  username:      String,
  totalRepos:    Number,
  totalStars:    Number,
  totalForks:    Number,
  followers:     Number,
  following:     Number,
  languages:     Map<String, Number>,   // { JavaScript: 8, Python: 3 }
  topRepos:      [{ name, description, stars, forks, language, url }],
  weeklyCommits: Number,
  recentCommits: [{ repo, message, sha, date, url }],
  fetchedAt:     Date
}
```

### `weather`
```js
{
  uid:     String,
  city:    String,
  country: String,
  lat:     Number,
  lon:     Number,
  current: {
    temp, feelsLike, humidity, windSpeed, windDir,
    pressure, visibility, description, icon, sunrise, sunset
  },
  forecast: [{ date, tempMax, tempMin, description, icon, humidity, windSpeed }],
  fetchedAt: Date
}
```

### `news`
```js
{
  uid: String,
  articles: [{
    title, description, url, source, author,
    publishedAt, urlToImage, category
  }],
  fetchedAt: Date
}
```

### `insights`
```js
{
  uid:      String,          // Multiple insights per user allowed
  content:  String,          // AI-generated text
  prompt:   String,          // Prompt used to generate
  model:    String,          // 'gemini-1.5-flash' or 'fallback-template'
  type:     'weekly'|'custom',
  weekOf:   Date,
  dataSnapshot: {
    commits, repos, stars, city, temp, newsCount
  },
  createdAt: Date
}
```

---

## ⏰ Scheduled Jobs

Configured in `backend/jobs/cronJobs.js` using **Node-Cron**:

| Job | Schedule | What it does |
|---|---|---|
| **Weekly Insight** | Every Monday at 08:00 IST | Syncs GitHub + Weather + News for all users, then generates a Gemini AI insight for each |
| **Hourly News Sync** | Every hour at `:00` | Fetches fresh tech headlines and updates all users' news collections |

Timezone: `Asia/Kolkata` (IST)

---

## 🔐 Authentication Flow

```
1. User clicks "Continue with Google"
       │
       ▼
2. Firebase client SDK opens Google OAuth popup
       │
       ▼
3. Firebase returns an ID Token to the frontend
       │
       ▼
4. Axios interceptor attaches token:
   Authorization: Bearer <id_token>
       │
       ▼
5. Backend verifyToken middleware calls:
   admin.auth().verifyIdToken(token)
       │
       ▼
6. Decoded user { uid, email, name } attached to req.user
       │
       ▼
7. User created or updated in MongoDB
       │
       ▼
8. All subsequent API calls auto-attach fresh tokens
   (Axios request interceptor calls user.getIdToken())
```

---

## 💡 Key Design Decisions

**1. One GitHub account → one Insightify account**  
Before saving a GitHub username, the backend checks if it's already linked to a different `uid`. Returns HTTP 409 with a descriptive error if so. This prevents data overlap and ensures each user's stats are truly personal.

**2. Geolocation-first weather**  
The frontend requests browser GPS coordinates on load and passes `lat`/`lon` directly to the OpenWeather API. Coordinates are persisted to the user's profile so subsequent loads skip the permission prompt. Falls back to stored city name if location is denied.

**3. Smart caching with TTL**  
Rather than hitting external APIs on every request, data is stored in MongoDB with a `fetchedAt` timestamp. Controllers check freshness before deciding whether to re-fetch (GitHub: 1 hour, Weather: 30 minutes, News: 1 hour). This stays within free-tier API rate limits.

**4. AI fallback logic**  
If Gemini AI fails or is not configured, `insightService.js` generates a structured template-based insight using the same data. The UI labels it `fallback-template` so users know. This means the platform is always functional even without a valid AI key.

**5. Always INSERT insights (never upsert)**  
Each call to `/api/insight/generate` creates a new document — never updates an existing one. This builds a full history timeline and avoids the MongoDB duplicate-key errors that upsert operations on unindexed fields can trigger.

**6. Token security**  
`githubToken` (Personal Access Token) is excluded from all user-facing API responses using `.select('-githubToken')`. It is only used server-side when calling the GitHub API to increase rate limits.

---

## 🔮 Future Scope

- [ ] **Productivity Scoring** — algorithmic score based on commit frequency, streak, and diversity
- [ ] **Email Delivery** — weekly insight delivered to your inbox every Monday
- [ ] **Google Calendar Integration** — sync coding goals to your calendar
- [ ] **GitHub Streak Tracking** — contribution streak with visual milestones
- [ ] **Multi-city Weather** — track weather for multiple locations
- [ ] **Team Dashboard** — aggregate insights across an engineering team
- [ ] **Export Insights** — download as PDF or share as a public link
- [ ] **Dark Mode** — full dark theme support

---

## 👤 Author

**Kunal Kumar**  
Full Stack Developer · Ajmer, Rajasthan, India  

[![GitHub](https://img.shields.io/badge/GitHub-imkk21-181717?style=flat-square&logo=github)](https://github.com/imkk21)

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use it for learning, portfolio, and capstone purposes.

```
MIT License — Copyright (c) 2025 Kunal Kumar
```

---

<div align="center">

Built with ❤️ as a Capstone Project

**React · Node.js · MongoDB · Firebase · Google Gemini AI**

</div>
