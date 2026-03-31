# Deliverable 2: OMS Endpoints (tplus-core)

## Scope

API reference for the Order Management System: authentication, order CRUD, order types/lifecycle, market data (book, depth, klines, trades, tickers, instruments), account & position queries (inventory, margin state), WebSocket streams, error codes, and rate limits.

**Out of scope:** Settlement/deposit/withdrawal endpoints → D3. Smart contract interfaces → D4. SDK wrappers → D5. Fee calculation → D6. Margin/risk model → D7. Trading concepts, matching internals → D8. Settlement lifecycle → D9. TEE attestation/trust model → D10.

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/bin/oms.rs` — OMS binary entry point (REST + WS endpoints, auth, heartbeat)
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/rest_endpoints_router.rs` — REST route definitions (confirmed source of truth for all REST paths and HTTP methods)
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/auth.rs` — Auth module (nonce generation, token issuance, rate limiting, logout)
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/marketdata/` — market data storage, updater, REST handlers
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/ws_endpoints.rs` — WS depth & kline streams
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/client/src/ws.rs` — TplusClient trait (order CRUD, subscriptions)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/ws-stream-handler/src/lib.rs` — WS stream handler (ping/pong, batching, message forwarding)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/matching/src/` — matching engine: order validation (order.rs, order/evm.rs), signature validation (signatures.rs), deduplication (deduplication.rs), timing validation (timing.rs)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/pricing/src/` — PriceType enum (`Oracle`, `LastTradePrice`), mark price resolution
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/domains/src/lib.rs` — EIP-712 domain definitions (Rust)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/overlay/src/libp2p/mod.rs` — aTLS implementation
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/oms-api-cheatsheet-28ee.md` — OMS API cheatsheet
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/trigger-orders-overview-255e.md` — trigger orders
- https://oms.tplus.dev/swagger-ui/ — OMS Swagger (also available at `/api-doc.json` for OpenAPI spec)

---

## Content

### 1. Authentication

Nonce-based challenge-response with Ed25519 signatures and bearer toekns. All authenticated endpoints require headers: `Authorization: Bearer <token>` and `User-Id: <hex-encoded-public-key>`.

#### Auth Flow

1. **Request nonce** — client sends public key, receives a random 32-byte hex nonce (valid 5 minutes).
2. **Authenticate** — client signs nonce with Ed25519 private key, submits signature. OMS verifies, consumes nonce (preventing replay), issues bearer token.
3. **Use token** — include bearer token in subsequent requests. Tokens expire after 24 hours.
4. **Logout** — revokes all tokens for the authenticated user.

#### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/nonce/{user_id}` | No | Request nonce. Returns existing nonce if >10s remaining. |
| `POST` | `/auth` | No | Submit signed nonce to receive bearer token. |
| `POST` | `/logout` | Yes | Revoke all tokens for requesting user. |

**`GET /nonce/{user_id}`**

- **Path parameter:** `user_id` — hex-encoded Ed25519 public key.
- **Response (200):**
```json
{
  "value": "a1b2c3...64-char-hex-nonce...",
  "expiry_ns": 1744989793557041583
}
```
- If a valid nonce exists with >10s remaining, the existing nonce is returned.
- Rate-limited per IP (default 100 requests per 30-minute window).

**`POST /auth`**

- **Request body:**
```json
{
  "user_id": "<hex-encoded-ed25519-pubkey>",
  "nonce": "<nonce-value-from-step-1>",
  "signature": [<byte-array-of-ed25519-signature>]
}
```
- **Response (200):**
```json
{
  "token": "a1b2c3...64-char-hex-token...",
  "expiry_ns": 1745076193557041583
}
```
- Nonce consumed on success (cannot be reused). Rate-limited per IP.

**`POST /logout`**

