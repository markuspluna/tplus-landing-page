# Deliverable 12: Glossary & Reference

## Source Material

- **All other deliverable outputs** — pull terms from completed deliverables
- **`/Users/markuspaulsonluna/Dev/tplus-core/lib/client/src/ws.rs`** — TplusClient method signatures
- **`/Users/markuspaulsonluna/Dev/tpluspy/tplus/model/`** — all exported types
- **`/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/contracts.py`** — DepositVault, Registry, CredentialManager
- **`/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/trisk-archive-256e.md`** — archived risk parameters glossary
- **OMS Swagger** — https://oms.tplus.dev/swagger-ui/ (may not be current)

---

## 1. Glossary

Each entry: **Term** — definition (1–2 sentences). Cross-ref to deliverable(s).

### A

- **AccountStatsUpdate** — WS message pushed on inventory change via `/account/stats/{user_id}`. Requires bearer auth. → D2
- **ADL (Auto-Deleveraging)** — Forced position reduction against profitable counterparties when liquidation cannot fully close via orderbook. → D7
- **Asset Fungibility** — Same token (e.g., USDC) across chains treated as a single asset for trading and margining. → D1, D13
- **AssetData** — On-chain struct in `Registry` defining per-asset configuration (including deposit caps). → D4
- **AssetIdentifier** — Composite key `(symbol, chain_address)`. REST/WS format: hex address with chain ID suffix. → D2, D3
- **Atomic Settlement** — Single-tx settlement via `IAtomicSettlementCallback`. Requires a registered executor. → D4, D9
- **aTLS (Attested TLS)** — TLS with TEE attestation in the handshake. Provides channel integrity, eliminating per-request signing. → D2, D10
- **Attestation** — Cryptographic proof that specific code runs inside a TEE. Contains MRTD and a hardware-signed TDX quote. → D10
- **Available Margin** — `margin_balance - initial_margin`. Collateral available for new positions. → D7

### B

- **Balance** — Haircut-adjusted collateral value for an asset within a sub-account. Distinct from `Spot` (actual holdings). → D3
- **BaseClient** — Python SDK async HTTP/WS base class handling nonce-based auth and auto-refresh. → D5
- **BaseFundingRate** — Signed offset added to funding rate skew and premium components. In `RiskParameters`. → D7, D14
- **Batch Settlement** — Two-phase settlement (pull then push) used when atomic settlement is impractical. → D4, D9
- **Bearer Token** — 24-hour auth token obtained via nonce challenge-response with Ed25519 signature. → D2
- **Block Confirmations** — Per-chain confirmation count required before a deposit/withdrawal/settlement is final. In `ChainConfig`. → D4, D9
- **Borrow Rate** — Utilization-based interest rate charged to borrowers, computed hourly. → D14
- **Buffer Multiple** — Risk parameter scaling minimum collateral per vault relative to target weight. **Planned** — not in contracts yet. → D7, D13

### C

- **ChainConfig** — Per-chain parameters in `CredentialManager` governing block timing and confirmation requirements. → D4, D9
- **Charge-Before-Distribute** — IE invariant: never distribute more than collected from payers. → D14
- **Circuit Breaker** — Halts trading or withdrawals when predefined thresholds breach. → D7, D10
- **Clearing Engine (CE)** — High-risk VM (MPC+TEE) managing account state, margin, solvency, and settlement signing. → D1, D3
- **ClearingEngineClient** — Python SDK CE client with sub-clients for settlements, assets, decimals, deposits, withdrawals, and vaults. → D3, D5
- **CLEARING_ENGINE_DECIMALS** — Internal decimal precision: 18. Clients convert between on-chain token decimals and this value. → D3, D5
- **Collateral Factor** — On-chain `u8` (0–100) multiplied against asset value for margin. 90 → $100 counts as $90; 0 = ineligible; 100 = no haircut. → D7
- **Composable Liquidity** — Unified venue combining internal orderbook with external sources. MMs can settle atomically into external DEXes. → D4, D8
- **Confirmation** — Off-chain trade execution within TEE. Binding within t+ but not yet on-chain. → D1, D8, D9
- **Credential Manager** — Contract managing vault registration, admin sets, and update strategies. → D4, D10
- **credentialManagerChangeDelayBlocks** — Block delay between `lastSignatureUse` and credential manager change. Default: 14,400 (~1 hr on Arbitrum). → D4, D10
- **Cross-Margin** — Margin mode where all positions in a sub-account share one collateral pool. Default. → D7
- **Cum Cap Delta** — Cumulative capacity delta tracking net withdrawal impact. Determines withdrawal delay tier. → D9

