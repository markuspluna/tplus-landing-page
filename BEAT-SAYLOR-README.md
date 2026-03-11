# Beat Saylor — Execution Strategy CTF

An interactive challenge where users propose a $1.28B Bitcoin acquisition strategy and get scored against Michael Saylor's actual March 2-8, 2026 execution.

## How It Works

1. User logs in with Twitter/X OAuth
2. Submits a 500-character execution strategy
3. An AI judge (Claude Sonnet 4.6) evaluates the strategy using real market data
4. Scored on **1-year effective price per BTC** (lower is better)
5. Results appear on a public leaderboard

**Saylor's benchmark:** $73,429/BTC effective (spot at $70,946 + 3.5% opportunity cost on locked capital).

## Architecture

```
Cloudflare Pages
├── Static assets (beat-saylor.html, .css, .js)
└── Pages Functions (/functions/api/)
    ├── auth/login.ts      — Twitter OAuth 2.0 PKCE initiation
    ├── auth/callback.ts   — OAuth callback, session creation
    ├── auth/me.ts         — Current user + rate limit info
    ├── auth/logout.ts     — Session cleanup
    ├── submit.ts          — Strategy submission + AI evaluation
    ├── leaderboard.ts     — Public leaderboard
    ├── judge-prompt.ts    — AI system prompt + embedded market data
    └── types.ts           — Shared types + session helpers

External Services
├── Cloudflare D1        — SQLite database (users, submissions)
├── Cloudflare KV        — Sessions + rate limiting
├── Twitter API          — OAuth 2.0 authentication
└── Anthropic API        — AI judge (Claude Sonnet 4.6)
```

## Cloudflare Configuration

### Bindings (wrangler.toml)

- **D1 database** (`DB`): `beat-saylor-db`
- **KV namespace** (`KV`): for sessions (`session:{id}`) and rate limits (`ratelimit:{user_id}:{hour_bucket}`)

### Production Secrets

Set via `npx wrangler pages secret put <NAME> --project-name tplus-landing-page`:

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Sonnet 4.6 |
| `TWITTER_CLIENT_ID` | Twitter OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | Twitter OAuth 2.0 Client Secret |
| `SESSION_SECRET` | Random hex string for session signing |
| `SITE_URL` | `https://www.tplus.cx` |

### D1 Schema

Apply with: `npx wrangler d1 execute beat-saylor-db --file=./schema.sql`

Tables: `users`, `submissions` (see `schema.sql`).

## Twitter Developer App Setup

1. Create app at https://developer.twitter.com
2. Enable OAuth 2.0 under User Authentication Settings
3. App permissions: **Read**
4. Type: **Web App (Confidential client)**
5. Callback URLs:
   - `http://localhost:8788/api/auth/callback` (local dev)
   - `https://www.tplus.cx/api/auth/callback` (production)
6. Website URL: `https://www.tplus.cx`

## Local Development

1. Copy credentials to `.dev.vars`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   TWITTER_CLIENT_ID=your_client_id
   TWITTER_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=dev-secret
   SITE_URL=http://localhost:8788
   ```

2. Start the dev server:
   ```bash
   bash dev.sh
   ```
   This initializes the local D1 database and starts wrangler on port 8788.

3. Open http://localhost:8788/beat-saylor

## Rate Limits

- 10 submissions per hour per user
- Enforced via KV with hourly bucket keys (auto-expire after 1 hour)

## AI Judge

The judge uses a tool-use loop:
1. Receives the user's strategy
2. Calls data-retrieval tools (prices, funding rates, derivatives, ETFs, trading costs, etc.) — all data is embedded in `judge-prompt.ts`
3. Calls `submit_evaluation` tool with structured scoring

Market data covers March 2-8, 2026: BTC spot prices (4h candles), perp funding rates, CME futures, ETF flows, trading costs/market impact models, macro/geopolitical context, altcoin proxy data, and yields.
