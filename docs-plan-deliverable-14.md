# Deliverable 14: Interest Rates (Borrow & Funding Rates)

## Scope

Formula and parameter reference for utilization-based borrow rates, skew-based funding rates, hourly accrual, rate caps, and payment distribution.

**Boundaries:** Rate query endpoints → D3 | Trading fees → D6 | Margin/risk → D7 | Settlement → D9 | Rebalancing fees → D13

---

## Source Material

### Protocol docs
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/interest-rate-spec-236e.md` — interest rate foundational spec
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/interest-rate-calculations-2d3e.md` — borrow and funding rate computation spec
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/funding-rate-calculations-2a3e.md` — archived funding rate approaches
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/interest-rate-tracking-2a2e.md` — rate engine architecture overview

### tplus-core (rate computation)
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/interest-engine/src/rate_computers/borrow_rate_computer.rs` — borrow rate curve
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/interest-engine/src/rate_computers/funding_rate_computer.rs` — funding rate formula
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/interest-engine/src/data/aggregator.rs` — TWA aggregation

### tplus-core (rate application)
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/interest/interest_handler.rs` — hourly interest cycle
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/interest/funding.rs` — funding charge/distribute
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/interest/utilization.rs` — utilization charge/distribute

### Cross-reference sources
- `docs-plan-deliverable-3.md` — Rate struct, rate query endpoints (D3 §6)
- `docs-plan-deliverable-4.md` — Registry RiskParameters struct, on-chain validation rules
- `docs-plan-deliverable-7.md` — Rate caps, solvency enforcement, RiskParameters 19-field struct
- `docs-plan-deliverable-8.md` — Product type table (spot, margin spot, perps) with rate applicability
- `prompts/deliverable-14-context.md` — Deliverable scope and structure definition

---

## Content

**Rate units:** `RISK_PARAM_RATE_SCALING_DENOMINATOR` = 1,000,000 (ppm). 1,000,000 = 100%; 10,000 = 1%; 100 = 1 bp. All rates **per hour**.

`Rate` struct (per asset, per epoch):

| Field | Type | Description |
|---|---|---|
| `funding_rate` | `i32` | Signed; positive = longs pay shorts |
| `utilisation_rate` | `u32` | Base asset borrow rate |
| `quote_utilisation_rate` | `u32` | Quote (USD) borrow rate |

### 1. Borrow Rate Model

Borrowers pay depositors proportional to pool utilization via a kink-based curve. Two independent curves per asset: base borrows and USD (quote) borrows. USD rates are **per-market** to prevent cross-market distortion.

### 2. Borrow Rate Formula

**Utilization:**

```
margin_cap = min(avg_deposits, max_spot_open_interest)    // 0 → use avg_deposits
utilization = avg_liabilities / (margin_cap + avg_liabilities)
```

Scaled to ppm: `[0, 1_000_000]`. Zero denominator → 1,000,000 (full utilization). Inputs are time-weighted averages (TWA) over the epoch, tracked by the `Aggregator` per asset and reset each epoch. For quote rates, `max_spot_open_interest` is converted to notional via oracle price.

**Kink-based rate curve:**

```
kinks = [u₀, u₁, ..., uₙ], rates = [r₀, r₁, ..., rₙ]
Constraints: u₀ = 0, uₙ = 1_000_000, monotonically increasing, same length
If uₖ ≤ u < uₖ₊₁:
  borrow_rate = rₖ + (rₖ₊₁ - rₖ) × (u - uₖ) / (uₖ₊₁ - uₖ)
```

**On-chain parameters** (`RiskParameters`):

| Curve | Kink Parameter | Rate Parameter |
|---|---|---|
| Base asset | `utilization_kinks` | `rate_at_kinks` |
| Quote (USD) | `quote_utilization_kinks` | `quote_rate_at_kinks` |

#### Worked Example

`kinks = [0, 800_000, 1_000_000]`, `rates = [0, 500, 5_000]`:

- 60% util (u = 600,000): `0 + 500 × 600,000 / 800,000 = **375** ppm/hr` (≈ 328.5% APR)
- 90% util (u = 900,000): `500 + 4,500 × 100,000 / 200,000 = **2,750** ppm/hr` (≈ 2,409% APR)