- **Headers:** `Authorization: Bearer <token>`, `User-Id: <hex-pubkey>`
- **Request body:**
```json
{
  "user_id": "<hex-encoded-ed25519-pubkey>"
}
```
- **Response (200):**
```json
{ "status": "success" }
```
- Body `user_id` must match the authenticated user.

#### Auth Middleware

Protected endpoints extract `Authorization` (Bearer token) and `User-Id` headers via `with_auth` middleware. Missing, expired, or invalid tokens return `401 Unauthorized`:
```json
{ "error": "Invalid or missing auth token" }
```

---

### 2. Order Endpoints

All order endpoints require authentication. Global and per-user rate limits apply.

#### Create Order

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/orders/create` |
| **Auth** | Yes |
| **Rate-limited** | Global + per-user |

**Request body** (`CreateOrderRequest`):
```json
{
  "order": {
    "signer": "<hex-ed25519-pubkey>",
    "order_id": "user-defined-order-id",
    "base_asset": "<asset-identifier>",
    "book_price_decimals": 2,
    "book_quantity_decimals": 4,
    "details": {
      "Limit": {
        "limit_price": 100000,
        "quantity": 1000,
        "time_in_force": { "GoodTilCancel": { "post_only": false } }
      }
    },
    "side": "Buy",
    "trigger": null,
    "creation_timestamp_ns": 1744989793557041583,
    "target": { ... },
    "protocol_version": 1
  },
  "signature": [1, 2, 3, ...],
  "post_sign_timestamp": 1744989793557041583,
  "receive_timestamp_ns": null
}
```

**Response (200)** (`CreateOrderResponse`):
```json
{
  "order_id": "user-defined-order-id",
  "status": "Received",
  "processed_at_ns": 1744989793557041583
}
```

**Response (400):**
```json
{
  "order_id": "user-defined-order-id",
  "status": "Rejected",
  "reason": "Invalid margin requirements: ...",
  "processed_at_ns": 1744989793557041583
}
```

**Validation (in order):**
1. JSON deserialization
2. Order ID length check (max `OID_MAX_LEN_BYTES`)
3. Signer must match authenticated user
4. Inventory/margin checks (`InventoryChecks::validate_can_place_order`)
5. Forward to orderbook; OMS waits for confirmation (up to 5s)

**Status values:** `Received`, `Rejected`

#### Replace Order

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/orders/replace` |
| **Auth** | Yes |
| **Rate-limited** | Global + per-user |

**Request body** (`ReplaceOrderRequest`):
```json
{
  "signer": "<hex-ed25519-pubkey>",
  "asset_id": "<asset-identifier>",
  "request": {
    "order_id": "existing-order-id",
    "timestamp_ns": 1744989793557041583,
    "new_price_limit": 200000,
    "new_quantity": 2000,
    "new_trigger": null,
    "book_quantity_decimals": 4,
    "book_price_decimals": 2,
    "protocol_version": 1
  },
  "signature": [1, 2, 3, ...],
  "post_sign_timestamp": 1744989793557041583,
  "receive_timestamp_ns": null
}
```

**Response (200)** (`ReplaceOrderResponse`):
```json
{
  "order_id": "existing-order-id",
  "status": "Received"
}
```

**Response (400):**
```json
{
  "order_id": "existing-order-id",
  "status": "Rejected",
  "reason": "Why is this rejected"
}
```

**Status values:** `Received`, `Rejected`

`new_price_limit`, `new_quantity`, and `new_trigger` are all optional — only provided fields are modified. Margin validation runs against the delta.