### D

- **Deduplication** — Order-ID-based duplicate tracking at the orderbook. Distinct from on-chain nonces. → D2, D8
- **Deposit Cap** — Per-asset deposit limits: absolute (`maxDeposits`) and hourly rolling (`max1hrDeposits`). In `AssetData`. → D4
- **Deposit Ingestion** — CE process detecting on-chain deposits and crediting user accounts after required block confirmations. → D3, D9
- **DepositManager** — Python SDK helper (`tplus.evm`) handling ERC-20 approval and vault deposit. → D5
- **DepositVault** — Core per-chain contract holding user deposits. Executes settlements and withdrawals. → D4
- **Domain Separator** — EIP-712 domain identifier. Set once per DepositVault via `setDomainSeparator()` (reverts if already set). → D4, D9
- **DStack** — TEE orchestration platform managing deployment, replication, and restart of t+ confidential VMs. → D1, D10

### E

- **ECDSA/secp256k1** — EVM-native signature scheme. Supported alongside Ed25519 for order signing. → D2, D8
- **Ed25519** — Primary signature scheme. Public key = user ID (`bytes32`); private key signs orders and auth. → D2, D5
- **EigenLayer AVS** — Decentralized insurance backstop where operators restake to absorb bad debt. **Phase 1** — status unconfirmed. → D7, D10
- **EIP-712** — Typed structured data signing standard. Used for settlement signing (domain `"MyrtleWyckoff"`). Order signing uses binary `signable_part()`, not EIP-712. → D4, D9
- **Epoch Binding** — Withdrawal replay protection via `epochHash` tied to a CE state snapshot. → D9
- **Escape Hatch** — Emergency forced withdrawal via merkle proof against on-chain checkpoint. **Design-phase.** → D9, D10
- **Exposure Settlement** — Settling confirmed off-chain trades on-chain by transferring assets between vaults/users. → D1, D9

### F

- **Fee Account** — Global per-asset account accumulating trading and rebalancing fees. Configured via `Registry.setFeeAccount()`. → D6, D13
- **Fee Tier** — Volume-based fee schedule where 30-day rolling volume determines maker/taker rates. → D6
- **Funding Rate** — Hourly skew-based rate applied to perp positions. Components: skew, premium, base offset. → D14
- **Funding Rate Discount** — Volume-based discount on funding fees. Determined by 14-day average OI tier. → D6, D14

### G

- **Gossipsub** — Forked libp2p pub-sub protocol adapted for aTLS. Only publishes to attested peers. → D8, D10
- **GTC (Good-Til-Cancelled)** — Time-in-force: order remains open until filled or cancelled. → D8
- **GTD (Good-Til-Date)** — Time-in-force: order expires at a specified timestamp if not filled. → D8

### H

- **Haircut** — Discount on collateral value for margin. A 20% haircut means the asset counts at 80% of market value. → D7

### I

- **IAdminUpdateStrategy** — Solidity interface for chain-specific admin update strategies. Called via delegatecall. → D4, D10
- **IAtomicSettlementCallback** — Solidity interface for atomic settlement executors. Receives `tokenOut`, must return sufficient `tokenIn`. → D4, D9
- **IM (Initial Margin)** — Collateral required to open or increase a position. Checked at match time. → D7
- **IM Clamped Curve** — Position-size-dependent IM where marginal IM rises with position size. → D7
- **IM Price Multiple** — Skew-based IM adjustment increasing margin on the dominant side when skew is high. → D7
- **Interest Engine (IE)** — Low-risk VM (TEE only) computing hourly borrow and funding rates from TWA data. → D3, D14
- **InventoryChecks** — OMS pre-flight margin validation on order receipt. Definitive check occurs at match time via `MarginSolvencyVerifier`. → D2, D7
- **Isolated Margin** — Margin mode where a position has dedicated collateral separate from other positions. → D7
- **isolatedOnly** — `RiskParameters` boolean restricting an asset to isolated-margin sub-accounts only. → D7

### J

- **JSON Serialization** — Settlements/withdrawals use JSON (EIP-712). Orders use binary `signable_part()`. Sub-account transfers use bincode. → D2, D4

### K

