# Deliverable 13: Rebalancing Mechanism (Deposit/Withdrawal Fees & Incentives)

## Source Material

- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/rebalancing-spec-250e.md` — primary rebalancing spec: fee/reward formulas, weight system, pending withdrawal handling
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/sprints/ce-rebalancing-fee-implementation-cdfc.md` — acceptance criteria, Liquidity Manager, fee/reward calculation
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/sprints/ce-withdrawal-fee-storage-and-charging-a973.md` — withdrawal fee estimation/storage, cancellation fee logic
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/sprints/ce-depositsettlement-ingestion-fee-and-reward-hand-25b7.md` — deposit/settlement fee/reward handling, global fee account
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/sprints/sc-asset-registry-add-min-weight-to-assetdata-4f40.md` — planned `minWeight` (AssetData) and `bufferMultiple` (RiskParameters) fields
- `docs-plan-deliverable-4.md` — Registry `feeAccount()`, `AssetData` and `RiskParameters` structs (confirms `minWeight`/`bufferMultiple` absent from current contract)
- `docs-plan-deliverable-6.md` — fee account dual purpose (trading fees + rebalancing fees), per-asset sub-balances
- `docs-plan-deliverable-9.md` — rebalancing fees netted into settlement amounts, withdrawal lifecycle
- `docs-plan-deliverable-12.md` — glossary entries: Rebalancing Fee, Rebalancing Reward, Fee Account, Buffer Multiple, MinWeight, Vault Weight, Netting

---

## 1. Problem Statement

t+ holds the same asset (e.g., USDC) in vaults across multiple chains. Uneven deposit/withdrawal patterns can drain one chain while over-concentrating another. The Liquidity Manager applies rebalancing fees to imbalance-worsening actions and rewards to balance-restoring ones.

## 2. Target Liquidity Distribution and Vault Weights

Each vault has a **MinWeight** per asset — its target share of cross-chain liquidity.

> **Note:** `minWeight` (`Registry.AssetData`) and `bufferMultiple` (`Registry.RiskParameters`) are planned fields, not yet deployed. Formulas reflect the planned design. See D4 Flagged for Review.

```
min_percent = weight / (sum(all_weights) × buffer_multiple)
```

| Parameter | Description |
|---|---|
| `weight` | Per-asset, per-chain value (`minWeight` on `AssetData`) |
| `sum(all_weights)` | Sum of weights across all chains for this asset |
| `buffer_multiple` | Per-asset scaling factor (`bufferMultiple` on `RiskParameters`); higher value = more tolerance before fees trigger |

**Underweight:** actual share < `min_percent`. **Overweight:** actual share ≥ `min_percent`.

### Example — USDC Across Three Chains

| Chain | Weight | Min % (buffer = 2) |
|---|---|---|
| Mainnet | 3 | 3 / (8 × 2) = 18.75% |
| Arbitrum | 3 | 3 / (8 × 2) = 18.75% |
| Base | 2 | 2 / (8 × 2) = 12.5% |

With `buffer_multiple = 2`, minimum targets consume 50% of capacity. Shifts within the remaining 50% do not trigger fees.

## 3. Fee/Reward Mechanism

Actions pushing a vault below `min_percent` incur a fee; actions restoring an underweight vault earn a reward.

| Action | Fee (worsens balance) | Reward (restores balance) |
|---|---|---|
| **Deposit** | Into overweight vault | Into underweight vault |
| **Withdrawal** | From underweight vault | — |
| **Settlement `token_out`** | From underweight vault | — |
| **Settlement `token_in`** | — | Into underweight vault |

- Fees and rewards **capped at 2.5%**.
- Netted into settlement amounts — no separate fee field. See D9 (netting), D6 (trading fees).
- Rewards funded from the **Fee Account** (`Registry.feeAccount()`), which accumulates rebalancing and trading fees. CE maintains per-asset sub-balances. **Self-funding guarantee:** rewards never exceed accumulated fees for that asset.
- **Pending withdrawals** included in weight calculations pessimistically (only when doing so increases fee or decreases reward) to prevent gaming.
- **Minimizing fees:** Query `VaultClient.get_vault_balances(asset)` (D3) before transacting. Deposit on underweight chains; avoid withdrawing from underweight chains.

## 4. Calculation Formulas

Variables: `pre_weight` and `post_weight` = vault's share of total asset liquidity before/after the action. Weight variables defined in §2.

### Fee Rate

Applies when `post_weight < min_weight` (vault underweight after action), whether already underweight or crossing the threshold.

```
fee_rate = (1 - (pre_weight + post_weight) / 2) / min_weight × 0.025
```

Clamped to **2.5%**. Fee increases further below target. Cross-chain settlements sum fees across affected underweight vaults. See Flagged for Review for trigger boundary details.

> **Note:** Reward formula inferred from fee formula structure and `min(min_weight, post_weight)` clamp. D12 confirms both formulas and 2.5% cap. Primary source (`rebalancing-spec-250e.md`) unavailable for verification.

### Reward Rate

```
reward_rate = (1 - (pre_weight + min(min_weight, post_weight)) / 2) / min_weight × 0.025
```

`min()` clamp ensures only the portion up to `min_weight` earns a reward. Capped at 2.5% and at Fee Account balance.

## 5. Worked Examples

All examples use the §2 weight table (Mainnet/Arbitrum weight = 3, Base = 2, `buffer_multiple = 2`).

### Example 1: Withdrawal Fee (Capped)

USDC on Arbitrum. `min_percent = 18.75%`. Vault share: 20% → 15% after $50k withdrawal.

```
fee_rate = (1 - (0.20 + 0.15) / 2) / 0.1875 × 0.025
         = (1 - 0.175) / 0.1875 × 0.025
         = 0.825 / 0.1875 × 0.025
         = 4.4 × 0.025
         = 0.11 → clamped to 0.025 (2.5%)

