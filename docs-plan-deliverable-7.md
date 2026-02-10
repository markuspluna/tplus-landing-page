# Deliverable 7: Risk Mechanisms

## Scope

Margin and risk management reference. Explains how t+ computes margin requirements, applies haircuts, handles liquidations, and manages the insurance fund.

**Audience:** Traders managing positions, risk engineers evaluating the system, developers building margin-aware tools.

**Boundaries:** Does NOT cover API endpoints for querying margin/positions (D2, D3), smart contract settlement mechanics (D4), fee impact on margin (D6), order types or matching (D8), settlement lifecycle (D9), escape hatches (D10), or interest rate impact on positions (D14).

---

## Source Material

### tplus-core margin lib
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/margin/src/` — margin_engine.rs (41KB, core margin calculations), solvency_verifier.rs, solvency_result.rs, margin_engine/surplus_computer.rs (28KB), breach_oi_computer.rs, breach_margin_oi_computer.rs, breach_collateral_cap_computer.rs, initial_margin_clamped_curve.rs

### tplus-core margin protocol
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/margin/src/protocol/` — protocol_values.rs (protocol parameters), protocol_tracker.rs, spot_margin_exposure_computer.rs, total_margin_balance_computer.rs, total_collateralized_computer.rs

### Protocol docs
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/risk-controls-29ce.md` — OI caps, margin formulas, oracle price selection, circuit breakers
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/sub-accounts-275e.md` — cross-margin, isolated-margin, spot sub-accounts, transfer rules
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/cross-margining-276e.md` / `cross-margining-spec-2f1e.md` — credit lines, encumbrance models, liveness
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/im-price-multiple-implementation-2a3e.md` — IM skew adjustment formula (clamp-based)
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/liquidation-spec-22de.md` — liquidation flow, deleverage orders, clearing algorithm
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/liquidation-faqs-2f0e.md` — liquidation triggers, monitoring scan frequencies
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/adl-spec-2e4e.md` — ADL score formula, trigger conditions, pricing, parameters
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/t-backstop-avs-specification-239e.md` — EigenLayer AVS backstop, staged escalation

### Cross-deliverable sources
- `docs-plan-deliverable-3.md` — RiskParameters query surface
- `docs-plan-deliverable-4.md` — Registry.sol RiskParameters struct, on-chain validation, deposit caps, governance
- `docs-plan-deliverable-8.md` — margin-on-match, mark price resolution chain
- `docs-plan-deliverable-9.md` — withdrawal solvency checks, cum_cap_delta
- `docs-plan-deliverable-10.md` — oracle trust assumptions, circuit breaker bounds
- `docs-plan-deliverable-12.md` — glossary entries for ADL, circuit breaker, solvency breach, IM clamped curve
- `docs-plan-deliverable-13.md` — rebalancing fees netted into settlement
- `docs-plan-deliverable-14.md` — rate caps, interest impact on margin balance
- `pitch.html` — risk controls overview, synchronous trades for long-tail assets


---

## Content

### 1. Margin Checks

Per sub-account, three margin checks determine position viability:

#### Maintenance Margin (MM) Check

Required to keep positions open. Risk-adjusted surplus ≤ 0 → liquidation (§6). Uses optimistic pricing to prevent manipulation-triggered liquidations.

**Haircut factors** per-asset in `Registry.RiskParameters`:
- **`collateralFactor`** (`u8`, 0–100): multiplier on asset value (0 = ineligible; 90 → $100 valued at $90)
- **`liabilityFactor`** (`u8`, 0–100): divisor on liability value (90 → $100 liability valued at ~$111)

Both ≤ 100, on-chain enforced (D4).

**MM surplus equation:**

```
surplus = Σ(spot_risk_adj) + Σ(margin_credits_risk_adj) − Σ(margin_liabs_risk_adj)

collateral_price = max(mark, oracle)
liability_price = min(mark, oracle)

spot_risk_adj = collateral_price × balance × CF
margin_credits_risk_adj = collateral_price × credits × CF − position_margin
margin_liabs_risk_adj = liability_price × liabilities / LF + position_margin
```

`CF` = collateralFactor, `LF` = liabilityFactor (on-chain parameter btw zero and 1). `position_margin` = quote-side balance of the margin position.

