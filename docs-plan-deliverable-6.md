# Deliverable 6: Fees

## Scope

Fee schedule and computation reference. Maker/taker model, fee tiers, volume discounts, rebates, per-trade calculation, fee–settlement interaction.

**Boundaries:** Fee API endpoints → D2, D3 | Risk/margin → D7 | Order types/matching → D8 | Settlement lifecycle → D9 | Rebalancing fees → D13 | Interest rates → D14

---

## Source Material

- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/trading-fees-rates-297e.md` — fee tiers, rate schedules

---

## Content

### Current Status

> **Trading fees are not enforced.** The clearing engine has fee/reward infrastructure (`process_net_fee` in `inventory/liquidity.rs`, protocol `fee_account`, per-user deductions, reward payouts), but `calculate_net_fee` returns `0` with a `TODO: Call Liquidity Manager to calculate fee/reward`. Rates below are **planned day-zero tiers**, subject to change.

**These documents are not final - there are redacted sections that will be added before launch. Proprietary for now.**

### Fee Model

Fees are deducted from trade proceeds. Rate depends on:

1. **Role** — maker (providing liquidity) or taker (removing liquidity)
2. **Volume tier** — 14-day rolling trading volume (USD)
3. **Trade type** — margin or spot

t+ has a single orderbook for both spot and margin traders.

### Fee Tiers

#### Spot

Zero. May be reassessed post-launch.

#### Margin — Global Tiers

*Estimated day-zero tiers. Subject to change.*

| Tier | 14-Day Rolling Volume (USD) | Taker Fee | Maker Fee | Maker Rebate |
|------|------------------------------|-----------|-----------|--------------|
| 0    | —                            | 0.025%    | 0.015%    | None         |
| 1    | > $50M                       | 0.020%    | 0.005%    | None         |
| 2    | > $100M                      | 0.015%    | 0.000%    | 25% of taker fee |
| 3    | > $250M                      | 0.010%    | 0.000%    | 50% of taker fee |


### Per-Trade Calculation

```
fee_amount = fill_amount × fee_rate(role, tier, trade_type)
net_received = fill_amount - fee_amount
```

- `role` = maker or taker
- `tier` = volume tier from 14-day rolling volume
- `trade_type` = spot (0%) or margin (see tier table)

Multi-fill orders: fees computed per-fill, then summed.

**Example:** Taker buys 100 ETH at avg. $3,000, 0.03% fee → $90. Maker A sells 10 ETH at avg. $2,995, 0.015% → $4.4925. Maker B sells 90 ETH at avg. ~$3,000.50, 0.00% → $0. Total: $94.4925.

### Fee–Settlement Interaction

Trading fees are unimplemented — `calculate_net_fee` is stubbed at `0`. The `process_net_fee` infrastructure (invoked at settlement ingestion and deposit processing for rebalancing) routes fees to a protocol `fee_account` and can pay rewards. Trading-fee invocation at match finalization not yet wired up.

### Withdrawal Fee

Flat **$5 USD** per withdrawal (`WITHDRAWAL_FEE_AMOUNT = 5 × 10^18`, 18-decimal). Deducted from USD spot balance at withdrawal lock time.

### Gas / Network Fees

Off-chain orderbook and clearing engine — no gas for order placement, cancellation, or matching.

- **Deposits** — user pays gas on source chain
- **Withdrawals** — flat $5 fee (above); no user gas
- **Settlements** — market makers bear gas on destination chain **[NEEDS SOURCE]**

See D9 for settlement lifecycle. See D13 for rebalancing fees.


---

## Changelog

- Content cleared: Previous passes could not access `trading-fees-rates-297e.md`.
- Pass 1 (Structure & Scope): Generated all sections from source files; flagged Tier 1 maker fee discrepancy; excluded D14/D13 content.
- Pass 2 (Accuracy): Verified against source files. Corrected Tier 1 maker fee to match source (0.05%, flagged as likely typo); fixed per-trade example; clarified calculate_net_fee scope; added interest fee detail from points source; tagged settlement gas claim as [NEEDS SOURCE].
- Pass 3 (Prose & Conciseness): Cut ~30% of prose. Converted rebate multipliers to table. Removed redundant explanations, filler words, and hedging. Tightened all section headings and Flagged items.