- **Kink Curve** — Piecewise-linear interest rate model where rate increases sharply above kink breakpoints. → D14
- **Klines / Timebar** — Candlestick (OHLCV) data: open, high, low, close, volume with nanosecond timestamps. → D2

### L

- **Liability Factor** — Divisor (0–100) applied to liabilities in margin balance. 90 → $100 liability counts as ~$111. → D7
- **Light Client** — Trustless on-chain state access inside the TEE, avoiding reliance on an external RPC provider. → D1, D10
- **Liquidation** — Forced position closure when `margin_ratio ≤ 1.0`. Closed via orderbook; ADL triggers if insufficient. → D7
- **Liquidity Manager** — CE component tracking per-chain vault weights and computing rebalancing fees and rewards. → D13

### M

- **Maker Fee** — Fee charged to the resting order. Lower than taker fee; may be negative (rebate). → D6
- **Maker Queue** — Prioritized message queue for limit orders, cancels, and replaces. Lower latency than taker queue. → D2, D8
- **Margin Balance** — Weighted collateral minus weighted liabilities. Core solvency input. → D7
- **Margin Ratio** — `margin_balance / maintenance_margin`. Liquidation triggers at ≤ 1.0. → D7
- **Margin Spot** — Leveraged spot trading, treated like perps for risk purposes. Incurs hourly borrow interest. → D8, D14
- **Margin-on-Match** — Solvency checked at fill time, not at order submission. Enables quoting without locking collateral. → D1, D8
- **MarginPosition** — Leveraged position record per sub-account: market, size (positive=long, negative=short), entry price. → D3
- **MarginSolvencyVerifier** — OMS component performing the definitive solvency check at match time. → D2, D7
- **Mark Price** — Reference price for margin and liquidation. Resolution chain: last_trade → oracle → impact → None. → D7
- **maxFundingRate** — Per-asset hourly funding rate cap in `RiskParameters`. Hard max: 1142 (100ths of bp/hr ≈ 1000% APR). → D4, D14
- **maxUtilization** — Per-asset utilization cap in `RiskParameters` (1e18 scale). Order-gating threshold, not a rate input. → D7
- **maxUtilizationRate** — Per-asset hourly borrow rate cap in `RiskParameters`. Hard max: 1142 (100ths of bp/hr ≈ 1000% APR). → D4, D14
- **Merkle Proof** — State tree inclusion proof enabling escape hatch withdrawals. → D10
- **Mini-Batching** — WS optimization: up to 20 messages per frame. Clients must handle multiple messages per frame. → D2
- **MinWeight** — Planned per-asset, per-chain `AssetData` field defining target vault weight. **Not in contracts yet.** → D13
- **MM (Maintenance Margin)** — Minimum collateral to keep a position open. Breach triggers liquidation. → D7
- **MPC (Multi-Party Computation)** — Parties jointly compute a result without revealing individual inputs. Paired with TEE for high-risk operations. → D10
- **MRCONFIGID** — TD configuration measurement hash in a TDX quote. Identifies TEE environment configuration. → D10
- **MRTD** — Code measurement hash in a TDX attestation proving which binary runs inside the TEE. → D10

### N

- **Netting** — Consolidating multiple trades into net settlement amounts with fees folded in, reducing on-chain transactions. → D6, D9
- **Nonce** — Context-dependent counter: (1) auth challenge (random, 5-min expiry), (2) on-chain sequential counter per `(user, account)`, (3) order dedup (order-ID-based). → D2, D4
- **Non-Deterministic Oracle** — Oracle replicas may diverge within bounded tolerances without triggering consensus failure. → D7, D10

### O

- **OMS (Order Management System)** — Low-risk component (TEE only) handling order submission, validation, matching, and market data. → D1, D2
- **Open Interest Cap** — Max OI per asset for derivatives (`maxOpenInterest`) and spot margin (`maxSpotOpenInterest`). → D7
- **Oracle** — External price source for margin and liquidation, not trade matching. High-risk component (MPC+TEE). → D7, D10
- **ORDER_TYPEHASH** — EIP-712 type hash for settlement signing. Precomputed on `DepositVault`. → D4
- **Orderbook** — Price-time priority matching engine for spot, margin spot, and perps. → D2, D8
- **OrderBookClient** — Python SDK OMS client. Optional `user` parameter for authenticated operations. → D5
- **Outbox Clearing** — Escape hatch sub-process resolving signed-but-unexecuted withdrawals when TEE is unavailable. **Design-phase.** → D10
- **Overlay Network** — libp2p P2P network connecting OMS and orderbook nodes. aTLS-authenticated — only attested peers participate. → D8, D10

