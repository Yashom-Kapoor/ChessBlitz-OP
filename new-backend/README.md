# ChessBlitz API

Flask API backing the ChessBlitz mobile app. Auth and data live in Supabase; AI hints come from
OpenRouter.

See the [root README](../README.md) for the overall architecture.

## Setup

Requires Python 3.12 and [`uv`](https://github.com/astral-sh/uv).

```bash
uv sync
cp .env.example .env    # then fill in the real values
uv run backend
```

Serves on `http://127.0.0.1:5000`. Verify with:

```bash
curl -i http://127.0.0.1:5000/shop/prices
```

A `401` is the correct response — the server is running and refusing an unauthenticated request.
A connection error means it isn't up. (`Server: AirTunes` means macOS AirPlay has taken port 5000.)

## Environment

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | The **anon** key — not the service-role key |
| `OPEN_ROUTER_KEY` | OpenRouter key, for AI hint generation |
| `PORT` | Optional, defaults to `5000` |
| `DEV_TOOLS` | Optional. `1` enables the dev console at `/dev` and its endpoints; anything else makes them 404 |

> Note the name is `OPEN_ROUTER_KEY`, not `OPENROUTER_API_KEY`. Easy to get wrong.

## How auth works

Everything lives in `src/backend/app.py`.

The app signs in with Supabase directly and sends the resulting JWT as
`Authorization: Bearer <token>`. Two pieces handle it:

```python
@require_auth              # verifies the token, sets g.user_id, else 401
def my_route():
    token = get_bearer_token(request)
    supabase = get_supabase_with_auth(token)   # client scoped to THIS user
```

`get_supabase_with_auth` is the important one: it returns a Supabase client authenticated **as the
requesting user**, so row-level security applies automatically. Queries through it can only reach
rows that user is allowed to see.

**When you add a route, add `@require_auth`** unless it is genuinely public. Several existing
routes are missing it — see Known issues in the root README.

## Working with Supabase queries

`.single()` **raises** when a query matches zero rows, which surfaces as a `500`. Use
`.maybe_single()` and handle `None` instead:

```python
res = supabase.table('Shop').select('*').maybe_single().execute()
return res.data if res else None
```

This matters more than it sounds — a brand-new user often has no row yet, and `.single()` turns
that ordinary case into a server error.

## Dev tools

Set `DEV_TOOLS=1` in `.env` and **restart**, then open <http://127.0.0.1:5000/dev>. That is the
dev console: a single self-contained page that manages currency and lets you load any puzzle on a
real board. It replaces the old in-app dev menu, so the Expo app now ships no dev UI at all.

Sign in on the page with your own ChessBlitz account. Everything it does runs as that user through
RLS — there is no service-role key involved, and it cannot touch anyone else's data.

| Route | Body | Does |
|---|---|---|
| `GET /dev` | — | The console itself (HTML) |
| `POST /dev/currency` | `{"set": 50000}` or `{"add": 1000}` | Sets or adjusts the balance; returns the new value |
| `PUT /dev/items` | `{"unlocked": true}` | Unlocks (or re-locks) every item in `Shop-Items` |

All three are gated by `@require_dev`, stacked **above** `@require_auth` so it runs first: with the
flag off they return `404` without looking at the token, so they are indistinguishable from routes
that do not exist. **Never set this in production** — the flag is the only thing protecting them.

`GET /dev` deliberately carries no `@require_auth`: a browser navigation cannot send an
`Authorization` header, so requiring one would make the page unreachable. The page signs in
itself and attaches the token to the calls that follow. The Supabase anon key is rendered into
that page, which is why it must stay behind the gate — it is the same key the mobile bundle
already ships, but there is no reason to hand it out from a server.

The console lives in `src/backend/templates/dev.html`, deliberately in one file with no build
step. It is not split into `static/`, because Flask serves `/static/` regardless of `DEV_TOOLS`
and that would leave the console's JavaScript fetchable with the flag off.

The two write routes call `ensure_shop_row()` first, which creates an empty `Shop` row if the
account has none. Sign-up creates that row now, but accounts made before that fix have none, and
without a row every shop read 404s. The ordinary `/shop/*` routes still report the 404 rather than
hiding it.

A `404` from any of these means the flag is off, not that something is missing.

## Code layout

`app.py` is one long file, organized by section markers:

| Section | Contents |
|---|---|
| `SETUP` | Supabase client, env loading, CORS |
| `AUTHORIZATION` | `get_bearer_token`, `get_supabase_with_auth`, `@require_auth`, `@require_dev` |
| `HELPER FUNCTIONS` | Database logic, grouped by area (users, puzzles, shop, classrooms) |
| `FLASK ROUTES` | The HTTP endpoints, thin wrappers over the helpers |
| `DEV TOOLS` | `DEV_TOOLS`-gated console (`templates/dev.html`) and its endpoints |

Keep that split: **routes stay thin, logic goes in a helper.** It keeps things testable and makes
the route list readable.

Splitting `app.py` into blueprints is a worthwhile project once you're comfortable with it.
