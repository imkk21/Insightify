<div align="center">

# Insightify.

### AI-Powered Personalized Developer Insight Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

A developer dashboard that combines your GitHub activity, local weather and tech news, and turns them into a weekly AI-written insight.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Google sign-in** | Firebase Authentication; every API call is verified server-side with Firebase Admin |
| 🔗 **GitHub analytics** | Repos, stars, forks, language breakdown, your recent commits and a productivity score |
| 🤖 **AI insights** | Weekly Gemini summary of your GitHub, weather and news data, plus free-form questions |
| 🧑‍💻 **Code assistant** | Paste a snippet, get a Gemini refactor with explanation |
| 🌤️ **Weather** | Current conditions and 5-day forecast from OpenWeather, using browser location |
| 📰 **Tech news** | Technology headlines from NewsAPI, refreshed hourly |
| 🎵 **Music** | Connect Spotify, pick a playlist, and play it in a draggable floating player |
| ✅ **Tasks** | Simple three-column task board |

---

## 🛠 Tech Stack

**Frontend** — React 18, Vite 5, Tailwind CSS, Framer Motion, Recharts, Lucide icons, Firebase Auth SDK. Deployed on Vercel.

**Backend** — Node.js, Express, MongoDB Atlas (Mongoose), Firebase Admin, Google Gemini (`@google/generative-ai`), node-cron. Deployed on Render.

---

## 📁 Project Structure

```
insightify/
├── backend/
│   ├── config/        # MongoDB + Firebase Admin setup
│   ├── controllers/   # Route handlers
│   ├── jobs/          # Cron: hourly news, weekly insights (Mon 08:00 IST)
│   ├── middleware/    # Firebase token verification
│   ├── models/        # Mongoose schemas
│   ├── routes/
│   ├── services/      # GitHub, OpenWeather, NewsAPI, Gemini clients
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Layout, UI kit, floating music player, …
        ├── context/     # Auth + Spotify state
        ├── hooks/       # Data hooks (useGithub, useWeather, …)
        ├── pages/
        └── services/    # Axios API client, Firebase init
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Accounts/keys for: MongoDB Atlas, Firebase (web app + service account), GitHub token, OpenWeather, NewsAPI, Google Gemini, Spotify Developer app

### Setup
```bash
# 1. Install
cd backend  && npm install
cd ../frontend && npm install

# 2. Environment: copy the examples and fill in your keys
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env

# 3. Run (two terminals)
cd backend  && npm run dev     # http://localhost:5000/api/health
cd frontend && npm run dev     # http://localhost:5173
```

Each variable is documented in [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).
For Spotify, add your `SPOTIFY_REDIRECT_URI` to the app's Redirect URIs in the Spotify dashboard.
Cron jobs only run when `NODE_ENV` is not `development`.

---

## 🚀 Future Scope

- **IDE integration**: a VS Code extension bringing insights into the editor.
- **Team dashboards**: aggregate momentum across an engineering team.
- **Automated summaries**: AI pull-request and changelog summaries from weekly commits.
- **Mobile app**: push notifications for weekly insights.

---

## 👤 Author

**Kunal Kumar**
Full Stack Developer · Udaipur, Rajasthan, India

---

## 📄 License

MIT License — Copyright (c) 2026 Kunal Kumar