APR conversion: `rate_ppm × 24 × 365 / 1,000,000 × 100%`.

### 3. Funding Rate Model

Skew-based. Transfers payments from the overweight side to the underweight side, incentivizing OI balance. Positive rate = longs pay shorts. In t+'s spot-margin hybrid, funding manages both risk (spot-margin exposure cannot be ADL'd) and liquidity (directional flow depletes deposits).

### 4. Funding Rate Formula

```
funding_rate = clamp(skew_component + premium_component, -max_funding_rate, +max_funding_rate)
```

**Skew component** — quadratic beyond cliff deadzone:

```
effective_skew = clamp(avg_skew, -skew_cliff, +skew_cliff)
excess_skew    = avg_skew - effective_skew
skew_component = skew_factor × excess_skew² × sign(excess_skew) / SCALING_DENOM
```

`avg_skew = (avg_long_oi - avg_short_oi) / oi_cap`, TWA over epoch.

**Premium component** — pulls toward base rate:

```
premium_component = avg_premium + clamp(base_funding_rate - avg_premium, -premium_clamp, +premium_clamp)
```

`premium = (max(bid - oracle, 0) - max(oracle - ask, 0)) / oracle` using impact bid/ask prices, TWA over epoch.

**Parameters** (`RiskParameters`):

| Parameter | Type | Description |
|---|---|---|
| `skew_factor` | `u32` | Skew sensitivity (K) |
| `skew_cliff` | `u32` | Deadzone threshold |
| `base_funding_rate` | `i32` | Signed base rate/hr |
| `premium_clamp` | `u32` | Premium adjustment bounds |
| `max_funding_rate` | `u32` | Rate cap (e.g., 1142 ≈ 1000% APR) |

#### Worked Example

`skew_factor = 1000`, `skew_cliff = 3000`, `base_funding_rate = 5000`, `premium_clamp = 2000`, `max_funding_rate = 10000`. Given `avg_skew = +5000` (long-heavy), `avg_premium = +100`:

1. **Skew:** `excess = 5000 - clamp(5000, -3000, 3000) = 2000`. Component = `1000 × 2000² / 1_000_000 = 4000`
2. **Premium:** `diff = 5000 - 100 = 4900`, clamped to `2000`. Component = `100 + 2000 = 2100`
3. **Total:** `4000 + 2100 = 6100`, clamped to `[-10000, +10000]` → **6100 ppm/hr** (longs pay shorts)

### 5. Hourly Accrual

Rates computed and applied **once per hour** (1-hour epochs):

1. CE sends `ComputeInterestRates` to Interest Engine (external VM)
2. Interest Engine computes borrow + funding rates from TWA data (updated on each state mutation, averaged over epoch)
3. CE validates each rate against `RiskParameters` caps (`max_funding_rate`, `max_utilization_rate`) — rejects batch if any rate exceeds caps
4. CE charges payers — iterates all margin accounts, applies utilization and funding charges per user
5. CE distributes — utilization fees to all depositors (spot + margin, TWA-weighted); funding fees to receiving side; excess funding to fee account; resets TWA averages

Interest Engine maintains a local view of deposits, liabilities, OI, skew, and premium from CE state mutations. Separating rate computation from application reduces CE complexity.

### 6. Rate Caps and Bounds

| Parameter | Scope | Example |
|---|---|---|
| `max_funding_rate` | Per-asset | 1142 ppm/hr ≈ 1000% APR |
| `max_utilization_rate` | Per-asset | 1142 ppm/hr ≈ 1000% APR |

**Per-user charge cap:** `find_maximal_chargeable_amount` = midpoint between distance-to-liquidation and distance-to-bad-debt. Interest can make a user liquidatable but not insolvent.

### 7. Payment Distribution

| Rate Type | Payers | Recipients | Charge Basis |
|---|---|---|---|
| **Borrow** | Margin borrowers (base or quote liabilities) | All depositors of that asset (TWA-weighted) | `liabilities × rate / SCALING_DENOM` → quote |
| **Funding** | Overweight side (longs if rate > 0) | Underweight side (shorts if rate > 0) | `position_size × abs(rate) / SCALING_DENOM` → quote |

