# Deliverable 8: Trading Functionality

## Scope

Trade execution reference: order types, TIF, order lifecycle, matching rules, leverage, market microstructure, prioritized maker path.

**Excludes:** API endpoints (D2), SDK functions (D5), fees (D6), margin/liquidation (D7), settlement (D9), interest rates (D14).

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tplus-core/bin/order-management-system/src/bin/oms.rs` — OMS binary
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/orderbook/src/bin/orderbook_no_secret.rs` — Orderbook node (internal overlay)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/matching/src/` — Matching engine: validation, dedup, timing
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/pricing/src/` — PriceType enum, mark price resolution
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/margin/src/` — MarginSolvencyVerifier, breach types
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/model/` — Order types, UserTrade, TradeTarget
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/trigger-orders-overview-255e.md` — Trigger order spec
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/sync-makingtaking-spec-265e.md` — Synchronous trades
- `pitch.html` — Maker queue, margin-on-match, composable liquidity, synchronous trades
- Cross-deliverable: D2, D5, D6, D7, D9, D14

---

## Content

### 1. Order Types

Two primary order types: **Limit** and **Market**. Trigger conditions can be attached to either to create stop-loss/take-profit orders.

| Order Type | Parameters | Behavior |
|---|---|---|
| **Limit** | `limit_price`, `quantity`, `time_in_force` | Rests on the book at specified price. Makers must be limit orders. Price/quantity use book-configured decimal precision (`book_price_decimals`, `book_quantity_decimals`). |
| **Market** | `quantity` (base or quote), `fill_or_kill` | Executes immediately against resting liquidity. |

**Market order quantity modes:**

- **BaseAsset** — specific base asset quantity. Optional `max_sellable_amount` caps quote spent on buys.
- **QuoteAsset** — specific quote amount. Optional `max_sellable_quantity` caps base sold on sells.

**Trigger orders** attach a `PriceAbove` or `PriceBelow` condition. The order stays dormant until mark price breaches the trigger.

| Trigger | Condition | Use Case |
|---|---|---|
| `PriceAbove { price }` | TakeProfit | Execute when price rises above threshold |
| `PriceBelow { price }` | StopLoss | Execute when price drops below threshold |

Triggers are stored in the OMS per account and asset, sorted by mark price. Must be reduce-only — OMS verifies sufficient inventory at submission. When a confirmed fill partially invalidates triggers, the OMS iterates from closest-to-mark and reduces or cancels excess quantity (only if total trigger amount exceeds position size). On the orderbook side, triggers are stored per price level and activated when the matching engine crosses the level and mark price (mid) confirms the breach.

Liquidation triggers (isolated margin) use the same mechanism but may be differentiated for priority. See D7.

**Order modification:** Replace via signed `ReplaceOrder` (`new_price_limit`, `new_quantity`, or `new_trigger`) or cancel via signed `CancelOrder`. Processed through the same queue as normal orders.

### 2. Time-in-Force Options

TIF controls how long an order remains active. Applies to limit orders via `time_in_force`. Market orders use `fill_or_kill` instead.

| TIF | Variant | Behavior |
|---|---|---|
| **GTC** | `GoodTilCancel { post_only }` | On book until filled or cancelled. Default. |
| **GTD** | `GoodTilDate { post_only, timestamp_ns }` | On book until `timestamp_ns`, then auto-expires. Matching engine rejects expired orders. |
| **IOC** | `ImmediateOrCancel { fill_or_kill }` | Executes immediately; unfilled portion cancelled. With `fill_or_kill = true`, entire order must fill or is rejected (FOK). |

The `post_only` flag (GTC/GTD) ensures the order rests as a maker only. If it would cross, it is rejected.

### 3. Order Lifecycle and State Transitions

```
                  ┌──────────┐
     Submit ───►  │ Pending  │  (trigger orders awaiting activation)
                  └────┬─────┘
                       │ trigger touched
                       ▼
                  ┌──────────┐
     Submit ───►  │  Open    │  (resting on the book)
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
      ┌──────────┐ ┌────────┐ ┌───────────┐
      │ Partial  │ │Completed│ │ Cancelled │
      └────┬─────┘ └────────┘ └───────────┘
           │
      ┌────┴──────┐
      ▼           ▼
┌──────────┐ ┌────────┐
│ Completed│ │ Closed │  (cancelled with partial fill)
└──────────┘ └────────┘
```

| Status | Meaning |
|---|---|
| **Pending** | Trigger order awaiting price condition |
| **Open** | Resting on the book, no fills |
| **Partial** | Has confirmed fills; unfilled quantity remains |
| **Completed** | Fully filled |
| **Cancelled** | Cancelled with zero fills |
| **Closed** | Cancelled after partial fills |

**Fill finality:** Trades have their own lifecycle: `Pending → Confirmed` or `Pending → Rollbacked`. A pending trade means the match occurred but the clearing engine has not finalized it (solvency check pending). If solvency fails, the trade rolls back and the matching engine reverses the fill reservation.

Orders track `confirmed_filled_quantity` (finalized) and `pending_filled_quantity` (matched, awaiting confirmation) to support optimistic fill display.

### 4. Matching Engine Rules and Priority

**Price-time priority** (FIFO) order book operated within a TEE.

**Matching rules:**

