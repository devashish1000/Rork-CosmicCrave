# CosmicCrave Beta App

**React Native only** (Expo). This is the single CosmicCrave app: scan flow, meal plan, cookbooks, shopping, profile. No web client in this repo.

## Run locally

```bash
npm install
npm start
```

Then open in iOS Simulator, Android emulator, or scan the QR code with Expo Go.

## Scripts

- `npm start` – start Expo dev server
- `npm run lint` – run ESLint

## Env

Copy `.env.example` to `.env` and set any API keys (e.g. Supabase) if needed.

## Note

The previous web client (Vite/React) was backed up to `client-web-backup/`. This project is React Native only. Server, supabase, and script folders remain for backend/infra if you use them.