### P

- **Partial Fill** — Incomplete order execution. Each fill produces a separate `UserTrade` with its own fee. → D2, D8
- **PendingRiskParameters** — Queued risk parameter update with `validAfter` timestamp. Permissionlessly applied after delay. → D4, D7
- **PendingSettlement** — On-chain struct stored during batch settlement pull phase. Cleared during push phase. → D4, D9
- **Perpetual Futures** — Synthetic leveraged exposure with no expiry and hourly funding rates. Shares orderbook with spot. → D8, D14
- **Ping Interval** — WS server ping every 20s; heartbeat: 10s scan, 5s dead threshold. → D2
- **PMM (Professional Market Maker)** — Designated MM program with separate fee tiers and margin-on-match. → D6, D8
- **Post-Only** — Order flag rejected if it would match immediately. Guarantees maker execution. → D2, D8
- **ppm (parts per million)** — On-chain rate/margin unit. 1 = 0.01 bp; 100 = 1 bp = 0.01%; 10,000 = 1%; 1,000,000 = 100%. Rates are per hour. → D4, D7, D14
- **Premium Clamp** — `RiskParameters` field capping the funding rate premium component. → D7, D14
- **Price-Time Priority** — Matching rule: orders at the same price filled in arrival order. → D8
- **PriceType** — Enum: `Oracle` or `LastTradePrice`. Trigger price source for conditional orders. → D8

### Q

- **Quorum** — Minimum unique admin signatures required to authorize a settlement or withdrawal. → D4, D9
- **Quorum Certificate** — Aggregation of ≥ quorum distinct admin signatures over a payload. Each must recover to a different admin. → D4, D9

### R

- **Rate** — Hourly IE struct: funding rate, utilization rate, and quote utilization rate per asset. → D3, D14
- **Rate Limits** — OMS rate limiting in three tiers: global, per-user, per-IP. → D2
- **Rebalancing Fee** — Up to 2.5% fee on deposits to overweight vaults or withdrawals from underweight vaults. → D13
- **Rebalancing Reward** — Up to 2.5% reward for deposits to underweight vaults. Paid from fee account. → D13
- **Reduce-Only** — Order flag: can only decrease an existing position. Required for trigger orders. → D8
- **Registry** — Contract storing asset data, risk parameters, and fee account. Governed by `riskManagerMultisig`. → D4
- **Restart Workflow** — CE recovery after crash or upgrade: restores on-chain checkpoint and replays pending operations. → D10
- **Risk Council** — Governance body setting risk parameters, deposit caps, and rebalancing weights. → D7, D13
- **riskParameterChangeDelaySeconds** — Delay before pending risk parameters take effect. Default: 1 day. Immutable after deployment. → D4, D7
- **RiskParameters** — On-chain per-asset struct: collateral factors, OI caps, interest kinks, funding params, IM clamps. → D4, D7
- **Rollback** — Trade event state indicating settlement failure. Long-tail trades revert if on-chain settlement fails. → D8, D9

### S

- **Sequence Number** — Monotonically increasing counter on depth snapshots/updates for ordering. → D2
- **Settlement** — On-chain asset transfer executing a confirmed trade. Two types: atomic (single tx) and batch (two-phase). → D4, D9
- **Settlement (struct)** — On-chain struct: `tokenOut`, `amountOut`, `tokenIn`, `amountIn`, `nonce`. Fees netted off-chain. → D4
- **Settler/Executor** — Settler = user ID (`bytes32`); Executor = EVM address calling settlement functions. → D4, D9
- **SettlementManager** — Python SDK helper that polls for settlement approval and submits on-chain transactions. → D5, D9
- **SignedSettlement** — On-chain struct: `Settlement` + EIP-712 admin signature. → D4, D9
- **SignableMessage** — Rust trait (`signable_part()`) producing binary signing payload for orders. → D2
- **Skew Modifier / Skew Cliff** — `RiskParameters` fields scaling the funding rate skew component. → D7, D14
- **Slot Commitment / Slot Finalization** — Forward-progress guarantee requiring state transitions per slot. Missed slots trigger recovery. → D10
- **Solvency Breach** — Three types: margin breach, OI breach, collateral cap breach. → D7
- **Spot** — (1) Trading product: direct 1:1 asset exchange, no leverage. (2) Account struct: actual vault balance (distinct from `Balance`). → D3, D8
- **State Checkpoint** — Merkle root of system state committed on-chain periodically. Basis for escape hatches. → D10
- **Sub-Account** — Account index under a user's public key with independent margin, positions, and balances. Account 0 = default. → D2, D3
- **Synchronous Making** — Mode for long-tail assets: confirmation gated on settlement readiness. On failure, trade reverts. → D1, D8

