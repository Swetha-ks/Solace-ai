# Solace AI — Backend

Node.js + Express + SQLite API for the Solace AI wellness companion, powered by Groq.

## Setup

```bash
cd server
npm install
cp .env.example .env   # then add your GROQ_API_KEY
npm run dev            # http://localhost:4000
```

Get a free Groq API key at https://console.groq.com/keys.

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check + AI provider status |
| POST | `/api/auth/signup` | No | Create an account |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/guest` | No | Create a throwaway guest account |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/conversations` | Yes | List conversations |
| POST | `/api/conversations` | Yes | Create a conversation |
| GET | `/api/conversations/:id` | Yes | Conversation + messages |
| PATCH | `/api/conversations/:id` | Yes | Rename a conversation |
| DELETE | `/api/conversations/:id` | Yes | Delete a conversation |
| POST | `/api/chat` | Yes | Send a message, get an AI reply |
| POST | `/api/moods` | Yes | Save a mood check-in |
| GET | `/api/moods` | Yes | Mood history |
| GET | `/api/moods/today` | Yes | Today's mood |
| GET | `/api/insights` | Yes | Streak, mood stats, daily affirmation |

Authenticated routes expect `Authorization: Bearer <token>`.

## Data

SQLite database lives at `server/data/solace.db`. Delete the file to reset all data.

## Notes

- If `GROQ_API_KEY` is missing, the API still works but falls back to gentle canned replies (the response includes `provider: "fallback"`), so the demo never breaks.
- Default model: `openai/gpt-oss-120b`. Override with `GROQ_MODEL`.
