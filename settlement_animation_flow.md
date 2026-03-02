# Settlement Animation Flow — Current Understanding

## Layout

### Left Side (shared across all views)
Three stacked boxes, top to bottom:
1. **Clearing Engine** (CE) — taller than other boxes so the t+ ball doesn't cover text
2. **Risk Engine** (RE) — hidden by default, only visible during View 2
3. **Market Maker** (MM)

### Right Side — changes per view
- **View 1: "Settlement Chain (Ethereum/Solana/etc)"**
  - Row layout: `deposit_vault.sol` on the left, three DEX contracts stacked on the right (`uniswap.sol`, `GPv2Settlement.sol`, `aave.sol`)
- **View 2: "CEX (Binance)"**
  - Two boxes: `binance_orderbook` and `binance_state_channel`
- **View 3: "t+ Orderbook (TEE)"**
  - One box: `orderbook.rs`

### Ball Types
- **t+ face ball** (red circle with t+ logo) — used in CE across all views
- **"sig" label ball** (white circle, red border, text "sig") — used in View 1 for CE->MM->deposit_vault
- **"ETH"/"USDC" label balls** (same style, text changes) — 3 balls used in View 1 for DEX settlement

### Terminal
Below the diagram, a terminal-style panel shows step descriptions. Steps 1-5 are View 1, steps 6-7 are View 2, steps 8-9 are View 3.

### View Indicator Dots
Three clickable dots below the diagram. Clicking a dot cancels the current animation and jumps to the selected view.

---

## View 1: On-chain Settlement (DEX)

**Step 1 — "Match enters clearing engine"**
- t+ face ball enters from the LEFT EDGE OF THE SCREEN, slides right into the Clearing Engine
- CE glows
- t+ ball stays in CE for the ENTIRE view (never leaves)

**Step 2 — "Signature authorizes MM to settle"**
- CE stops glowing
- A "sig" labeled ball spawns at CE and moves to Market Maker
- MM glows

**Step 3 — "Execute onchain transaction"**
- MM stops glowing
- "sig" ball moves from MM to deposit_vault
- deposit_vault glows
- "sig" ball disappears
- deposit_vault stops glowing
- 3 "ETH" labeled balls spawn at deposit_vault
- All 3 fan out simultaneously: one to uniswap, one to cowswap, one to aave
- DEX boxes glow
- After a pause, the balls' labels change from "ETH" to "USDC" (in place, same DOM elements)
- DEX boxes stop glowing
- 3 "USDC" balls move back to deposit_vault simultaneously

**Step 4 — "Settlement Reported to Clearing Engine"**
- ETH/USDC balls disappear
- deposit_vault glows
- t+ face ball spawns at deposit_vault, moves to CE
- CE glows
- both t+ face balls in the clearing engine disappear
- CE stops glowing -> transition to View 2

---

## View 2: CEX Hedge (Binance)

- Risk Engine box becomes visible
- t+ face ball appears in CE (instant, not animated — it "persisted" from View 1)

**Step 5 — "Trade sent to CEX"**
- MM glows
- ball2 (t+ face) spawns at MM, moves to binance_orderbook
- binance_orderbook glows

**Step 6 — "State confirmed via risk engine"**
- MM and binance_orderbook stop glowing
- binance_state_channel and Risk Engine glow
- After a pause, those stop glowing
- ball2 moves to binance_state_channel box
- ball2 returns to CE
- CE glows
- both t+ face balls in the clearing engine disappear
- CE stops glowing -> transition to View 3

---

## View 3: Internal Clear (t+ Orderbook in TEE)

- Risk Engine hidden again
- t+ face ball appears in CE

**Step 8 — "Order routed to internal orderbook"**
- ball2 (t+ face) spawns at MM, moves to orderbook.rs
- orderbook.rs glows

**Step 9 — "Match confirmed internally"**
- MM and orderbook.rs stop glowing
- ball2 return to CE
- CE glows
- All balls fade out
- After a pause -> loop back to View 1 (runCycle)

---

## Copy

### Left-Side Labels
- Header: `Composable Leverage Network`
- Subheader: `INTEL TDX VM`
- CE box: `clearing_engine.rs`
    - Validates and authorizes onchain interactions
- RE box: `risk_engine.rs`
- MM box: `Market Maker`

### Right-Side Box Labels

**View 1 — header: `Settlement Chain (Ethereum/Solana/etc)`**
- `deposit_vault.sol`
    - User deposits are pooled and used to interact with onchain liquidity
- `uniswap.sol`
    - Settle exposure via swap
- `GPv2Settlement.sol`
    - Settle exposure via batch auction
- `aave.sol`
    - Settle exposure by filling a liquidation

**View 2 — header: `Binance`**
- `Binance Orderbook`
- `Binance State`

**View 3 — header: `Clob in a TEE`**
- `orderbook.rs`

### Terminal Steps

| Step | Header | Subline |
|------|--------|---------|
| 1 | Match processed by clearing engine | Market Maker incurs leveraged exposure |
| 2 | Market Maker chooses to clear exposure using onchain composability | MM requests and receives settlement approval from the clearing engine |
| 3 | Execute onchain settlement transaction | Arbitrary onchain interaction executed using deposit vault funds - clear exposure via backrun, liquidation, AMM swap, batch auction, etc. |
| 4 | Settlement reported to clearing engine | MM balances are updated, settled leverage exposure is cleared |
| 5 | Market Maker chooses to hedge exposure using Cross-Margining | Market Maker executes a hedging trade on Binance (or any other cross-margined venue such as Hyperliquid) |
| 6 | Binance state synced | Risk Engine verifies hedge position and updates the Market Maker's cross-margined balance |
| 7 | Market Maker chooses to clear exposure in the t+ book | MM sends a clearing order to the CLOB in the TEE |
| 8 | Clearing Engine ingests the match | Market Maker balance is updated, clearing the leverage exposure |

### Ball Labels
- `sig` (signature ball)
- `ETH` (swaps to `USDC` at DEX contracts)

---

## Timing
All animation durations have been doubled from the original (2x slower per user request). Typical movement is 1.2-2.4 seconds, pauses are 1.6-4 seconds.

## Generation Counter
A `gen` counter is incremented whenever a view dot is clicked, which invalidates all pending setTimeout callbacks from the previous animation, allowing clean transitions between views.