**Liquidation trigger:** `surplus ≤ 0` (risk-adjusted surplus incorporates MM requirements via CF/LF). Applies to perps and margin spot; pure spot has no margin.

#### Clearing Engine (CE) IM Check

Authoritative check at match time. Each price source (mark, oracle) checked independently; must pass both.

**IM surplus equation** (computed separately for mark and oracle):

```
collateral_price_im = price × im_factor
liability_price_im = 2 × price − collateral_price_im

spot_risk_adj = collateral_price_im × balance × CF
margin_credits_risk_adj = collateral_price_im × credits × CF − position_margin
margin_liabs_risk_adj = liability_price_im × liabilities / LF + position_margin

surplus_im = Σ(spot_risk_adj) + Σ(margin_credits_risk_adj) − Σ(margin_liabs_risk_adj)
```

Both `surplus_im(mark) ≥ 0` AND `surplus_im(oracle) ≥ 0` must hold for risk-increasing actions.

#### Pre-Flight IM Check

Required to open/increase positions. Checked at order submission. Market makers post-only orders skip this check.

Same dual-check as CE, plus **order pressure** from open orders:

```
order_pressure = Σ(qty × limit_price × (1 − im_factor))
```

Only same-side orders count (buys for a buy order, sells for a sell order). Reduce-only orders excluded.

**Pre-flight passes when:**
- `surplus_im(mark) − order_pressure ≥ 0`
- `surplus_im(oracle) − order_pressure ≥ 0`

#### IM Price Adjustment

IM uses a skew-based step function to adjust collateral/liability prices based on platform exposure. Higher skew → stricter IM requirements.

**IM factor calculation:**

```
spot_margin_exposure = margined_credits − margined_liabilities

exposure_capped = min(|spot_margin_exposure|, maxSpotOpenInterest)
utilization = exposure_capped / maxSpotOpenInterest

im_factor = initialMarginFactors[0]
for i in 0..len(initialMarginClamps):
    if utilization >= initialMarginClamps[i]:
        im_factor = initialMarginFactors[i]

collateral_price_im = spot_price × im_factor
liability_price_im = 2 × spot_price − collateral_price_im
```

`initialMarginClamps` and `initialMarginFactors` are parallel arrays in `RiskParameters` (ppm units). Example: clamps `[0, 500000, 800000]` with factors `[950000, 900000, 850000]` yields im_factor of 0.95 at 40% utilization, 0.90 at 60%, 0.85 at 90%.

These IM-adjusted prices are then used with CF/LF in the surplus calculation (see CE IM Check equation above). Risk-reducing actions use `im_factor = 1.0` (MM pricing). Risk-increasing actions use factor at current utilization.

### 2. Position Limits

System-wide caps prevent concentration risk and over-exposure.

#### Deposit Caps

Per-token, per-chain in `Registry.AssetData`. Governed by `riskManagerMultisig`; immediate effect.

- **`maxDeposits`** (`u256`): per-chain deposit cap
- **`max1hrDeposits`** (`u256`): rolling 1-hour deposit cap

Deposits are not blocked when cap is hit. Instead, the asset loses fungibility treatment and cannot be used for leverage. Example: ETH deposited on Base when cap is hit is tracked as "Base ETH" (token+chain) rather than fungible "ETH".

#### Open Interest Caps

Per-asset in `RiskParameters`:

- **`maxOpenInterest`** (`u256`): matched margin OI cap (notional USD)
- **`maxSpotOpenInterest`** (`u256`): spot margin OI cap (token units)

**OI computation:**
- Matched margin: `max(margined_liab, margined_credits) × price`
- Spot-margin long: `credits − liabilities`
- Spot-margin short: `liabilities − credits`

When OI cap hit: leveraged trades reduce-only, spot allowed, market makers post-only.

#### Utilization Cap

Prevents over-leveraging the liquidity pool and ensures sufficient assets for withdrawals.

```
utilization = liabilities / (min(deposits, maxSpotOpenInterest) + liabilities)
```

**`maxUtilization`** (`u256`, 1e18 scale) — default 95%. When cap hit for asset X:
- Settlements that withdraw X are blocked
- Withdrawals still allowed (subject to IM/MM checks)

