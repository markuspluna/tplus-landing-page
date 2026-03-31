# Deliverable 8: Trading Functionality

## Scope

Trade execution reference: order types, order lifecycle, matching, leverage, market specifications, synchronous trades.

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
- Cross-deliverable: D2, D5, D6, D7, D9, D14

---

## Content

### Order Types

#### Limit Orders

A limit order rests on the book at a specified price until it is filled or cancelled. All maker orders must be limit orders. Prices and quantities follow the tick size and lot size configured for each market (see Market Specifications below).

Limit orders support the following time-in-force options:

- **Good-Til-Cancel (GTC)** — remains on the book until filled or cancelled. This is the default.
- **Good-Til-Date (GTD)** — remains on the book until a specified expiration time, then auto-expires.
- **Immediate-or-Cancel (IOC)** — executes immediately against available liquidity; any unfilled portion is cancelled. When used with fill-or-kill, the entire order must fill or it is rejected.

The **post-only** flag (available on GTC and GTD) ensures the order rests as a maker. If it would cross the book and take liquidity, the order is rejected instead — guaranteeing maker fees.

#### Market Orders

A market order executes immediately at the best available price. Market orders can specify quantity in two ways:

- **Base asset quantity** — buy or sell a specific amount of the base asset. An optional spend cap limits the quote amount on buys.
- **Quote asset quantity** — buy or sell a specific quote amount. An optional sell cap limits the base amount on sells.

Market orders use fill-or-kill by default.

#### Stop-Loss and Take-Profit Orders

Trigger conditions can be attached to any limit or market order to create stop-loss and take-profit orders. The order stays dormant until the mark price breaches the trigger threshold:

- **Take-profit** — triggers when mark price rises above the specified price. Used to lock in gains on a long position or close a profitable short.
- **Stop-loss** — triggers when mark price falls below the specified price. Used to limit losses on a long position or protect a short entry.

Trigger orders are reduce-only. t+ verifies sufficient position size at submission and automatically adjusts or cancels triggers if fills reduce the position below the total triggered amount. See D7 for liquidation triggers on isolated margin positions.

#### Modifying and Cancelling Orders

Open orders can be replaced with a new price, quantity, or trigger via a signed replace request. Orders can also be cancelled outright. 

### Matching and Finality

The t+ order book uses **price-time priority** (FIFO). When a new order crosses the book, the matching engine finds the best-priced resting order on the opposite side. Ties at the same price are broken by time — oldest order fills first. Execution occurs at the maker's price.

Your trade is final once it's matched in the orderbook. In rare cases, a trade can be rolled back if a post-match security check fails (e.g. a solvency breach). See D7 for margin and solvency details.

### Spot and Margin Trading

Trades can be either spot or margin. 

Whitelisted market makers can place post-only margin orders without first passing a margin check — their margin is validated at match ingestion and the trade is rolled back if they fail. If a maker exceeds an acceptable failure ratio, they are offboarded as a market maker. See D7 for margin calculations and liquidation thresholds.

### Market Specifications

Each market defines a **tick size** (minimum price increment) and **lot size** (minimum quantity increment).

### Synchronous Trades

For long-tail assets, t+ supports a synchronous trading mode. Unlike standard trades where confirmation happens offchain, synchronous trades defer finality until an associated onchain settlement transaction succeeds. If settlement fails, the trade reverts entirely.

This mode has stricter reliability requirements: synchronous makers must maintain a 98% fill success rate or face off-boarding. See D9 for settlement details.

---

## Changelog

- Content cleared: Previous passes contained inaccuracies and could not access Notion docs. Awaiting regeneration with verified source access.
- Pass 1 (Structure & Content Generation): Generated all 7 sections from Rust source (order_type, time_in_force, matching engine, pricing, orderbook_messages), Python SDK models, Notion trigger/sync specs, and pitch.html. All claims traced to source files read in this session.
- Pass 2 (Accuracy): Verified all 7 sections against Rust source (matching/src/matches.rs, pricing/src/price_manager.rs, margin/src/solvency_verifier.rs), Python SDK models (order.py, limit_order.py, market_order.py, order_trigger.py, trades.py, replace_order.py, cancel_order.py), and Notion specs (trigger-orders-overview, sync-makingtaking-spec). Corrections: removed inaccurate "(mid-book)" parenthetical from trigger description; added OMS reduce-only check detail and trigger cancellation threshold from Notion spec; changed "maker's ask/bid price" to "maker's limit price" in matching rules for source accuracy; used exact field name `new_price_limit` for replace orders; added hysteresis default count (2), risk-increasing action blocking in Degraded/CircuitBreaker states, and liquidation blocking in CircuitBreaker from pricing source; marked "faster queue" claim in Section 7 with [NEEDS SOURCE] (sourced from pitch.html which is excluded per instructions).
- Pass 3 (Prose & Conciseness): Cut from 1924 to ~1476 words. Removed redundant sentences, shortened table cells, tightened bullet points, eliminated filler/hedging language across all sections. No facts changed.