- **Makers must be limit orders.** The engine rejects any match where a maker is a market order.
- **Price compatibility:** Buy taker's limit price must be >= maker's limit price; sell taker's must be <= maker's. Market orders match any resting price.
- **Same-asset enforcement:** Taker and makers must share the same `base_asset`.
- **Opposite-side enforcement:** Taker and makers must be on opposite sides.
- **Overfill protection:** Cumulative filled quantity tracked per signature. Match rejected as `Overfilled` if it would exceed order total.

**Validation pipeline (clearing engine):**

1. **Time** — match within `MATCH_TTL_IN_SECS`; orders within `ORDER_TTL_IN_SECS`.
2. **Conditions** — order enabled (not expired, trigger touched if applicable), override validity, price/side/asset consistency.
3. **Signature** — ed25519 verified against signing payload and signer public key. Limit overrides require a separate signature.
4. **Overfill** — cumulative fill per signature; rejected if exceeds total.
5. **Solvency** — margin engine verifies post-trade solvency. See D7.

**Deduplication:** The OMS `OrderbookFilter` rejects duplicate events (creates, cancels, fills) and ensures events come from the active orderbook for each asset.

### 5. Leverage and Position Sizing

t+ decouples confirmation from settlement. Orders confirm offchain in under 1ms; settlement happens asynchronously. This enables leverage: positions can exceed deposited collateral.

**Trade targets** determine which balance a trade draws from:

| Target | `account` | `is_spot` | Effect |
|---|---|---|---|
| Main account spot | 0 | true | Spot balance, main account |
| Margin account spot | 1 | true | Spot balance, margin account |
| Margin account margin | 1 | false | Margin balance (leveraged) |

When trading on margin (`is_spot: false`), the margin engine evaluates solvency based on collateral, haircuts, and open interest. See D7 for margin calculations and liquidation thresholds.

**Margin-on-match:** Margin is not locked when a maker posts a quote. The solvency check runs at match time, so capital is only evaluated on fill — not while orders rest on the book.

### 6. Market Microstructure

**Decimal precision:** Each book defines `book_price_decimals` (tick size) and `book_quantity_decimals` (lot size). Prices and quantities are integers scaled by these fields. Example: `book_price_decimals = 2` means price `10570025` = `105700.25`.

**Mark price resolution:** The `PriceManager` resolves mark price via fallback chain:
1. Last trade price (orderbook)
2. Oracle price (external feeds)
3. Impact price (VWAP from orderbook depth)

If all sources are stale/unavailable, the asset enters circuit breaker — trading and liquidations blocked. State machine: `WarmingUp → Ready → Degraded → CircuitBreaker`, with hysteresis (default: 2 consecutive fresh updates to recover) to prevent flapping. Risk-increasing actions blocked in all states except `Ready`.

**Staleness thresholds (defaults):**
- Oracle: 1 hour
- Mark (last trade): 60 seconds
- Warmup: 3 consecutive fresh oracle updates required before trading

### 7. Prioritized Maker Path

- **Quotes and cancels processed in a faster queue** than taker orders. **[NEEDS SOURCE]** Gives makers priority for updating resting liquidity, reducing adverse selection.
- **Post-only mode** (`post_only` on GTC/GTD) ensures maker orders never cross the book.
- **Margin-on-match** — posting a quote does not lock margin. Makers can quote across many price levels without tying up capital.

For long-tail assets with limited liquidity, t+ supports **synchronous trades**. Trade finality is deferred until on-chain settlement succeeds; if settlement fails, the trade reverts. Synchronous makers must maintain 98% fill success rate or be off-boarded; takers require 90%. See D9 for settlement details.

---

## Flagged for Review

- Trigger order spec contains internal implementation notes (ingestion, cancellation, cascading) that may warrant separate operator docs.
- Sync making/taking spec partially marked "out of date" — simplest implementation is via delegated settlements. Verify which model is shipping.

---

## Changelog

- Content cleared: Previous passes contained inaccuracies and could not access Notion docs. Awaiting regeneration with verified source access.
- Pass 1 (Structure & Content Generation): Generated all 7 sections from Rust source (order_type, time_in_force, matching engine, pricing, orderbook_messages), Python SDK models, Notion trigger/sync specs, and pitch.html. All claims traced to source files read in this session.
- Pass 2 (Accuracy): Verified all 7 sections against Rust source (matching/src/matches.rs, pricing/src/price_manager.rs, margin/src/solvency_verifier.rs), Python SDK models (order.py, limit_order.py, market_order.py, order_trigger.py, trades.py, replace_order.py, cancel_order.py), and Notion specs (trigger-orders-overview, sync-makingtaking-spec). Corrections: removed inaccurate "(mid-book)" parenthetical from trigger description; added OMS reduce-only check detail and trigger cancellation threshold from Notion spec; changed "maker's ask/bid price" to "maker's limit price" in matching rules for source accuracy; used exact field name `new_price_limit` for replace orders; added hysteresis default count (2), risk-increasing action blocking in Degraded/CircuitBreaker states, and liquidation blocking in CircuitBreaker from pricing source; marked "faster queue" claim in Section 7 with [NEEDS SOURCE] (sourced from pitch.html which is excluded per instructions).
- Pass 3 (Prose & Conciseness): Cut from 1924 to ~1476 words. Removed redundant sentences, shortened table cells, tightened bullet points, eliminated filler/hedging language across all sections. No facts changed.
