# How to run Solace AI

You need two things running at the same time: the **backend** (API + database)
and the **app** (Expo).

## Easiest way (Windows)

1. Open the project folder:
   `C:\Users\SWETHA\.gemini\antigravity\scratch\solace-ai`
2. Double-click **`START_SOLACE.bat`**.
3. Two black windows open:
   - **Solace API** – the backend. Leave it open.
   - **Solace AI** – the app. Wait for it to finish starting.
4. In the **Solace AI** window:
   - press **`w`** to open the app in your browser, **or**
   - scan the **QR code** with **Expo Go** on your phone.

## Running it by hand

Terminal 1:

```bash
cd server
npm run dev
```

You should see:

```
Solace AI API running at http://localhost:4000
AI provider: fallback (no GROQ_API_KEY)
```

Terminal 2 (in the project folder, not in `server`):

```bash
npx expo start
```

Then press `w`, or scan the QR code with Expo Go.

## Using it on your phone

1. Install **Expo Go** from the Play Store / App Store.
2. Your phone and laptop must be on the **same Wi-Fi**.
3. Scan the QR code shown in the Expo window.
4. If the app loads but chat says it can't reach the server, Windows
   Firewall is probably blocking port **4000**. Allow Node.js on private
   networks, or temporarily turn the firewall off for the demo.

## Making the AI real

The AI currently uses gentle built-in replies. To use the real AI:

1. Get a free key at https://console.groq.com/keys
2. Open `server/.env` and put it after `GROQ_API_KEY=`:

   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

3. Restart the **Solace API** window (`Ctrl+C`, then `npm run dev`).

You should then see `AI provider: Groq` instead of `fallback`.

## If something is already running

Only run this once. If you double-click the launcher while the windows are
already open, you will get "port already in use" errors. In that case just use
the windows that are already open.

## What you should see

Splash → Welcome → Onboarding → Sign up / Log in / Continue as guest → Home,
with four tabs at the bottom: **Haven · Solace AI · Breathe · You**.