#### Cancel Order

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/orders/cancel` |
| **Auth** | Yes |
| **Rate-limited** | Global + per-user |

**Request body** (`CancelOrderRequest`):
```json
{
  "cancel": {
    "signer": "<hex-ed25519-pubkey>",
    "order_id": "order-to-cancel",
    "asset_id": "<asset-identifier>",
    "protocol_version": 1
  },
  "signature": [1, 2, 3, ...],
  "post_sign_timestamp": 1744989793557041583,
  "receive_timestamp_ns": null
}
```

**Response (200)** (`CancelOrderResponse`):
```json
{
  "order_id": "order-to-cancel",
  "status": "Received"
}
```

**Response (400):**
```json
{
  "order_id": "order-to-cancel",
  "status": "Rejected",
  "reason": "Timeout"
}
```

**Status values:** `Received`, `Rejected`

#### Query User Orders

**`GET /orders/user/{user_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `user_id` | String | Path | Hex-encoded public key |
| `page` | usize | Query | Page number (default 0) |
| `limit` | usize | Query | Items per page (default 100, max 1000) |
| `open_only` | bool | Query | If `true`, return only open orders (default `false`) |

- **Auth:** Yes (must match `user_id`)
- **Response (200):** `JsonBookOrder[]`
- **Response (404):** User not found

**`GET /orders/user/{user_id}/{asset_id}`**

Same parameters as above plus `asset_id` (path) to filter orders by market.

---

### 3. Order Types and Lifecycle States

#### Order Types

Orders use the `OrderType` enum in the `details` field:

| Type | Fields | Description |
|------|--------|-------------|
| `Limit` | `limit_price`, `quantity`, `time_in_force` | Resting order at specified price |
| `Market` | `quantity` (`MarketQuantity` variant), `fill_or_kill` | Immediate execution at best available price |

**Time-in-Force** (within `Limit`):
- `GoodTilCancel` — remains on book until filled or canceled. Has `post_only` flag.
- Other TIF types defined in orderbook messages. See D8 for details.

**Trigger Orders:**
Attached via the `trigger` field:
- `PriceAbove { price }` — triggers when mark price exceeds threshold
- `PriceBelow { price }` — triggers when mark price falls below threshold

Includes stop-loss (stop market, stop limit) and take-profit variants. Must be reduce-only. See D8 for matching behavior.

#### Order Sides

- `Buy`
- `Sell`

#### Order Lifecycle

1. **In-flight** — submitted to OMS, not yet confirmed by orderbook (`in_flight = true`).
2. **Created** — orderbook confirmed placement (`OrderbookEvent::Created`).
3. **Updated** — successfully replaced (`OrderbookEvent::Updated`).
4. **Filled** — matched partially or fully (`OrderbookEvent::Filled`, contains maker/taker fills).
5. **Canceled** — canceled (`OrderbookEvent::Canceled`).
6. **Rejected** — failed validation (signature, timing, margin, duplicate).

If no orderbook confirmation arrives within 5 seconds (`OB_EVENT_WAIT_DURATION_SECS`), the OMS checks local book state. If the order is still in-flight, it is removed and the request returns `Rejected` with reason `"Timeout"`.

#### Signature Validation

Orders are Ed25519-signed. Signing payload produced by `signable_part()` on `UserOrder`. The matching engine validates:
1. **Signature** — Ed25519 verification against signer's public key
2. **Limit overrides** — if `limit_overrides` present, a separate signature is verified
3. **Timing** — `creation_timestamp_ns` must be within allowed buffer of current time

#### Deduplication

`DuplicateTracker` deduplicates events by:
- `(order_id, asset_id)` for created orders
- `(order_id, asset_id)` for canceled orders
- `(order_id, trade_ids, asset_id)` for filled orders

`OrderbookFilter` additionally routes events based on the active orderbook per asset, rejecting events from non-active orderbooks.

---

### 4. Market Data Endpoints

#### Market Depth (Orderbook Snapshot)

**`GET /marketdepth/{asset_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `asset_id` | String | Path | Market identifier |

- **Auth:** No
- **Response (200):** `MarketDepthSnapshot`
```json
{
  "asks": [
    ["0.99980141", "0.01000000"],
    ["1.00000138", "0.01000000"]
  ],
  "bids": [],
  "sequence_number": 1943
}
```
Each entry is `[price, quantity]` as decimal strings. Sorted by price (`BTreeMap<Decimal, Decimal>`).

- **Response (404):** Market not found.

#### Klines (Candlestick Data)

**`GET /klines/{asset_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `asset_id` | String | Path | Market identifier |
| `end_timestamp_ns` | u64 | Query | End timestamp in nanoseconds (defaults to current time) |
| `page` | usize | Query | Page number (default 0) |
| `limit` | usize | Query | Items per page (default 100, max 18000) |

- **Auth:** No
- **Response (200):** `Timebar[]`

Each `Timebar`:
```json
{
  "open": "1.00000000",
  "close": "1.00100000",
  "high": "1.00200000",
  "low": "0.99900000",
  "volume": "10.50000000",
  "open_timestamp_ns": 1744989600000000000,
  "close_timestamp_ns": 1744989660000000000
}
```

Bucket size configured per OMS instance (`timebar_bucket_size_ms`). Up to 7 days of timebars retained in memory (capped at `3600 * 24 * 7` entries per market).

- **Response (404):** Market not found.

#### Trades

**`GET /trades`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `page` | usize | Query | Page number (default 0) |
| `limit` | usize | Query | Items per page (default 100, max 1000) |

- **Auth:** No
- **Response (200):** `Trade[]` — all confirmed trades across all markets.

**`GET /trades/{asset_id}`**

Same pagination params, filtered to a specific market.

- **Auth:** No
- **Response (200):** `Trade[]`

**`GET /trades/user/{user_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `user_id` | String | Path | Hex-encoded public key |
| `page` | usize | Query | Page number (default 0) |
| `limit` | usize | Query | Items per page (default 100, max 1000) |

- **Auth:** Yes (must match `user_id`)
- **Response (200):** `UserTrade[]`
- **Response (404):** User not found

**`GET /trades/user/{user_id}/{asset_id}`**

Same as above, filtered to a specific market.

- **Auth:** Yes
- **Response (200):** `UserTrade[]`

#### Markets

**`GET /markets`**

- **Auth:** No
- **Response (200):** `Market[]` — all active markets.

Example:
```bash
curl -s https://oms.tplus.dev/markets | jq -r .[].asset_id
```

**`GET /market/{asset_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `asset_id` | String | Path | Market identifier |

- **Auth:** No
- **Response (200):** `MarketDetails`
```json
{
  "asset_id": "<asset-identifier>",
  "book_price_decimals": 8,
  "book_quantity_decimals": 8,
  "latest_timebars": [ ... ]
}
```
Includes up to 100 recent timebars.

- **Response (404):** Market not found.

**`POST /market/create`**

| | |
|---|---|
| **Auth** | No |
| **Rate-limited** | Global |

**Request body** (`CreateMarketRequest`):
```json
{
  "asset_id": "<asset-identifier>"
}
```

**Response (201)** (newly created):
```json
{
  "asset_id": "<asset-identifier>",
  "status": "Received",
  "market": {
    "asset_id": "<asset-identifier>",
    "book_price_decimals": 8,
    "book_quantity_decimals": 8
  }
}
```

**Response (200)** (already exists): same shape with existing market.

**Response (400):**
```json
{
  "asset_id": "<asset-identifier>",
  "status": "Rejected",
  "market": null
}
```

#### Health Check

**`GET /health`**

- **Auth:** No
- **Response (200):**
```json
{ "status": "healthy" }
```
- **Response (503):**
```json
{ "status": "unhealthy" }
```

#### OpenAPI / Swagger

- **`GET /api-doc.json`** — OpenAPI spec (JSON)
- **`GET /swagger-ui/`** — Swagger UI

---

### 5. Account and Position Queries

#### User Inventory

**`GET /inventory/user/{user_id}`**

| Param | Type | In | Description |
|-------|------|----|-------------|
| `user_id` | String | Path | Hex-encoded public key |

- **Auth:** Yes (must match `user_id`)
- **Response (200):** `UserInventoryJson`
```json
{
  "accounts": {
    "0": {
      "kind": "spot",
      "spot": {
        "0": "1.0",
        "1": "0.5"
      },
      "margins": {}
    },
    "1": {
      "kind": "cross_margin",
      "spot": {
        "0": "2.0"
      },
      "margins": {
        "1": {
          "base": {
            "credits": "0.1",
            "liabilities": "0.0"
          },
          "quote": {
            "credits": "0.0",
            "liabilities": "0.05"
          }
        }
      }
    }
  },
  "is_mm": false
}
```

Sub-accounts keyed by index. Each contains spot balances (by asset) and margin positions (base/quote credits and liabilities).

- **Response (404):** User not found.

---

### 6. WebSocket Streams

All WebSocket connections use TLS (`wss`). On connection, the server sends a welcome message:
```json
{
  "type": "subscriptions",
  "channels": [{ "name": "channel-name" }],
  "errors": null
}
```

On auth failure, the server sends a rejection:
```json
{
  "type": "subscriptions",
  "channels": [],
  "errors": "unauthorized"
}
```

#### Connection Management

- **Ping/pong:** Server pings every 20s. Clients must respond with pongs.
- **Mini-batching:** Server batches up to 20 messages before flushing, reducing syscall overhead.
- **Close:** Send a WebSocket close frame to terminate.

#### Public Streams (No Auth)

| Path | Channel Name | Message Type | Description |
|------|-------------|--------------|-------------|
| `/orders` | `orders` | `OrderEvent` | All order updates, all markets |
| `/trades/events` | `trades` | `TradeEvent` | All trade events (pending, confirmed, rollbacked) |
| `/trades` | `finalized-trades` | `Trade` | Confirmed trades only |
| `/trades/events/{asset_id}` | `trades:[asset={id}]` | `TradeEvent` | Trade events for one market |
| `/trades/{asset_id}` | `finalized-trades:[asset={id}]` | `Trade` | Confirmed trades for one market |
| `/marketdepth/diff/{asset_id}` | `marketdepth` | `JsonPriceLevelUpdated` | Orderbook depth updates |
| `/klines/diff/{asset_id}` | `klines` | `Timebar` | Candlestick updates |

#### Authenticated Streams

| Path | Channel Name | Auth | Message Type | Description |
|------|-------------|------|--------------|-------------|
| `/trades/user/events/{user_id}` | `user-trades` | Yes | `UserTrade` | User trade events (pending, confirmed, rollbacked) |
| `/trades/user/{user_id}` | `user-finalized-trades` | No* | `UserTrade` | Confirmed trades for a user |
| `/account/stats/{user_id}` | `account-stats` | Yes | `AccountStatsUpdate` | Account stats (inventory changes) |
| `/control` | `""` (empty) | Yes | Bidirectional | Order operations via WebSocket |

*Note: `/trades/user/{user_id}` does not enforce auth, unlike `/trades/user/events/{user_id}`.

Pass `Authorization` and `User-Id` as WebSocket handshake headers for authenticated streams.

#### Trade Event Types

`TradeEvent` enum:
- `Pending` — matched, not yet confirmed by clearing engine
- `Confirmed` — confirmed and settled
- `Rollbacked` — rolled back

#### UserTrade Shape

```json
{
  "asset_id": "<asset-identifier>",
  "trade_id": 12345,
  "order_id": "user-order-id",
  "price": "1.00000000",
  "quantity": "0.50000000",
  "timestamp_ns": 1744989793557041583,
  "is_maker": true,
  "is_buyer": false,
  "status": "Confirmed"
}
```

`status` values: `Pending`, `Confirmed`, `Rollbacked`

#### Control WebSocket

Authenticated bidirectional channel at `/control`. Welcome message uses type `"control"` (not `"subscriptions"`) with empty channel name. Accepts `ObRequest` messages:
- `CreateOrderRequest`
- `ReplaceOrderRequest`
- `CancelOrderRequest`

Same JSON schema as REST endpoints, sent as WebSocket text frames.

---

### 7. Error Codes and Rate Limits

#### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created (market creation) |
| `400` | Bad request (invalid JSON, rejected order, margin failure) |
| `401` | Unauthorized (missing or invalid auth token, user mismatch) |
| `404` | Not found (unknown user or market) |
| `429` | Too many requests (rate limit exceeded) |
| `500` | Internal server error |
| `503` | Service unavailable (health check failing) |

#### Error Response Shapes

**Order rejection:**
```json
{
  "order_id": "...",
  "status": "Rejected",
  "reason": "Human-readable reason"
}
```

Common reasons: `"Invalid json"`, `"Order ID longer than N bytes"`, `"Invalid or missing auth token"`, `"Invalid margin requirements: ..."`, `"Timeout"` (orderbook did not confirm within 5s).

**Auth error:**
```json
{ "error": "Invalid or missing auth token" }
```

**Rate limit:**
```json
"Rate limit exceeded"
```
Per-user variant: `"Rate limit exceeded for this user"`

#### Rate Limiting

Two tiers:

**1. Auth rate limiting** (per IP):
- Config: `max_auth_request_per_period`, `auth_request_period_size_in_seconds`
- Default: 100 requests per 1800s (30 min)
- Applies to `/nonce` and `/auth`

**2. API rate limiting** (per second):
- **Global:** `max_queries_per_second` — all requests
- **Per-user:** `max_user_queries_per_second` — keyed by `UserPublicKey`
- Applies to order create/replace/cancel and market creation
- Returns `429` when exceeded

All parameters configurable via `OmsRateLimitConfig`. When disabled (`enabled: false`), limits set to `u32::MAX`.

#### Asset Identifier Format

Format: `<40-char-hex-address-zero-padded-to-64>@<16-char-hex-chain-id>`

Example: `da10009cbd5d07dd0cecc66161fc93d7c9000da1000000000000000000000000@000000000000a4b1`

Also supports numeric `Index(u64)` variant for internal use.

---

## Flagged for Review

- **`GET /admin/orderbooks`** — Admin endpoint, auth commented out. Not for public docs.
- **`DELETE /market/{asset_id}`** — Gated behind `#[cfg(feature = "debug-admin-endpoint")]`. Debug/admin only.
- **`/control` WebSocket** — Uses standard `with_auth`, exposed on public router. Welcome message type `"control"` differs from other WS endpoints.
- **`/trades/user/{user_id}` (finalized)** — Does NOT enforce auth, unlike `/trades/user/events/{user_id}`. Potential inconsistency.
- **EIP-712 / EVM signatures** — `order/evm.rs` marked with TODO: "not being declared or used anywhere and has outdated issues." Production uses Ed25519. Confirm deprecated or future work.

---

## Changelog

- Content cleared: Previous passes contained inaccuracies. Awaiting regeneration with verified source access.
- Pass 1 (Structure & Content Generation): Full regeneration from source files — 7 sections covering auth, orders, order types/lifecycle, market data, account queries, WebSocket streams, and error codes/rate limits.
- Pass 2 (Accuracy): Verified all claims against source files. Fixed: control WS supports ReplaceOrderRequest (not just create/cancel); control WS welcome type is "control" not "subscriptions" with empty channel name; tagged 7-day timebar retention as [NEEDS SOURCE]. All endpoint paths, HTTP methods, parameter names/types, auth requirements, rate limit configs, WS channel names, and response shapes confirmed against source code.
- Pass 3 (Prose & Conciseness): Tightened prose throughout, removed filler and redundancy, resolved [NEEDS SOURCE] for 7-day timebar retention (confirmed in market_updater.rs), standardized terse style for API reference.
