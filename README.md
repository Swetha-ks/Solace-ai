# Solace AI

**A calm AI companion for the moments between.**

Solace AI is a mobile wellness app that opens with a soft welcome and a single question: *how are you, really?* No dashboard, no streak pressure, no score. Just a quiet place to check in, breathe, write, play a minute, or talk when you need to.

Built solo with React Native (Expo SDK 58) and a Node.js + Express backend powered by Groq.

---

## Live links

| | |
|---|---|
| **Android APK** | [Download the signed preview build](https://expo.dev/artifacts/eas/R0F__hHDGH0teezpDTgy8wU5qb-qFoiBCJpRn8lOsTc.apk) |
| **Backend API** | https://solace-ai-api-40bu.onrender.com |
| **Health check** | https://solace-ai-api-40bu.onrender.com/api/health |
| **Repository** | https://github.com/Swetha-ks/Solace-ai |

The backend runs on Render's free tier, so the first request after 15 minutes of idle time can take 30–60 seconds while it wakes up. The app shows a "server waking up" message and retries instead of failing.

---

## Features

- **Welcome and onboarding** — a hand-built cover, a short onboarding flow, then sign up, log in, or continue as a guest.
- **Home companion** — a greeting with your name, a live status, and gentle chips for your streak, habits kept and journal lines.
- **Mood check-in** — one tap on a mood and the app answers with a single next step. Nothing is revealed until you choose.
- **AI conversation** — a real chat backed by Groq with a non-clinical persona. Short replies, no diagnosis, no lecturing.
- **Voice** — real microphone input with `expo-speech-recognition` (Web Speech API on web) and spoken replies with `expo-speech`.
- **Breathe** — a guided breathing screen for grounding.
- **Private journal and gratitude jar** — stored on the device only.
- **Habits and reminders** — custom habits with a suggestion list, plus gentle local notifications.
- **A minute to play** — "Grow a little garden": nine patches, tap to move from seed to sprout to leaf to flower. No score, no timer, nothing can be lost.
- **Five languages** — English, Hindi, Kannada, Tamil and Spanish, persisted locally and used by the AI replies.
- **Zero emojis** anywhere in the interface.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native 0.88.1, Expo SDK 58, React 19.3, JavaScript |
| UI | Hand-built design system, Fraunces (Google Fonts), `lucide-react-native`, `expo-linear-gradient`, `react-native-svg`, `react-native-safe-area-context`, `expo-haptics` |
| Voice | `expo-speech-recognition`, Web Speech API, `expo-speech` |
| Local storage | `@react-native-async-storage/async-storage` |
| Notifications | `expo-notifications` |
| Web | `react-native-web`, Expo web export |
| Backend | Node.js, Express 4 |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| AI | Groq API, model `openai/gpt-oss-120b`, JSON-mode replies |
| Build | EAS Build (signed Android APK) |
| Hosting | Render (backend), GitHub (source) |

---

## Screens

Splash → Welcome → Onboarding → Sign up / Log in / Guest → Home, with four tabs:

- **Haven** — companion hero, mood check-in, affirmation, gratitude, journal, habits, the garden game, wind-down and support tools
- **Solace AI** — conversation list and chat, with voice
- **Breathe** — guided breathing
- **You** — profile, settings, language, reminders

---

## Project structure

```
solace-ai/
├── App.js                  # App shell, navigation, auth boot, providers
├── index.js                # Expo entry point
├── app.json                # Expo config, icons, splash, versionCode
├── eas.json                # EAS build profiles and API URL per profile
├── render.yaml             # Render blueprint for the backend
├── src/
│   ├── components/         # Shared UI (icons, mascot, companion, voice modal)
│   ├── lib/                # API client, i18n, notifications
│   ├── screens/            # Welcome, Onboarding, Auth, Home, Chat, Breathe, Profile
│   └── theme/              # Palette, typography, shared tokens
├── assets/                 # Mascot, icons, splash and favicon images
└── server/
    ├── src/
    │   ├── index.js        # Express app, health route, route mounting
    │   ├── db.js           # SQLite schema and connection
    │   ├── groq.js         # Groq client, JSON parsing, retries
    │   ├── prompt.js       # Persona prompt, fallbacks, emoji stripping
    │   ├── middleware/     # JWT auth middleware
    │   └── routes/         # auth, chat, conversations, moods, insights
    └── package.json
```

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- Expo Go on your phone, or an Android emulator
- Optional: a free [Groq API key](https://console.groq.com/keys) for real AI replies

### 1. Backend

```bash
cd server
npm install
npm run dev
```

The API starts on `http://localhost:4000` and creates `server/data/solace.db` on first run. Without a Groq key it serves gentle built-in fallback replies instead of failing.

### 2. App

In a second terminal, from the project root:

```bash
npm install
npx expo start
```

Press `w` for the browser, `a` for Android, or scan the QR code with Expo Go.

### Windows shortcut

Double-click `START_SOLACE.bat` in the project root. It opens both the API and the Expo dev server for you.

Full instructions: [HOW_TO_RUN.md](HOW_TO_RUN.md)

---

## Environment variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | No | Enables real AI. Without it the API uses built-in fallback replies. |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b`. |
| `JWT_SECRET` | Recommended | Signing secret for auth tokens. A development default is used if unset. |
| `PORT` | No | Defaults to `4000`. Render sets this automatically. |

### App

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the backend. Set per profile in `eas.json`; defaults to the local API in development. |

`EXPO_PUBLIC_API_URL` is inlined at build time, so change it before building, not after.

---

## API reference

Base URL: `https://solace-ai-api-40bu.onrender.com`

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service status and active AI provider |
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Log in and receive a JWT |
| `POST` | `/api/auth/guest` | Create a guest session |
| `GET` | `/api/auth/me` | Current user |
| `PATCH` | `/api/auth/me` | Update name or profile fields |
| `POST` | `/api/chat` | Send a message, get a reply, suggested activity and affirmation |
| `GET` | `/api/conversations` | List conversations for the user |
| `POST` | `/api/conversations` | Create a conversation |
| `GET` | `/api/conversations/:id` | Read one conversation with messages |
| `PATCH` | `/api/conversations/:id` | Rename a conversation |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `POST` | `/api/moods` | Save a mood check-in |
| `GET` | `/api/moods` | Mood history |
| `GET` | `/api/moods/today` | Today's mood, if any |
| `GET` | `/api/insights` | Streak, last seven days, affirmation |

Authenticated routes expect `Authorization: Bearer <token>` and are scoped to the signed-in user.

---

## Building the Android APK

The `preview` profile produces an installable, signed APK with the public API URL baked in.

```bash
npx eas-cli@latest build --platform android --profile preview
```

Profiles live in `eas.json`. The native `android/` and `ios/` folders are generated by Expo at build time and are intentionally not committed.

---

## Deployment

The backend deploys to Render using [render.yaml](render.yaml):

- Root directory: `server`
- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`
- `GROQ_API_KEY` is set in the Render dashboard; `JWT_SECRET` is generated by Render

SQLite on the free tier is ephemeral, so accounts and chats reset when the service redeploys. That is acceptable for a demo but not for production; a managed Postgres instance would be the next step.

---

## Privacy

- Journal entries and gratitude notes stay on the device in AsyncStorage.
- Chat messages and mood check-ins are stored on the server, scoped to the signed-in account.
- The Groq API key lives only on the server and is never shipped inside the APK.
- Nothing is sold, scored or gamified.

Solace AI is not a medical product and does not diagnose or treat anything. It is a companion, not a replacement for professional care.

---

## Documentation

- [SUBMISSION.md](SUBMISSION.md) — submission pack, demo script, checklist
- [HOW_TO_RUN.md](HOW_TO_RUN.md) — detailed local setup
- [LICENSE](LICENSE) — MIT

---

Built by [Swetha K S](https://github.com/Swetha-ks).