### T

- **Taker Fee** — Fee charged to the aggressing order. Higher than maker fee. → D6
- **Taker Queue** — Message queue for market orders. Lower priority than maker queue. → D2, D8
- **TDX (Trust Domain Extensions)** — Intel hardware for confidential VMs with hardware-rooted attestation. → D10
- **TEE (Trusted Execution Environment)** — Hardware-isolated enclave protecting code and data from host OS. t+ runs OMS and CE inside TEEs. → D1, D10
- **Tiered Security** — Low-risk operations use TEE-only; high-risk (CE, oracle) use MPC+TEE. → D1, D10
- **TradeTarget** — Enum for time-in-force: `GTC`, `GTD`. → D2, D8
- **Trigger Order** — Conditional order activated when price crosses threshold (`TriggerAbove` / `TriggerBelow`). Must be reduce-only. → D2, D8
- **TWA (Time-Weighted Average)** — Averaging method smoothing utilization and skew over the rate computation window. → D14

### U

- **UserInventory** — Per-sub-account state: spots, balances, margin positions, margin summary. → D3
- **UserManager** — Python SDK utility persisting Ed25519 keypairs to `~/.tplus/users/`. → D5
- **UserTrade** — Trade record: trade ID, price, quantity, fee, maker/buyer flags, status (Pending/Confirmed/Rollbacked). → D2, D3
- **Utilization Rate** — Ratio of borrowed to total available supply. Drives borrow rate. → D14

### V

- **ValidUntil** — Expiry timestamp on settlement/withdrawal signatures. Reverts if `block.timestamp > validUntil`. → D4, D9
- **Vault Weight** — Per-chain percentage of total asset liquidity. Determines rebalancing fees/rewards. → D13
- **View Change Protocol** — BFT-style CE leader-failure recovery via timeout detection and quorum-based leader election. → D10

### W

- **Withdrawal (struct)** — On-chain struct: `tokenAddress`, `amount`, `nonce`. → D4
- **Withdrawal Delay** — Time gate on withdrawals based on `cum_cap_delta`. Cliff-based tiers mapping thresholds to delays. → D9
- **Withdrawal Digest** — Non-EIP-712 hash for withdrawal signature verification. No `\x19\x01` prefix. → D4, D9
- **Withdrawal Quorum** — Minimum unique admin signatures for a withdrawal. Query via `withdrawalQuorum()`. → D4, D9

---

## 2. API Endpoint Quick Reference

### REST Endpoints (OMS)