**Charge-before-distribute invariant:** distribution rate = `min(original_rate, total_charged / total_eligible)`. Never distributes more than collected.

**Excess funding:** surplus goes to protocol fee account. If charges fall short (solvency caps), recipients receive proportionally less.

### 8. Rate Query Endpoints (Future: via IMS)

Per-asset borrow and funding rates will be exposed via the Information Management System (IMS), refreshing hourly. See D3 for the `Rate` response model and current endpoints.

---

## Flagged for Review

| Item | Note |
|---|---|
| TWA update frequency | Spec says "every slot"; code updates on each state mutation. Exact slot cadence undefined in rate sources. |
| Funding fee tiers | 14-day avg OI discount tiers in spec but absent from `funding_rate_computer.rs` — may be D6 scope. |
| `spot_oi_cap` naming | Resolved. Spec uses `spot_oi_cap`; `RiskParameters` field is `max_spot_open_interest`. Formulas use source field name. |

---

## Changelog

- Pass 0 (Structure & Scope): Restructured to 8-section layout. Removed out-of-scope content (D3/D4/D6/D7/D10). Reduced ~3500→~900 words.
- Pass 1 (Structure & Scope): Added IMS note to §8. Removed D6-owned funding fee tiers. Verified section/scope alignment.
- Pass 2 (Accuracy): Fixed ppm scale (was "10,000 = 1 bp", now 100 = 1 bp). Fixed D4 refs (→§6.1/§6.3). Fixed margin query ref (→D2 §5). Added APR to worked examples. Flagged D3 §6 unit error.
- Pass 3 (Prose & Conciseness): Cut redundant prose, tightened section intros and cross-refs, compressed Flagged/Changelog tables, expanded TWA acronym on first use. Content ~830 words.
- Pass 1 (Structure & Scope): Verified 8-section structure matches target. Trimmed §5 margin-impact detail (D7/D2 scope) to single cross-ref. No out-of-scope content found elsewhere. Section flow confirmed logical.
- Pass 2 (Accuracy): Verified all claims against D3 §6, D4 §6.1/§6.3, D7 §7, D8 §1. ppm scale, RiskParameters types, kink constraints, rate caps (1142 ≈ 1000% APR), APR formula, worked example arithmetic, and cross-refs all confirmed correct. Removed stale Flagged item (D3 §6 unit error already fixed in D3 pass 2). No new factual errors found; [NEEDS SOURCE] items remain pending external source access.
- Pass 3 (Prose & Conciseness): Removed redundant prose (piecewise-linear in §1 vs §2, solvency duplication in §5 vs §7), tightened section intros to fragments, compressed parameter table descriptions, cut filler words throughout.
- Pass 1 (Structure & Content): Regenerated from primary sources. Resolved all [NEEDS SOURCE]: exact utilization formula from `borrow_rate_computer.rs`, quadratic skew formula + premium formula from `funding_rate_computer.rs`, TWA aggregation from `aggregator.rs`, solvency cap behavior from `funding.rs`/`utilization.rs`. Added Rate struct definition, per-market USD rates, excess funding distribution to fee account, per-user charge cap formula. Corrected funding formula (no additive baseFundingRate — it's folded into premium component). Updated worked example with verified test values from source.
- Pass 2 (Accuracy): Read all 12 source files. Corrected `spot_oi_cap` → `max_spot_open_interest` (actual RiskParameters field name). Added zero-denominator behavior, quote-rate notional conversion note. Clarified §5 distribution targets (all depositors for utilization, receiving side for funding). Updated TWA description from "per-slot" to "per state mutation". Resolved Flagged naming item. All formulas, types, worked example arithmetic, and rate struct fields verified against source.
- Pass 3 (Prose & Conciseness): Tightened section headings, compressed table descriptions, removed filler/redundancy, merged §5/§6 validation detail, shortened worked example labels. Aligned terminology with D12 glossary.
