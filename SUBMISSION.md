# Solace AI — submission pack

## Tagline
A calm AI companion for the moments between.

## Short description (about 120 words)
Solace AI is a warm, quiet wellness companion for the moments when life feels loud.
Instead of another dashboard, it opens with a soft welcome and a single question: how
are you, really? From there it offers a short check-in, a gentle affirmation, a private
journal, a grounding minute, a gratitude jar, an evening wind-down, and a real
conversation when you need to talk. The chat is powered by a large language model with
a deliberately gentle persona — it never diagnoses, never lectures, and keeps replies
short. Voice input lets someone speak instead of type, and three optional reminders
check in through the day. Everything personal stays with the person; nothing is sold,
scored, or gamified.

## What is actually built
- Expo SDK 58 / React Native app, hand-built design system (Fraunces + warm cream palette)
- Node + Express + SQLite backend: accounts, JWT auth, conversations, messages, moods
- Groq (`openai/gpt-oss-120b`) with a persona prompt, emoji stripping, and safe fallbacks
- Real speech recognition (native + web) and spoken replies
- Local notifications with deep links to the right screen
- Onboarding, auth, home, chat, breathe, profile — full journey, no dead ends

## Demo video script (target 75–90 seconds)

| Time | Shot | Say |
|---|---|---|
| 0:00 | Welcome cover | "This is Solace. It doesn't ask you to optimise anything." |
| 0:08 | Onboarding, slow pan | "A short, quiet onboarding — moon, water, three questions." |
| 0:18 | Home | "Home starts with how you actually feel." |
| 0:24 | Tap a mood, show the next-step card | "It answers with one gentle next step, not a lecture." |
| 0:32 | Affirmation / daily question | "A small affirmation, one question, answerable privately." |
| 0:42 | Chat: type "Hi", then "I'm anxious about tomorrow" | "And when you want to talk, it's a real conversation." |
| 1:00 | Voice: hold the light, speak, hear reply | "You can speak instead of type." |
| 1:12 | Breathe page, one cycle | "Two minutes of breathing when the body needs it." |
| 1:24 | You page | "Your name, your week, your reminders." |
| 1:32 | Reminder notification tap | "It checks in gently, and opens where it matters." |

Rules: one continuous take or clean cuts, no emojis on screen, keep the phone in
portrait, record narration separately if the room is noisy.

## Submission checklist
- [ ] Public GitHub repo (server + app)
- [ ] APK built against the public backend URL
- [ ] Demo video uploaded (unlisted YouTube / Drive), link public
- [ ] Description + tagline + tech stack entered in the form
- [ ] 3–5 screenshots
- [ ] App icon is not the default Expo icon
- [ ] Backend health check responds from a network that is not yours

## TestFlight (final stage)
TestFlight is iOS-only, so this needs:
- Apple Developer Program membership (the team said they will assist — ask them for
  access to their App Store Connect account, or to add you to the team)
- A **public HTTPS backend** (App Transport Security blocks plain http on iOS)
- An app icon **without transparency**
- EAS iOS build + `eas submit -p ios`, then testers added in App Store Connect

Sequence when the account is ready:
```bash
eas build -p ios --profile production
eas submit -p ios --latest
```
EAS will ask for the Apple ID, app-specific password or App Store Connect API key,
and the team ID. After upload, the build appears in TestFlight after processing.
