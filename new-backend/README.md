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

## Code layout

`app.py` is one long file, organized by section markers:

| Section | Contents |
|---|---|
| `SETUP` | Supabase client, env loading, CORS |
| `AUTHORIZATION` | `get_bearer_token`, `get_supabase_with_auth`, `@require_auth` |
| `HELPER FUNCTIONS` | Database logic, grouped by area (users, puzzles, shop, classrooms) |
| `FLASK ROUTES` | The HTTP endpoints, thin wrappers over the helpers |

Keep that split: **routes stay thin, logic goes in a helper.** It keeps things testable and makes
the route list readable.

Splitting `app.py` into blueprints is a worthwhile project once you're comfortable with it.