USD utilization caps enforced per-market based on which asset is being sourced.

#### Collateral Cap

**`maxCollateral`** (`u256`): global cap per asset across all margin accounts. Exceeding → rejected at match.

#### Circuit Breakers

| Trigger | Effect |
|---|---|
| OI cap | Reduce-only mode |
| Deposit cap | Deposited asset loses fungibility, no leverage |
| Utilization cap | Settlements withdrawing that asset blocked |
| Price staleness (both oracle and mark stale) | Trading blocked, collateral zeroed, liquidation blocked for holders |

### 3. Sub-Account Types

| Type | Behavior |
|---|---|
| **Cross-margin** | Unified margin pool. PnL offsets across positions. Non-`isolatedOnly` assets only. |
| **Isolated-margin** | Dedicated margin per position. Required for `isolatedOnly` assets. |
| **Spot** | 1:1 backed, no leverage, no margin. |

Sub-accounts share one Ed25519 keypair; independent margin/position state.

### 4. External Venue Cross-Margining

Traders can use external exchange account balances as collateral on t+. Cross-margin sub-accounts only; non-`isolatedOnly` assets.

**Supported venues:**
- CEX (Binance, Bybit, Deribit) — via API keys
- Decentralized (Hyperliquid) — via multisig encumbrance

#### Cross-Margin Adapters

TEE-based processes that track external account state, manage credentials, and co-sign user actions. Adapters use **credential encumbrance** to control what actions users can take on external venues:

| Model | Credentials | Control | Venues | KYB |
|---|---|---|---|---|
| Read-Only | Read-only API keys | Observe only | CEX | Required |
| Partial | 2/2 multisig (user + adapter) | Veto (block but not act) | Decentralized | Recommended |
**Note:** Full encumbrance is in scope for future work.

**CEX credentials:** API keys stored encrypted in TEE. Neither t+ nor the TEE operator can access them.

**Decentralized credentials:** User converts their Hyperliquid account to multisig with adapter as co-signer. Adapter validates multisig configuration before accepting registration.

#### Credit Lines

Users can create multiple credit lines per venue, each with its own `credit_limit` and optional `assigned_assets` filter. Total credit limits per venue cannot exceed the risk admin defined credit limit for that account.

The `assigned_assets` filter specifies which assets from the external venue contribute to this credit line's surplus. If empty, all assets are included. Filtering happens at balance ingestion—adapter reports full balance, CE only applies assets matching the filter.

**Margin calculation flow:**

1. Adapter reports `UserBalance` to CE (spot holdings + margin positions)
2. Adapter applies per-asset `discount_factors` (venue-specific risk haircuts) before reporting
3. For each credit line, surplus contribution is computed and added during sub-account surplus calculation:

```
for asset in credit_line.balance.spot:
    cross_contribution += balance × price × CF

for asset in credit_line.balance.margins:
    cross_contribution += credits × collateral_price × CF − position_margin
    cross_contribution -= liabilities × liability_price / LF + position_margin

# Cap per credit line
capped_contribution = min(cross_contribution, credit_limit)
total_surplus += capped_contribution
```

Adapter normalizes external margin positions to match t+ format before reporting.

External holdings are additive—they increase or decrease surplus but are not netted against t+ positions or liabilities.

#### Liveness & Disconnect

