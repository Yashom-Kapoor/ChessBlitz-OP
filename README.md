# ♟️ ChessBlitz

A mobile chess-training app. Players solve tactics puzzles, work through lessons, earn currency,
and spend it on board themes. Built by the club as a full-stack project: a React Native app talking
to a Python API backed by Supabase.

**New here? Read [Getting started](#getting-started), then [Pick a first issue](#good-first-tasks).**

---

## What's in this repo

This is a monorepo. Four top-level folders, but **only two are alive**:

| Folder | Status | What it is |
|---|---|---|
| `frontend-expo/` | ✅ **Active** | The mobile app. React Native + Expo SDK 57. This is "the app". |
| `new-backend/` | ✅ **Active** | The API. Flask + Supabase. Despite the name, this is *the* backend. |
| `frontend-web/` | 🧊 Dormant | An earlier web client. Untouched since Apr 2026. Don't start here. |
| `backend/` | ⚰️ Dead | The original Firebase backend, replaced by `new-backend/`. Kept for reference only. |
| `data/` | 📓 Notebooks | Jupyter notebooks used to build the puzzle datasets. |

> **Heads up:** `backend/` and `new-backend/` both exist and both look plausible. Always use
> `new-backend/`. If you `cd backend` and get confused, that's why.

## Architecture

```
┌─────────────────┐        HTTP + Bearer JWT        ┌──────────────────┐
│  frontend-expo  │ ──────────────────────────────► │   new-backend    │
│  (React Native) │                                 │     (Flask)      │
└────────┬────────┘                                 └────────┬─────────┘
         │                                                   │
         │  signs in directly (supabase-js)                   │  reads/writes
         │                                                   │  as the user
         └──────────────────► ┌──────────────┐ ◄─────────────┘
                              │   Supabase   │
                              │ auth + data  │
                              └──────────────┘
```

The important idea: **the app authenticates with Supabase directly**, gets a JWT, and sends it to
the Flask API as `Authorization: Bearer <token>`. The API verifies that token and then queries
Supabase *as that user*, so Supabase's row-level security decides what they can see. The backend
is not a second login system — it's a trusted middle layer.

## Getting started

You need **three things running**: Supabase credentials, the backend, and the app.

### 0. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | 20+ | For the app |
| [uv](https://github.com/astral-sh/uv) | latest | Python package manager for the backend |
| Python | 3.12 | uv installs this for you |
| Xcode | 16+ | **macOS only.** Needed for the iOS simulator |
| Android Studio | latest | Only if you're on Windows/Linux, or want Android |

Ask in the club chat for the `.env` values — they are **not** in the repo, and never should be.

### 1. Backend

```bash
cd new-backend
uv sync
```

Create `new-backend/.env` (copy `.env.example` and fill it in):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_anon_key
OPEN_ROUTER_KEY=your_openrouter_key
```

Run it:

```bash
uv run backend
```

Check it worked — this should return `401`, not a connection error:

```bash
curl -i http://127.0.0.1:5000/shop/prices
```

`401` means the server is up and correctly refusing an unauthenticated request. 

### 2. App

```bash
cd frontend-expo
npm install
```

Create `frontend-expo/.env`:

```env
EXPO_SUPABASE_URL=https://xxxx.supabase.co
EXPO_SUPABASE_KEY=your_anon_key
```

Then build and launch. **The first run takes 5–15 minutes** — it compiles the whole native project:

```bash
npx expo run:ios
```

Every run after that, just start the dev server and press `i`:

```bash
npx expo start
```

Only re-run `expo run:ios` when a **native dependency** changes (something in `package.json`
starting with `expo-` or `react-native-`). Editing your own `.tsx` files never needs it — save the
file and the app hot-reloads.

## How the app is organized

`frontend-expo/` uses [Expo Router](https://docs.expo.dev/router/introduction), where **the file
tree is the navigation tree**. A file at `app/auth/log_in.tsx` is the route `/auth/log_in`.

```
frontend-expo/
├── app/                      # Screens (= routes)
│   ├── index.tsx             #   landing / sign-in choice
│   ├── _layout.tsx           #   root layout: providers, Stack, header styling
│   ├── auth/                 #   log_in, sign_up
│   ├── (tabs)/               #   the 5 main tabs; parens = grouping, not a URL segment
│   │   ├── _layout.tsx       #     picks phone vs tablet tab bar
│   │   └── puzzles|lessons|ranking|shop|profile.tsx
│   ├── puzzles/              #   demo_puzzle
│   └── lessons/[lesson].tsx  #   dynamic route: [lesson] is a URL parameter
├── api/                      # One file per backend area. All fetch calls live here.
├── context/                  # React Context: User, Shop, Theme, GlobalStyle
├── components/               # Reusable UI
├── constants/                # urls.tsx (API base), Themes
└── lessons/                  # Lesson content as markdown
```

**Conventions worth following:**

- **Never `fetch()` from a screen.** Add a function to `api/` and call that. Every file in `api/`
  follows the same shape: get the session, attach the bearer token, check `res.ok`, return JSON.
- **Server data goes in a Context, not local state.** `ShopContext` and `UserContext` already
  handle loading + error catching. A screen that keeps its own copy will drift out of sync.
- **Use the theme.** `useTheme()` gives you colors; `GlobalStyle` gives you shared text styles.
  Hard-coded hex values break the 20+ board themes.

## API reference

Base URL in development: `http://127.0.0.1:5000`

🔒 = requires `Authorization: Bearer <supabase_jwt>`

| Method | Route | Auth | Purpose |
|---|---|:--:|---|
| GET | `/users/me` | 🔒 | Current user's profile |
| GET | `/puzzles/random/` | 🔒 | A random puzzle |
| GET | `/puzzles/<id>/` | 🔒 | One puzzle |
| POST | `/puzzles/completed` | 🔒 | Record an attempt, update Elo |
| GET | `/puzzles/<id>/hints/<n>` | ⚠️ | AI hint for move `n` (calls OpenRouter) |
| GET | `/lessons`, `/lessons/<name>` | ⚠️ | Lesson content |
| POST/PUT/DELETE | `/lessons`, `/lessons/<name>` | ⚠️ | Create / edit / delete a lesson |
| GET | `/shop/me` | 🔒 | Currency + which items are unlocked |
| GET | `/shop/prices` | 🔒 | Item prices |
| PUT | `/shop/<item>` | 🔒 | Buy an item |
| GET/PATCH | `/teachers/<uid>` | 🔒 | Teacher profile |
| POST/GET/DELETE | `/classrooms...` | 🔒 | Classroom management |
| GET | `/leaderboards/<classroom>/<sort>` | 🔒 | Rankings |

⚠️ = **currently unauthenticated.** See [Known issues](#known-issues).

## Known issues

Good first contributions, roughly easiest to hardest:

1. **`EXPO_API_BASE_URL` is dead config.** It's in `.env` but nothing reads it.
   `constants/urls.tsx` hard-codes the URL with the production one commented out — so switching
   environments means editing a tracked file, which causes merge conflicts and wrong-URL commits.
   *Fix: read it from the environment.*
2. **Hint and lesson routes are unauthenticated.** `POST/PUT/DELETE /lessons` lets anyone change
   lesson content, and `/puzzles/<id>/hints/<n>` lets anyone burn OpenRouter credits.
   *Fix: add `@require_auth`; the decorator already exists.*
3. **`react-native-fs` is unmaintained** and untested on the New Architecture (`npx expo-doctor`
   flags it). *Fix: migrate to `expo-file-system`.*
4. **No tests.** `jest-expo` is installed and configured but there are zero test files.
5. **No CI.** Nothing runs `tsc` or the linter on a PR.

## Troubleshooting

<details>
<summary><b>Port 5000 returns something weird (<code>Server: AirTunes</code>)</b></summary>

macOS AirPlay Receiver squats on port 5000. Turn it off in
**System Settings → General → AirDrop & Handoff**, or run the backend on another port and update
`constants/urls.tsx`.
</details>

<details>
<summary><b><code>npx expo</code> wants to download a package</b></summary>

You're in the wrong directory. `npx` only finds the local CLI from inside `frontend-expo/`.
Cancel and `cd frontend-expo` first.
</details>

<details>
<summary><b>"No iOS devices available in Simulator.app"</b></summary>

Xcode ships without simulator runtimes; they're a separate download. Check with
`xcrun simctl list runtimes` — if no iOS runtime is listed, install one via
**Xcode → Settings → Components**.
</details>

<details>
<summary><b>CocoaPods crashes with <code>Encoding::CompatibilityError</code></b></summary>

Your shell has no UTF-8 locale. Prefix the command:
`LANG=en_US.UTF-8 pod install`
</details>

<details>
<summary><b>The app builds but shows a stale screen / weird errors</b></summary>

Clear the Metro cache: `npx expo start --clear`. If that fails, delete `node_modules`, reinstall,
and rebuild.
</details>

<details>
<summary><b>Native code changed and now nothing works</b></summary>

Regenerate the iOS project: `npx expo prebuild --platform ios --clean`, then
`cd ios && LANG=en_US.UTF-8 pod install`. This **overwrites** `ios/`, so don't hand-edit files
there — put native config in `app.config.js` instead.
</details>

## Contributing

1. **Branch off `main`.** Name it `yourname/what-it-does`.
2. **Never commit `.env`.** It's gitignored — keep it that way. If you leak a key, say so
   immediately so it can be rotated. It happens; hiding it is the only real mistake.
3. **Typecheck before you push:** `cd frontend-expo && npx tsc --noEmit`
4. **Open a PR** and tag a reviewer. Describe what you changed and how you tested it.
5. **Don't commit `ios/` churn** unless you meant to. Regenerating it touches many files.

Questions are welcome in the club chat — asking early is cheaper than a day spent stuck.
