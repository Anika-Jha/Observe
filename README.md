# OBSERVE

### Look closer. Your neighborhood is alive.

OBSERVE is a digital field notebook for getting outdoors and paying attention. The phone is the notebook, not the experience.

## The problem

Nature is often framed as somewhere else: a forest, a national park, a long trip away. Meanwhile, the everyday ecosystems around homes, sidewalks, small shops, and city trees are easy to miss. Most phone experiences add more screen time instead of helping people put the phone away.

## The solution

OBSERVE gives you a small, deterministic observation prompt, saves it before you leave, and gets out of your way. When you return, write what you noticed. An optional Gemma reflection can help connect that observation to a simple idea for tomorrow.

## Core loop

**Start expedition → put phone away → observe → return → write a field note → optional Gemma reflection → tomorrow’s observation**

## Demo

**Live app:** [Observe](https://observe-5iuk.onrender.com)

## Features

- Daily quests from a deterministic, local library across seven categories.
- 15, 30, or 45 minute expedition timer; the active screen is intentionally quiet.
- Field notes with separate prompts, optional photos, chronological journal, and optional shareable text card.
- Blind Walk prompts, with a clear exit and no maps or location collection.
- Out of Place observations with explicit safety guidance and status tracking.
- Time Capsules with optional broad context and return-visit notes.
- Impact totals computed only from the user’s saved activity.
- Local JSON export and one-step deletion of all browser data.
- Responsive mobile-first layout, with desktop notebook navigation and mobile bottom navigation.

## Gemma integration

Gemma is the only generative model in the app. It runs after the user saves a field note, through a server endpoint. The request contains only the current note text, the walk duration, quest titles, and an expedition ID. It excludes photos and previous journal entries. The model returns a short reflection, one pattern, and one quest for tomorrow.

The API key is read only by the server from `GEMMA_API_KEY`; it is never included in the client bundle. Set `GEMMA_MODEL` to a model name available to your Google Generative Language API key. The endpoint validates input and output, times out after 12 seconds, and caches results by expedition ID for the life of the server process. The browser also saves the note and its returned reflection locally, so reopening a saved entry does not submit it again. This starter uses in-memory server caching; a server restart clears that cache.

## Architecture

- **Client:** React, TypeScript, Vite, and plain responsive CSS.
- **Server:** Express endpoint at `POST /api/reflect`, using Zod for request/response validation.
- **Storage:** Browser `localStorage` (`observe.v1`) for expeditions, notes, reflections, capsules, and Out of Place entries. There is no account or cloud database, so data remains in the current browser and needs to be exported for backup or device transfer.
- **AI:** Server-side Google Generative Language API call to the configured Gemma model. No other generative AI provider is used.

The entities are represented as typed client models for expeditions, quests, field notes, AI reflections, time capsules, and Out of Place observations. The app is single-device and local-first; no sync service or authentication is implemented.

## Privacy and safety decisions

- No sign-up, precise GPS, background tracking, or default location collection.
- Photos are optional and stored in the browser with the rest of the notebook. Photos are not sent to Gemma.
- When Gemma is configured, the current written note, duration, quest titles, and expedition ID are sent to Google for reflection. The Data & Privacy page explains this in the app.
- The app reminds users not to photograph people without permission and never asks users to identify strangers.
- Blind Walk does not disorient users or hide the exit. It does not request location.
- Out of Place prioritizes distance from unknown or hazardous waste; the app does not encourage confrontation, trespass, or risky cleanup.
- Notes can be exported or cleared from the browser in Data & Privacy.

## Why open innovation matters

OBSERVE does not use AI to replace exploration. Gemma acts as a lightweight reflection layer only after a person has already gone outside. An open-weight model can make that reflection adaptable without turning the product into a closed AI chatbot or an always-online recommendation engine. This implementation calls Gemma through a server API; **it does not run local inference and AI reflection requires network access**. The rest of the app remains usable without Gemma.

## Setup

Requires Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env
# Optional: add your GEMMA_API_KEY and set GEMMA_MODEL in .env
npm run dev
```

The Vite client runs at <http://localhost:5173> and proxies `/api` requests to the Express server at port 3000. The app works without a key; it uses a deterministic reflection and tomorrow quest. To run a production build locally:

```bash
npm run build
NODE_ENV=production npm start
```

The production server serves the built site on port 3000 (or `$PORT`).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMMA_API_KEY` | No | Server-only Google Generative Language API key. Without it, the app uses the deterministic fallback. |
| `GEMMA_MODEL` | No | Gemma model identifier available to the key; defaults in `.env.example` to `gemma-4-26b-a4b-it`. |
| `PORT` | No | Express server port; defaults to `3000`. |

## Fallback behavior

If Gemma credentials are absent, the request fails, times out, or returns invalid output, OBSERVE keeps the field note and supplies a deterministic reflection and quest. The timer, prompts, journal, Blind Walk, Out of Place, Time Capsules, and Impact do not depend on AI.

## Limitations and future improvements

- Data is stored in one browser’s local storage; it is not synchronized, encrypted, or recoverable if browser storage is cleared. Export the JSON backup before changing devices.
- Reflection caching on the server is process-local; browser-stored completed notes prevent ordinary repeat submissions, but server cache does not survive a restart.
- Optional photos are stored as browser data URLs, so large images can use local storage quickly.
- The expedition timer updates while the app is open and calculates elapsed time from its saved start time; there is no background notification.
- There is no native speech-to-text, service worker/offline asset cache, or account system.
- A future version could add opt-in encrypted sync and conflict resolution, a service worker with carefully tested offline assets, and device-side database storage for larger photo collections.