No `/v1/` prefix. See D2 for full parameter/response docs.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/nonce/{user_id}` | No | Request authentication nonce (5-min expiry) |
| POST | `/auth` | No | Nonce + Ed25519 signature → bearer token (24h) |
| POST | `/logout` | Yes | Revoke all user tokens |
| POST | `/orders/create` | Yes | Submit order (limit or market) |
| DELETE | `/orders/cancel` | Yes | Cancel open order |
| PATCH | `/orders/replace` | Yes | Atomic cancel + replace |
| GET | `/orders/user/{user_id}` | Yes | List open/closed orders (`?open_only=true`) |
| GET | `/orders/user/{user_id}/{asset_id}` | Yes | Orders filtered by asset |
| GET | `/trades/user/{user_id}` | Yes | User trade history |
| GET | `/trades/user/{user_id}/{asset_id}` | Yes | User trades filtered by asset |
| GET | `/inventory/user/{user_id}` | Yes | User inventory (spots, balances, positions) |
| GET | `/marketdepth/{asset_id}` | No | Orderbook snapshot (bids/asks + seq number) |
| GET | `/klines/{asset_id}` | No | Candlestick (OHLCV) data |
| GET | `/trades` | No | Public trade feed |
| GET | `/trades/{asset_id}` | No | Public trades for asset |
| GET | `/markets` | No | List all markets |
| GET | `/market/{id}` | No | Single market details |

### WebSocket Channels (OMS)

Each stream is a distinct WS path, not subscribe-by-message. See D2 for schemas.

| Channel | Path | Auth | Description |
|---------|------|------|-------------|
| Orders | `/orders` | No | Orderbook event stream |
| Depth | `/marketdepth/diff/{asset_id}` | No | Incremental depth updates |
| Klines | `/klines/diff/{asset_id}` | No | Candlestick updates |
| Trades (all events) | `/trades/events` | No | All trade events: Pending, Confirmed, Rollbacked |
| Trades (finalized) | `/trades` | No | Confirmed trades only |
| Trades (asset, all) | `/trades/events/{asset_id}` | No | All trade events for asset |
| Trades (asset, finalized) | `/trades/{asset_id}` | No | Finalized trades for asset |
| Control | `/control` | Yes | Order submission (primary low-latency path) |
| User trades (all) | `/trades/user/events/{user_id}` | Yes | User trade events: Pending, Confirmed, Rollbacked |
| User trades (finalized) | `/trades/user/{user_id}` | Yes | Confirmed-only user trades |
| Account stats | `/account/stats/{user_id}` | Yes | Stats pushed on inventory change |

### Clearing Engine Endpoints

See D3 for request/response docs and D5 for SDK usage.

| Client | Method | Description |
|--------|--------|-------------|
| `VaultClient` | `get()` | List registered vault addresses |
| `VaultClient` | `update()` | Request CE to refresh vaults from Registry |
| `VaultClient` | `update_balance(asset_id, chain_id)` | Refresh cached vault balance for asset/chain |
| `SettlementClient` | `init_settlement(settlement_request)` | Initiate atomic settlement |
| `SettlementClient` | `init_batch_settlement(request)` | Initiate batch settlement |
| `SettlementClient` | `get_signatures(user)` | Retrieve CE-approved settlement signatures |
| `SettlementClient` | `stream_approvals(user_hex)` | Stream settlement approvals via WS |
| `AssetRegistryClient` | `get()` | List registered assets |
| `AssetRegistryClient` | `get_risk_parameters()` | List registered risk parameters |
| `AssetRegistryClient` | `get_registry_address()` | Registry contract address |
| `DecimalClient` | `get(asset_id, chains)` | Token decimal precision |
| `DepositClient` | `update(user, chain_id)` | Request CE to scan for new deposits |
| `WithdrawalClient` | `init_withdrawal(WithdrawalRequest)` | Initiate withdrawal |
| `WithdrawalClient` | `get_signatures(user)` | Retrieve withdrawal quorum signatures |
| `WithdrawalClient` | `get_queued(user)` | List queued withdrawal requests |

---

## 3. Contract Method Quick Reference

**Deployed Addresses (Arbitrum One):** DepositVault `0x7a9eAA74eF31ed3eca5447252b443651Ad250916`, Registry `0xBBd0020ae0DAB578515d0c72EdFf37Bf30D31BE5`.

**Supported Chains:** Ethereum Mainnet (1), Sepolia (11155111), Arbitrum One (42161), Arbitrum Sepolia (421614).

See D4 for parameter details, access control, and ABI reference.

### DepositVault

| Method | Description |
|--------|-------------|
| `deposit(user, account, tokenAddress, amount)` | Deposit ERC-20 |
| `executeAtomicSettlement(order, user, account, validUntil, data, signature)` | Atomic settlement via callback |
| `pullBatchSettlement(orders[], user, account, target, validUntil)` | Batch pull phase (debit) |
| `pushBatchSettlements(user, account)` | Batch push phase (credit) |
| `withdraw(withdrawal, user, account, target, validUntil, epochHash, signatures[])` | Execute quorum-signed withdrawal |
| `setAdministrators(admins[], quorum)` | Set admin set + quorum (CredentialManager only) |
| `addSettlerExecutor(settler, executor)` | Register settler + executor pair |
| `removeSettler(settler)` | Unregister settler |
| `setDomainSeparator(separator)` | Set EIP-712 domain (owner only, once) |
| `ORDER_TYPEHASH()` | View: EIP-712 type hash |
| `getApprovedSettlers()` | View: approved settlers |
| `approvedSettlers(index)` | View: settler at index |
| `settlementCounts(user, account)` | View: settlement nonce |
| `withdrawalCounts(user, account)` | View: withdrawal nonce |
| `depositCounts(user, account)` | View: deposit nonce |
| `owner()` | View: vault owner |
| `credentialManager()` | View: credential manager |
| `withdrawalQuorum()` | View: min signatures for withdrawal |
| `credentialManagerChangeDelayBlocks()` | View: delay before credential manager change |
| `administrators(index)` | View: admin at index |
| `isAdministrator(address)` | View: check if address is admin |
| `lastSignatureUse()` | View: block of last signature use |
| `pendingSettlements(user, account, index)` | View: pending batch settlement |

**DepositVault Events:**

| Event | Indexed Fields | Description |
|-------|---------------|-------------|
| `Deposited(user, account, nonce, tokenAddress, amount)` | user, account, nonce | ERC-20 deposit credited |
| `Settled(user, account, nonce, tokenOut, amountOut, tokenIn, amountIn)` | user, account, nonce | Settlement executed |
| `Withdrew(user, account, nonce, tokenAddress, amount)` | user, account, nonce | Withdrawal executed |

Admin events (`AdministratorSetReset`, `AdminAdded`, `WithdrawalQuorumChanged`, `CredentialManagerChanged`) are governance-only.

**Registry Events:**

| Event | Description |
|-------|-------------|
| `MaxDepositChanged(chain, index, previous, current)` | Deposit cap updated |
| `Max1HrDepositChanged(chain, index, previous, current)` | Hourly deposit cap updated |

Registry and CredentialManager do not emit events for most mutations — monitor tx receipts.

### Registry

| Method | Description |
|--------|-------------|
| `setAssetData(AssetData)` | Register asset (riskManagerMultisig only) |
| `setMaxDeposits(chain, index, newMax)` | Update absolute deposit cap |
| `setMax1HrDeposits(chain, index, newMax)` | Update hourly deposit cap |
| `setPendingRiskParameters(index, params)` | Queue risk parameter update (time-delayed) |
| `applyPendingRiskParameters(index)` | Apply queued params (permissionless, after delay) |
| `setFeeAccount(account)` | Set fee account (riskManagerMultisig only) |
| `getAssets(start, end)` | View: paginated assets `[start, end)` |
| `getAssetData(chainId, index)` | View: asset data by chain/index |
| `getRiskParameters(start, end)` | View: paginated risk params |
| `riskParameters(index)` | View: risk params by asset |
| `pendingRiskParameters(index)` | View: pending risk params + validAfter |
| `getAssetIndex(chainId, assetAddress)` | View: address → index |
| `feeAccount()` | View: current fee account |
| `riskParameterChangeDelaySeconds()` | View: pending params delay |

### CredentialManager

| Method | Description |
|--------|-------------|
| `addVault(routingId, vmId, addr, config)` | Register vault |
| `registerAdminUpdateStrategy(routingId, vmId, strategy)` | Register admin update strategy |
| `setDepositVaultAdministrators(routingId, vmId, newAdmins[], newQuorum)` | Update vault admins (delegatecall) |
| `getVaults(start, end)` | View: paginated vaults |
| `vaults(index)` | View: vault at index |
| `adminUpdateStrategies(routingId, vmId)` | View: strategy for (routingId, vmId) |
| `admin()` | View: admin (immutable) |

---

## Flagged for Review

Items that may be internal, admin-only, or contain known issues. Confirm for public docs.

### Admin/Governance Methods

| Item | Source | Reason |
|------|--------|--------|
| `POST /market/create` | D2 | Marked "admin-only, TBD" |
| `AdminClient` | D5 | "Admin-only, excluded from public docs" |
| `DepositVault.setOwner(newOwner)` | D4 | Owner-only governance |
| `DepositVault.setDepositorStatus(depositor, status)` | D4 | Temporary allowlist — expected removal |
| `DepositVault.setCredentialManager(newManager)` | D4 | Owner-only, delayed. D4 flags inverted delay condition. |
| `DepositVault.ownerWithdrawToken()` | D4 | `TODO: Delete before official production` |
| `DepositVault.settlementCaps(address)` | D4 | Per-token caps — unused |
| `Registry.admin()` | D4 | Internal admin |
| `Registry.riskManagerMultisig()` | D4 | Internal multisig |
| `Registry.setAdmin(newAdmin)` | D4 | Admin transfer |
| `Registry.setRiskManagerMultisig(multisig)` | D4 | Multisig assignment |
| `Registry.validateRiskParameters(params)` | D7 | Pure validation — possibly internal |
| `CredentialManager.withdraw(address)` | D4 | Emergency fund recovery — admin only |
| `CredentialManager.removeVault()` | D4 | `TODO: We probably don't want this method once live` |
| `canDeposit` | D4 | Temporary allowlist — pre-production removal |

