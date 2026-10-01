# ChessBlitz — mobile app

React Native + [Expo SDK 57](https://docs.expo.dev), using
[Expo Router](https://docs.expo.dev/router/introduction) for navigation.

See the [root README](../README.md) for architecture, the API reference, and troubleshooting.

## Setup

```bash
npm install
cp .env.example .env    # then fill in the real values
```

**First run** builds the native project — expect 5–15 minutes:

```bash
npx expo run:ios
```

**Every run after that** — start the dev server and press `i`:

```bash
npx expo start
```

The backend needs to be running too, or every screen will fail to load data. See
[`new-backend/`](../new-backend/README.md).

### When do I need to rebuild?

| You changed | What to run |
|---|---|
| Any `.tsx` / `.ts` file | Nothing — it hot-reloads on save |
| A native dep (`expo-*`, `react-native-*`) | `npx expo run:ios` |
| `app.config.js` | `npx expo prebuild --platform ios --clean`, then rebuild |

## Project layout

With Expo Router, **the file tree is the navigation tree** — a file at `app/auth/log_in.tsx`
is the route `/auth/log_in`.

```
app/                      # Screens (= routes)
├── _layout.tsx           #   root: providers, Stack, shared header styling
├── index.tsx             #   landing
├── auth/                 #   log_in, sign_up
├── (tabs)/               #   the 5 tabs — parens group files without adding a URL segment
│   ├── _layout.tsx       #     chooses phone vs tablet tab bar
│   └── puzzles|lessons|ranking|shop|profile.tsx
├── puzzles/demo_puzzle.tsx
└── lessons/[lesson].tsx  #   square brackets = URL parameter

api/          # One file per backend area — ALL fetch calls live here
context/      # React Context: User, Shop, Theme, GlobalStyle
components/   # Reusable UI (+ puzzles/, lessons/, rankings/, ui/ subfolders)
constants/    # urls.tsx (API base), Themes
lessons/      # Lesson content as markdown
ios/          # Generated native project — do not hand-edit
```

## Conventions

**Never `fetch()` directly from a screen.** Add a function to `api/` instead. They all follow one
shape:

```ts
export async function getShopData() {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("No session");

  const res = await fetch(`${API_URL}/shop/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    throw new Error(`GET /shop/me failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}
```

Include the status and body in the error. `"Failed to fetch"` tells you nothing at 2am.

**Server data belongs in a Context.** `ShopContext` and `UserContext` already load and
error-handle. A screen keeping its own copy will drift out of sync and can crash on an unhandled
rejection.

**Use the theme system.** `useTheme()` for colors, `GlobalStyle` for text styles. Hard-coded hex
values break the 20+ board themes users can buy.

**Glass/blur surfaces** go through `GlassBlurView`, which falls back gracefully when Liquid Glass
isn't available. If you need `position: absolute` covering a parent, use `StyleSheet.absoluteFill`
— `absoluteFillObject` was removed in React Native 0.86.

## Before you push

```bash
npx tsc --noEmit
```

Useful when something looks broken in ways that aren't your fault:

```bash
npx expo-doctor          # checks dependency versions against the SDK
npx expo start --clear   # clears the Metro cache
```