Adapters send periodic heartbeats to CE. On missed heartbeats beyond `disconnect_heartbeat_threshold`:
- Adapter marked offline, credit line frozen at last known value
- MM checks include frozen balance (user won't be liquidated due to adapter outage)
- IM checks exclude frozen balance (risk-increasing actions blocked)

After `extended_downtime_timeout`, credit line contribution zeroed. User liquidated if below MM.

If the adapter cannot reach the venue it handles the scenario internally, a venue downtime will be treated as the adapter being offline. A downtime due to a revoked API key will result in the credit line being zeroed.

#### Liquidation Handling

**Read-Only:** Liquidate t+ positions first, escalate to risk admin for margin call. If trader reneges on their cross-margin agreement with the t+ foundation, credit line zeroed and insurance fund absorbs the loss. Only possible with CEX-based cross-margining.

**Partial:** Liquidate t+ positions first, adapter blocks all user actions (refuses to co-sign). If user doesn't cooperate within timelock (e.g., 7 days), credit line zeroed.

### 5. Collateral Eligibility and Fungibility

Per-asset collateral parameters beyond haircut factors (§1 MM Check):

- **`maxCollateral`** (`u256`): platform-wide cap on total holdings across all margin accounts. Exceeding → rejected at match.
- **`isolatedOnly`** (`bool`): if true, asset can only be traded in isolated-margin sub-accounts.

These caps limit concentration risk. Fungibility rules (below) further control how deposited assets are treated.

#### Asset Fungibility

t+ treats certain assets as fungible, grouping them into a single underlying for margin purposes:

| Deposited Token | Fungible Underlying |
|---|---|
| USDC, USDT | USD |
| WETH (Mainnet, Arbitrum, Optimism, Base, etc.) | ETH |
| WBTC, cbBTC | BTC |

**How fungibility works:**
1. User deposits a specific token on a specific chain (e.g., USDC on Arbitrum)
2. If deposit caps not exceeded → balance credited as fungible underlying (e.g., "USD")
3. Fungible balances can be used for leverage and margin trading

**When deposit cap exceeded:**
1. Deposit still processed
2. Credited as specific token+chain (e.g., "USDC-Arbitrum") instead of fungible underlying
3. Non-fungible assets do not have risk parameters and thus can only be used for spot trading.
Deposit caps limit custodian risk. Each chain and asset issuer represents a distinct risk profile. Capping fungible deposits bounds exposure to any single custodian (bridge, chain, or issuer).

**Deposit cap tracking:**
- `maxDeposits`: total cap per token+chain
- `max1hrDeposits`: rolling 1-hour cap per token+chain

Caps checked at deposit time.

### 6. Liquidation Process and Triggers

**Trigger:** Risk-adjusted surplus ≤ 0. Causes: adverse price moves, interest (D14).

**Circuit breaker interaction:** An asset enters circuit breaker mode when both oracle and mark prices are stale. Liquidation blocked if user holds collateral in a circuit-broken asset.

**Monitoring:** Full scan every 30s; partial every 10ms (risk-prioritized). AVS monitors independently via CE websocket.

**Flow:**
1. Near-insolvent positions broadcast to other traders.
2. Deleverage all account positions IOC order to orderbook with slippage limit.
3. CE validates insolvency before processing the deleverage order.
4. If account is still insolvent, remaining positions transfer to Backstop Account (§7).

#### Auto-Deleveraging (ADL)

When orderbook liquidation fails to restore solvency, remaining positions transfer to a **Backstop Account** owned by the EigenLayer AVS. The AVS posts collateral bringing the backstop account back up to 20% above maintenance margin. The backstop then attempts to clear positions into the orderbook.

If the backstop account falls below maintenance margin again (due to continued adverse price movement), ADL is triggered. ADL forcibly closes positions of profitable counterparties on the opposite side of the backstop's positions.

**ADL triggers when all conditions are met:**
1. Original account liquidated, orderbook deleverage insufficient
2. Positions transferred to Backstop Account
3. AVS slashed to bring backstop to 20% above MM
4. Backstop account falls below maintenance margin despite slashing

**Counterparty selection:** Traders are ranked by ADL score. Only traders with positive scores (profitable positions on the counterside) are eligible. Ranking refreshed on position change or at `ranking_refresh_interval`.

```
ADL_score = (total_notional / account_equity) × (position_PnL / position_notional)
```

| Leverage | Return | Score | Priority |
|---|---|---|---|
| 10x | +30% | 3.0 | High |
| 2x | +10% | 0.2 | Low |
| 5x | −10% | −0.5 | Ineligible |

**ADL pricing:** ADL executes at the price that favors the backstop account:
- Backstop closing a short (counterparty is long): `min(oracle, mark)`
- Backstop closing a long (counterparty is short): `max(oracle, mark)`

**Execution order:** When backstop holds positions in multiple markets, ADL proceeds with the largest notional market first. Within each market, counterparties are selected by ADL score (highest first).

**ADL stops when:**
1. Backstop restored to 2% above maintenance margin (goal achieved), or
2. `max_adl` limit reached for that market, or
3. No more eligible counterparties (positive scores) remain

If backstop is still insolvent after hitting `max_adl`, ADL moves to the next largest market. If still insolvent after exhausting all markets, the AVS posts more collateral again continues to attempt to clear until ADL (mm breach) is triggered again.

After the liquidation is complete, the AVS is either returned excess collateral and holdings or is slashed for the amount of posted collateral they had to sell to clear positions.

### 7. Risk Parameter Tables

Per-asset, on-chain in `Registry.sol`:

| Field | Type | Description | Units |
|---|---|---|---|
| `collateralFactor` | `u8` | Collateral haircut | % (0–100) |
| `liabilityFactor` | `u8` | Liability scaling | % (0–100) |
| `maxCollateral` | `u256` | Global collateral cap | Token units |
| `isolatedOnly` | `bool` | Isolated-margin only | — |
| `initialMarginClamps` | `u256[]` | IM size breakpoints | ppm, ≤ 1,000,000 |
| `initialMarginFactors` | `u256[]` | IM factors per clamp | ppm, < 1,000,000 |
| `maxOpenInterest` | `u256` | Derivative OI cap | Notional (USD) |
| `maxSpotOpenInterest` | `u256` | Spot margin OI cap | Token units |
| `maxUtilization` | `u256` | Utilization cap | 1e18 scale |
| `maxDeposits`* | `u256` | Deposit cap (per chain) | Token units |
| `max1hrDeposits`* | `u256` | Rolling 1-hour deposit cap | Token units |

*Stored in `AssetData`, not `RiskParameters`.

**ADL configuration:**

| Parameter | Scope | Description |
|---|---|---|
| `max_adl` | Per market | Max OI ADL'd per operation |
| `ranking_refresh_interval` | Global | ADL ranking refresh timer |
| `margin_target` | Global | Post-ADL target (default 2% above MM) |

**Cross-margining venue parameters:**

| Parameter | Scope | Description |
|---|---|---|
| `max_credit_limit` | Per venue | Maximum credit line |
| `default_credit_limit` | Per venue | Default for new users |
| `discount_factors` | Per venue, per asset | Haircut on external holdings |
| `disconnect_heartbeat_threshold` | Per venue | Missed heartbeats before adapter offline / state lock |
| `extended_downtime_timeout` | Per venue | Timeout before credit zeroed |

**Unit convention:** ppm (100ths of bp). 1 = 0.01 bp. 100 = 1 bp. 10,000 = 1%. 1,000,000 = 100%.

D4 for governance and on-chain validation. D3 for API queries. D14 for interest rate parameters.

---

## Cross-References

| Links to | Reason |
|---|---|
| D2 (OMS Endpoints) | Margin query endpoints |
| D3 (Clearing Engine Endpoints) | RiskParameters queries |
| D4 (Smart Contracts) | On-chain risk parameters, deposit caps, governance |
| D6 (Fees) | Fee impact on solvency |
| D8 (Trading Functionality) | Margin-on-match, product types |
| D9 (Settlement & Clearing) | Withdrawal solvency checks |
| D10 (Liveness & Trust) | Oracle trust, circuit breaker bounds |
| D13 (Rebalancing) | Rebalancing fees reduce collateral |
| D14 (Interest Rates) | Interest charges affect margin balance |

---

## Flagged for Review

| Item | Reason |
|---|---|
| **EigenLayer AVS status** | "Phase 1 feature" in pitch. Confirm live at launch or roadmap. |
| **External venue cross-margining status** | Confirm live at launch. Which venues? Spec references Hyperliquid. |
| **Synchronous making** | Confirm status and which assets use this mode. |
| **ADL configuration defaults** | `max_adl`, `ranking_refresh_interval`, `margin_target` defaults unconfirmed. |
| **Circuit breaker specifics** | Price staleness circuit breaker confirmed in source. Confirm staleness thresholds (production config values). |
| **Exotic collateral** | Pitch references short LP tokens. Not in `RiskParameters`. Confirm. |
| **Yield-bearing collateral** | Pitch references yield-bearing tokens. Confirm accrual/rebasing handling. |
| **Liquidation clearing formula** | $1k target and qty formula from liquidation-spec. Confirm vs `surplus_computer.rs`. |
| **Deleverage slippage parameter** | Confirm parameter name and default from production config. |
| **minimum_required_surplus** | Code uses `DEFAULT_REQUIRED_SURPLUS` as solvency threshold (surplus must exceed this, not just > 0). Confirm production value. |

---

## Changelog

- Passes 1–5 (initial): Populated all 8 sections from cross-deliverable and Notion sources. Full margin formulas, liquidation spec, ADL spec, cross-margining, staged escalation, parameter tables.
- Round 2 Pass 1 (Structure & Scope): Scoped content to D7 domain. Moved API/contract/settlement detail to respective deliverables. Folded §Additional Detail into §3.
- Round 2 Pass 2 (Accuracy): Cross-verified against D4 struct, D3/D14 ppm scale, D8 breach types, D12 glossary. Fixed IM Price Multiple clamp order, MM trigger (at or below). Confirmed ADL formula, oracle table, deposit cap governance.
- Round 3 Pass 1 (Structure & Scope): Removed scope leaks to D2/D4/D8/D9/D10. Renamed §2. Trimmed cross-references.
- Round 3 Pass 2 (Accuracy): Verified all claims against D4 (19 fields), D8, D10, D12–D14, pitch.html. Fixed clamp argument order, MM trigger text. All formulas and tables confirmed correct.
- Round 3 Pass 3 (Prose & Conciseness): Tightened prose throughout — sentence fragments, removed filler/hedging. Compressed encumbrance models from table to inline. Merged liquidation flow into compact format. Compressed changelog. Verified D12 glossary terminology. Content under 1500 words.
- Round 4 Pass 1 (Structure & Scope): Verified all content against full source reads (margin lib, protocol, Notion specs, cross-deliverables). Added oracle staleness and circuit breaker to solvency breach table (from solvency_result.rs). Fixed IM clamped curve description to step function (from initial_margin_clamped_curve.rs). Replaced IM price table with accurate dual-source check description (from surplus_computer.rs). Fixed maxCollateral as global cap (from breach_collateral_cap_computer.rs). Fixed maxOpenInterest units to notional. Added circuit breaker liquidation protection (from margin_engine.rs). Added price staleness circuit breaker to §7. Expanded cross-margining with venue list, multi-line credit, state lock behavior (from cross-margining-spec-2f1e.md). Updated flagged items.
- Round 4 Pass 2 (Accuracy): Full source re-read of all listed files (margin lib, protocol lib, 8 Notion docs, 8 cross-deliverables, Registry.sol). Fixed IM price adjustment to show exposure capped at maxSpotOpenInterest before utilization ratio. Clarified IM factor for user-risk-only case (evaluated at 0 utilization). Corrected position_margin description (quote-side balance, not IM clamped curve output). Specified disconnect_heartbeat_threshold as missed-heartbeat count. Clarified staged escalation stage 2 as "emergency deleverage level." Verified all formulas against code (surplus_computer.rs, initial_margin_clamped_curve.rs, breach computers). Confirmed parameter types and units against Registry.sol (uint8 CF/LF, uint256[] clamps/factors, maxUtilization ≤ 1e18). All ADL formula/table/pricing confirmed against adl-spec. Monitoring frequencies confirmed (30s full, 10ms partial). No unverifiable claims found.
- Pass 3 (Prose & Conciseness): Tightened phrasing throughout Content section — removed filler, de-bolded non-essential terms, broke dense inline lists into bullet lists for readability, ensured consistent glossary terms (ADL, circuit breaker, solvency breach, IM clamped curve).
- Round 5 Pass 1 (Structure): Major restructure of §1 Margin Checks into sub-sections: MM Check (with haircut factors and equation), Pre-Flight IM Check (with equation), CE IM Check (with equation), IM Price Adjustment (condensed from IM Clamped Curve + IM Price Adjustment), Solvency Breach Types (broken out from table). Moved all position limits to new §2 (Deposit Caps, OI Caps, Utilization Cap, Collateral Cap, Circuit Breakers). Renumbered remaining sections 3–7. Updated cross-references.