fee = $50,000 × 2.5% = $1,250
```

Unclamped rate (11%) exceeds cap — average weight (17.5%) well below `min_weight`.

### Example 2: Deposit Reward (Capped)

USDC on Arbitrum at 15%, `min_percent = 18.75%`. $30k deposit restores vault to 18%.

```
reward_rate = (1 - (0.15 + min(0.1875, 0.18)) / 2) / 0.1875 × 0.025
            = (1 - (0.15 + 0.18) / 2) / 0.1875 × 0.025
            = (1 - 0.165) / 0.1875 × 0.025
            = 0.835 / 0.1875 × 0.025
            = 4.453 × 0.025
            = 0.1113 → clamped to 0.025 (2.5%)

reward = $30,000 × 2.5% = $750
```

Reward paid from Fee Account, subject to available balance.

### Example 3: No Fee

USDC on Mainnet at 35%, `min_percent = 18.75%`. $20k withdrawal → 33%. Vault remains overweight — **no rebalancing fee**.

---

## Flagged for Review

| Item | Reason |
|---|---|
| **`minWeight` / `bufferMultiple` not in contract** | Planned, not in current `Registry.sol`. All formulas based on planned design. |
| **Primary source docs not in repo** | `rebalancing-spec-250e.md` and 4 sprint tickets missing. Content synthesized from D4, D6, D9, D12. |
| **Reward rate formula inferred** | `min(min_weight, post_weight)` clamp consistent with D6/D12 but unverified against primary spec. |
| **Fee formula vs. table inconsistency** | §3 table: deposits into overweight vaults incur fees. §4 formula: only applies when `post_weight < min_weight`. Depositing into an overweight vault keeps `post_weight > min_weight`, so the formula would not trigger. Primary spec needed to resolve. Also unclear if overweight→underweight crossover fees apply to full amount or below-target portion only. |
| **Cancellation fee specifics** | Fee on cancelled withdrawal unspecified. See D9. |
| **Multi-vault fee summation** | Additive vs. compound summation across underweight vaults unspecified. |
| **2.5% cap always binds** | For realistic `min_weight` (≤0.20), any underweight vault triggers cap. Graduated formula may only differentiate via partial-amount application. Needs spec confirmation. |

---

## Changelog

- Pass 1 (Structure & Scope): Reorganized from 10 sections to 5-section target structure. Removed lifecycle/timing details (→ D9), on-chain configuration (→ D4), contract surface details (→ D4), settlement signing mechanics (→ D9), and attack prevention internals. Condensed global fee account to inline description in §3. Added Example 2 (deposit reward) and Example 3 (no fee). Trimmed Flagged for Review from 11 to 9 items. Cut from ~1400 words to ~850 words.
- Pass 1 (Structure & Scope, refinement): Promoted `minWeight`/`bufferMultiple` planned-status warning to callout in §2. Added D4 §6.3 cross-reference for `feeAccount`. Added D6 cross-reference for trading fees. Resolved D4/D9 scope verification flagged items (confirmed both cover their material). Removed attack-prevention and lifecycle flagged items (verified as D4/D9 scope). Identified that 2.5% cap always binds for realistic weight values — added to Flagged for Review. Reduced flagged items from 9 to 7.
- Pass 2 (Accuracy): Added Source Material section listing all primary sources (5 NOT FOUND in repo) and 4 cross-deliverable sources (D4, D6, D9, D12). Fixed fee account description: single on-chain account with per-asset sub-balances maintained off-chain by CE (verified against D4 §6.3 and D6 §6). Added self-funding guarantee label. Added user guidance note on querying vault weights to minimize fees (cross-ref D3 §4). Clarified fee formula trigger description for overweight-to-underweight crossover case. Updated reward formula note with D12 corroboration details. Updated Flagged item for primary source docs to list all 4 missing tickets. Verified all formulas and worked example arithmetic — no errors found.
- Pass 3 (Prose & Conciseness): Tightened all sections — cut filler, shortened headings, condensed bullet points and Flagged items. Aligned terminology to D12 glossary (Fee Account, MinWeight, Buffer Multiple, Vault Weight). Removed redundant explanatory sentences after worked examples. Body content ~750 words, under 1000 target.
- Pass 1 (Structure & Scope): Renamed §2 to match target structure ("Target Liquidity Distribution and Vault Weights"). Added Liquidity Manager (CE component) attribution to §1. Added introductory sentence to §3 clarifying fee/reward directionality before the table. Replaced §4 variable table with forward-reference to §2 definitions. Relocated reward formula provenance note between fee and reward subsections. Fixed "Overweight" definition to ≥ (at-target = no fee). Removed overly specific D3 sub-section cross-ref. No scope changes — all content verified against D13 scope map.
- Pass 2 (Accuracy): Verified all claims against D4, D6, D9, D12. Confirmed: minWeight/bufferMultiple planned-not-deployed status (D4 §6.1), 2.5% cap (D12), fee account dual purpose with per-asset sub-balances (D6 §6, D12), netting into settlement amounts (D9 §1, D6 §6), Liquidity Manager as CE component (D12). All worked-example arithmetic verified correct. Expanded Flagged item on fee formula trigger boundary to capture inconsistency between §3 table (deposits into overweight vaults incur fees) and §4 formula (only applies when post_weight < min_weight). No other factual errors found.
- Pass 3 (Prose & Conciseness): Cut filler words, redundant phrases, and unnecessary qualifiers throughout. Aligned terminology to D12 glossary (Fee Account, MinWeight). Condensed Flagged for Review descriptions. No content added or facts changed.