### Internal-Only Terms

| Item | Source | Reason |
|------|--------|--------|
| `AuthState` | D2 | Internal OMS per-connection state |
| `SettlerInfo` | D4 | DepositVault internal struct |
| `PaymentIngested / AssetPaymentIngested` | D14 | CE-internal events, not user-facing |
| `ComputeInterestRates / ComputedInterestRates` | D14 | CE↔IE protocol messages, not user-facing |

### Known Issues

| Item | Source | Reason |
|------|--------|--------|
| EIP-712 domain version mismatch | D4, D9 | Python/Rust: `"1.0.0"`, Solidity: `"1"`. Verify deployed version. |
| Python `Order` EIP-712 missing `account` | D4, D9 | Typehash mismatch with contract |
| Python SDK `domain_separator` wrong slot | D4 | Reads slot 1 (`credentialManager`) not slot 2 (`_domainSeparator`) |
| `IDepositVault` interface out of sync | D4 | Omits `account` param; uses `bytes signature` vs `bytes[]` in implementation |

---

## Changelog

- Pass 1: Populated glossary (~80 terms A–W), REST/WS/SDK endpoint tables, contract method tables (DepositVault/Registry/CredentialManager), type reference tables. Added Flagged for Review (12 items).
- Pass 2: Cross-referenced D1–D14. Added ~25 glossary terms, enriched ~30 entries with concrete values. Added Auth column to REST table, expanded WS/contract tables. Flagged 9 additional items.
- Pass 3: Added ~10 glossary terms, expanded entries with implementation detail. Added 4 DepositVault views and CredentialManager methods. Flagged 3 items.
- Pass 4: Cross-checked D1–D14. Added ~12 glossary terms, fixed definitions (Collateral Factor, IM Clamped Curve). Added 3 DepositVault views to contract table.
- Pass 5: Added ~10 glossary terms, fixed alphabetical ordering, tightened ~20 entries. Added DepositVault events table, deployed addresses, supported chains.
- Pass 1 (Structure & Scope): Restructured to 3-section layout. Removed Type Reference section and meta sections. Trimmed entries with formula-level detail to concise defs + cross-refs. Moved internal items to Flagged.
- Pass 2 (Accuracy): Verified all content against D1–D14. Fixed Batch Settlement, Domain Separator, EIP-712, Mini-Batching descriptions. Fixed Registry signatures. Added 4 glossary terms, Registry events, IDepositVault interface discrepancy to Flagged.
- Pass 3 (Prose & Conciseness): Tightened ~90 glossary entries removing filler words, hedging, and redundancy. Condensed table descriptions and section intros. Shortened Flagged for Review type labels. Compressed prior changelog entries.
- Pass 1 (Structure & Scope): Moved internal terms (AuthState, SettlerInfo, PaymentIngested, ComputeInterestRates) and canDeposit from glossary to Flagged. Merged Klines/Timebar. Trimmed ~25 entries that leaked field lists, formulas, or parameter detail into other deliverables' scope. Reorganized Flagged into Admin/Governance, Internal-Only, and Known Issues sub-tables. Removed resolved Flagged item. Deduplicated cross-refs (removed D3 from margin-owned entries, removed D8 from GTC/GTD).
- Pass 2 (Accuracy): Verified glossary, endpoint tables, and contract tables against source code (ws.rs, contracts.py, DepositVault.sol, Registry.sol, CredentialManager.sol) and D1–D14. Fixed Liability Factor (divisor, not scalar). Fixed CE endpoint table: replaced incorrect VaultClient methods with actual SDK signatures (get, update, update_balance); replaced nonexistent DepositClient/AssetRegistryClient methods with source-verified ones; added SettlementClient batch/stream methods and WithdrawalClient.get_queued. Added EIP-712 domain name to glossary. Added default values to credentialManagerChangeDelayBlocks (14,400 blocks) and riskParameterChangeDelaySeconds (1 day). Added 5 glossary terms: isolatedOnly, maxFundingRate, maxUtilization, maxUtilizationRate, ppm. Clarified Collateral Factor on-chain type.
- Pass 3 (Prose & Conciseness): Tightened ~80 glossary entries removing filler, hedging, and "See DX" cross-refs redundant with the → notation. Condensed table descriptions across REST, WS, CE, and contract tables. Standardized terminology (WS not WebSocket in entries, admin not administrator, utilization not utilisation).
