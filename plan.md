# Plan: Draft Documentation Plan Files

## Objective

Produce a set of documentation plan files that drive parallel page generation by independent Claude instances.

## Output Files

- **`docs-plan.md`** — Master index. Lists all deliverables with one-line descriptions and links to their individual plan files.
- **`docs-plan-deliverable-{N}.md`** (one per section) — Full execution spec for a single docs page. Contains everything a Claude instance needs to generate the page: scope, source material, content to include, outline, and output format.

## Approach

For each deliverable below, this plan defines the **section title**, **scope**, and **source material**. Each deliverable will be expanded into its own `docs-plan-deliverable-{N}.md` containing:
- **Scope** — what the page covers, boundaries with adjacent pages
- **Source material** — which repos, files, or existing pages to pull from
- **Content** — the actual substance, facts, and explanations that must appear on the page
- **Outline** — subsections and key topics in order
- **Output format** — expected structure (endpoint reference, tutorial, conceptual guide, etc.)
- **Cross-references** — which other deliverable pages to link to

`docs-plan.md` serves as the master index pointing to all deliverable files. Claude instances work in parallel — one per `docs-plan-deliverable-{N}.md` — with no file conflicts.

---

## Deliverables

### 1. Architecture Overview

**Scope:** High-level system design that frames the entire documentation site. Covers the TEE-based offchain orderbook, onchain settlement layer, how confirmation is decoupled from settlement, the role of light-clients inside TEEs, and how the three core components (tplus-core, tplus-contracts, tpluspy) relate to each other. Does NOT cover individual endpoints or contract methods — those are in their own sections. Should be HIGH LEVEL AND USER FOCUSED. We do not want to expose proprietary information. We care about explaining why t+ won't go down, what happens if it does go down, privacy and integrity guarantees, censorship resistance guarantees, and why it's fast.

**Source material:**
- **Protocol docs (Notion):**
  - `notion-managment/content/remote/pages/docs/tonepage-2e1e.md` — platform overview as decentralized full-service exchange
  - `notion-managment/content/remote/pages/docs/tplus-protocol-safety-high-level-overview-2e7e.md` — hardware safety, quorum certificates, interactive client safety
  - `notion-managment/content/remote/pages/docs/syncing-high-level-overview-2c5e.md` — live syncing and re-syncing protocols
- **tplus-core structure**:
  - `tplus-core/bin/` — 6 core services: clearing-engine, orderbook, oms, oracle, interest-engine, threshold/light/arbitrum blockchain clients
  - `tplus-core/lib/overlay/` — libp2p P2P overlay connecting all services
  - `tplus-core/lib/core/src/lib.rs` — module aggregator showing how components compose

---

### 2. OMS Endpoints (tplus-core)

**Scope:** Full API reference for the Order Management System. Order placement, cancellation, modification, order types, order lifecycle states, and query endpoints. Includes authentication & connectivity as a subsection: API key management, authentication flow, WebSocket connection setup, rate limits, error codes, and request/response formats. This is the primary integration surface for trading clients.

**Source material:**
- **tplus-core OMS binary:** `tplus-core/bin/order-management-system/src/bin/oms.rs` — REST API endpoints, WebSocket control event loop, AuthState, MarginSolvencyVerifier, heartbeat checker
- **tplus-core matching lib:** `tplus-core/lib/matching/src/` — MatchingEngine, order validation (`order.rs`, `order/evm.rs`), signature validation (`signatures.rs`), deduplication (`deduplication.rs`), timing validation (`timing.rs`)
- **tplus-core client lib:** `tplus-core/lib/client/src/ws.rs` — TplusClient trait defining `authenticate()`, `create_order()`, `cancel_order()`, `get_user_trades()`, `get_open_orders()`, `subscribe_orders()`
- **tplus-core WebSocket handler:** `tplus-core/lib/ws-stream-handler/src/lib.rs` — ping/pong, mini-batching, message forwarding
- **tpluspy client (cross-reference):** `tpluspy/tplus/client/` — OrderBookClient, ClearingEngineClient
- **tpluspy models:** `tpluspy/tplus/model/` — Order, LimitOrder, MarketOrder, CancelOrder, ReplaceOrder, OrderEvent, TradeTarget (GTC/GTD time-in-force)
- **tpluspy order utils:** `tpluspy/tplus/utils/limit_order.py`, `market_order.py`, `replace_order.py`, `signing.py`
- **Protocol docs (may not be current):**
  - `notion-managment/content/remote/pages/docs/oms-api-cheatsheet-28ee.md` — OMS API reference and market query examples
  - `notion-managment/content/remote/pages/docs/trigger-orders-overview-255e.md` — trigger order implementation (stop-loss, take-profit)
- **OMS Swagger (may not be current):** https://oms.tplus.dev/swagger-ui/
- **CLI (usage examples):** `tplus-core/bin/cli/src/main.rs` — create-limit-order, create-market-order, cancel-order, watch-market, get-user-trades, watch-klines commands

---

### 3. Clearing Engine Endpoints (tplus-core)

**Scope:** Full API reference for the Clearing Engine (CE) HTTP API — all non-OMS public-facing endpoints exposed by tplus-core. Settlement initiation and status, deposits, withdrawals (init, cancel, queue, signatures), vault queries, asset registry and risk parameters, decimal precision, transfers (close position, sub-account), and interest rate streaming. Boundary: anything that isn't order CRUD or order queries belongs here. Covers only the API surface for querying rates — rate computation model, formulas, and application mechanics are in section 14. Admin/debug endpoints (feature-gated behind `debug-admin-endpoint`) are excluded.

**Source material:**
- **CE HTTP server (Warp):** `tplus-core/bin/clearing-engine/src/permissionless.rs` — server setup, route registration, error handling
- **CE route handlers:** `tplus-core/bin/clearing-engine/src/permissionless/routes/` — `settlement.rs`, `settlement_ws.rs`, `withdrawal.rs`, `deposits.rs`, `assetregistry.rs`, `decimals.rs`, `vault.rs`, `transfer.rs`, `admin.rs`, `restart.rs`, `rotation.rs`
- **CE request types:** `tplus-core/messages/orderbook_messages/src/user_requests.rs` — TxSettlementRequest, InnerSettlementRequest, WithdrawalRequest, InnerWithdrawalRequest, CancelWithdrawalRequest, ClosePositionRequest, SubAccountTransferRequest
- **CE internal request types:** `tplus-core/bin/clearing-engine/src/inventory/` — `settlement.rs` (UpdateSettlementsRequest), `withdrawals/request.rs` (UpdateWithdrawalsRequest), `deposits.rs` (UpdateDepositsRequest), `decimals.rs` (DecimalsRequest), `liquidity.rs` (UpdateVaultBalanceRequest)
- **CE response types:** `tplus-core/bin/clearing-engine/src/inventory/types/signature.rs` — OneTimeSignature, InnerOneTimeSignature
- **Shared message types:** `tplus-core/messages/shared_messages/src/` — `chainid.rs` (ChainId), `chainaddress.rs` (ChainAddress)
- **Interest Engine HTTP API (endpoint surface only):** `tplus-core/bin/interest-engine/src/http_api.rs` — WS /rates, GET /health (rate computation model is in section 14)
- **Interest rate message types:** `tplus-core/messages/interest_messages/src/rate.rs` — Rate struct response shape
- **tpluspy clearing engine client (cross-reference only):** `tpluspy/tplus/client/clearingengine/` — to verify endpoint mapping; SDK usage is documented in D5

---

### 4. Smart Contract Endpoints (tplus-contracts)

**Scope:** On-chain contract interfaces for deposit, withdrawal, settlement, and any RFQ/atomic-settlement mechanics. ABI reference, event definitions, integration patterns, and expected transaction flows. Boundary: covers the Solidity surface only — how the offchain system calls into contracts is in Settlement & Clearing (section 9).

**Source material:**
- **tplus-contracts core contracts:** `tplus-contracts/src/`
  - `DepositVault.sol` — deposits, withdrawals, settlements; EIP-712 signatures; quorum-based withdrawals; events: Settled, Deposited, Withdrew; structs: Settlement (tokenOut/In, amountOut/In, nonce), SignedSettlement, PendingSettlement, Withdrawal
- **tplus-contracts interfaces:** `tplus-contracts/src/interfaces/`
  - `IDepositVault.sol` — public interface definition
  - `IAtomicSettlementCallback.sol` — callback for atomic settlements with min expected output
- **tplus-core chain adapter:** `tplus-core/lib/chain-adapter/src/` — ChainAdapter, EvmAdapter, evm/solidity.rs, evm/call/deposit_vault.rs, token.rs
- **tplus-core blockchain client utils:** `tplus-core/lib/blockchain-client-utils/src/` — RPCHandler trait (get_block, call, get_storage, get_logs, send_transaction), events/signature.rs, events/subscriptions.rs
- **tpluspy EVM module:** `tpluspy/tplus/evm/` — DepositManager, SettlementManager; contracts.py (DepositVault); eip712.py (EIP-712 Order message)
- **tpluspy EVM constants:** `tpluspy/tplus/evm/constants.py` — registry address, deposit vault, chain mappings
- **tplus-core domains:** `tplus-core/lib/domains/src/lib.rs` — EIP-712 domain ("MyrtleWyckoff" contract)
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/pamm-based-settlement-2e1e.md` — pAMM-based settlement for Solana liquidity
  - `notion-managment/content/remote/pages/docs/solana-composability-settlements-2d1e.md` — Solana settlement flow
  - `notion-managment/content/remote/pages/docs/withdrawal-delays-2ebe.md` — withdrawal delay mechanism

---

### 5. tpluspy — Python SDK

**Scope:** Full SDK documentation. Installation, authentication setup, client initialization, and usage guides for every major workflow: place/cancel/modify orders, query positions and balances, subscribe to market data streams, manage collateral (deposit/withdraw). Includes code examples for each workflow. Boundary: this is the "how to use" layer — endpoint semantics are in sections 2-3.

**Source material:**
- **tpluspy package root:** `tpluspy/tplus/` — py.typed marker, constants.py (CLEARING_ENGINE_DECIMALS=18), logger.py
- **tpluspy clients:** `tpluspy/tplus/client/` — ClearingEngineClient (from_local, sub-clients: settlements, assets, decimals, deposits, withdrawals, vaults, admin), OrderBookClient
- **tpluspy client base:** `tpluspy/tplus/client/base.py` — BaseClient with httpx.AsyncClient, WebSocket support
- **tpluspy clearing engine sub-clients:** `tpluspy/tplus/client/clearingengine/` — SettlementClient, AssetRegistryClient, DecimalClient, DepositClient, WithdrawalClient, VaultClient, AdminClient
- **tpluspy models:** `tpluspy/tplus/model/` — Order, LimitOrder/LimitOrderDetails, MarketOrder/MarketOrderDetails, CancelOrder, ReplaceOrder/ReplaceOrderDetails, TradeTarget, Market, OrderBook/OrderBookDiff, PriceLevelUpdate, KlineUpdate, Trade/UserTrade, Settlement models (Base/Inner/Tx/Batch), Withdrawal models, UserInventory (Spot, Balance, MarginPosition, Margin), AssetIdentifier, ChainAddress, UserPublicKey, TriggerAbove/TriggerBelow
- **tpluspy user management:** `tpluspy/tplus/utils/user/` — User (Ed25519 key management), UserManager (~/.tplus/users/), load_user()
- **tpluspy order utils:** `tpluspy/tplus/utils/limit_order.py`, `market_order.py`, `replace_order.py`, `signing.py`
- **tpluspy EVM integration:** `tpluspy/tplus/evm/` — DepositManager, SettlementManager (optional `[evm]` extras, Ape framework)
- **demo-algos repo** (path TBD) — real-world usage patterns, market making examples

---

### 6. Fees

**Scope:** Fee schedule and computation. Maker/taker fee model, fee tiers, volume-based or role-based discounts, rebate programs, how fees are calculated on each trade, how fees interact with settlement (deducted at confirmation vs settlement), and fee treatment for different product types. Boundary: does not cover margin or risk — only the fee line item. Interest rates (borrow/funding) are in section 14.

**Source material:**
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/trading-fees-rates-297e.md` — fee tiers, margin trading fees, rate schedules
  - `notion-managment/content/remote/pages/docs/preliminary-points-system-2bfe.md` — points system for trading, interest, and engagement incentives
- **Landing page:** `investor-letter.html` (references "minimal market maker costs" and "unique fee models")
- **tplus-core** — fee computation logic within OMS or clearing engine (exact module TBD from codebase search)

---

### 7. Risk Mechanisms

**Scope:** Margin and risk management system. Initial vs maintenance margin, haircut methodology (based on asset price volatility, liquidity volatility, exposure skew), cross-margining rules and which assets qualify, collateral eligibility and yield-bearing token treatment, liquidation process and triggers, insurance fund mechanics (Eigenlayer restaking), deposit caps and how they scale. Boundary: covers the risk model and its parameters — trading product details are in section 8.

**Source material:**
- **tplus-core margin lib:** `tplus-core/lib/margin/src/` — margin_engine.rs (41KB, core margin calculations), solvency_verifier.rs, solvency_result.rs, margin_engine/surplus_computer.rs (28KB), breach_oi_computer.rs, breach_margin_oi_computer.rs, breach_collateral_cap_computer.rs, initial_margin_clamped_curve.rs
- **tplus-core margin protocol:** `tplus-core/lib/margin/src/protocol/` — protocol_values.rs (protocol parameters), protocol_tracker.rs, spot_margin_exposure_computer.rs, total_margin_balance_computer.rs, total_collateralized_computer.rs
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/risk-controls-29ce.md` — OI caps, spot margin requirements, circuit breakers
  - `notion-managment/content/remote/pages/docs/sub-accounts-275e.md` — cross-margin, isolated-margin, spot trading sub-accounts
  - `notion-managment/content/remote/pages/docs/cross-margining-276e.md` and `cross-margining-spec-2f1e.md` — cross-margining system
  - `notion-managment/content/remote/pages/docs/im-price-multiple-implementation-2a3e.md` — IM price adjustment based on skew
  - `notion-managment/content/remote/pages/docs/liquidation-spec-22de.md` — liquidation flow, MM monitoring, deleverage orders, ADL sequencing
  - `notion-managment/content/remote/pages/docs/liquidation-faqs-2f0e.md` — liquidation triggers, margin monitoring scans
  - `notion-managment/content/remote/pages/docs/adl-spec-2e4e.md` — auto-deleveraging specification
  - `notion-managment/content/remote/pages/docs/t-backstop-avs-specification-239e.md` — EigenLayer AVS for liquidation monitoring

---

### 8. Trade Execution

**Scope:** How trades are executed end-to-end in t+. Covers the full order lifecycle from client submission through the OMS, into the matching engine, and back as a fill confirmation. Documents the OMS architecture (WebSocket control loop, authentication, margin solvency checks, heartbeat), the matching engine implementation (price-time priority, order validation, deduplication, timing validation), and the direct market maker WebSocket on the orderbook that supports only cancels and post-only orders. Boundary: this is about execution infrastructure — risk parameters are in section 7, API endpoint reference is in section 2, settlement lifecycle is in section 9.

**Source material:**
- **tplus-core OMS binary:** `tplus-core/bin/order-management-system/src/bin/oms.rs` — REST API endpoints, WebSocket control event loop, AuthState, MarginSolvencyVerifier, heartbeat checker
- **tplus-core matching lib:** `tplus-core/lib/matching/src/` — MatchingEngine (matches.rs), order validation (order.rs, order/evm.rs), signature validation (signatures.rs), deduplication (deduplication.rs), timing validation (timing.rs)
- **tplus-core orderbook binary:** `tplus-core/bin/orderbook/src/bin/orderbook_no_secret.rs` — order book maintenance, matching, trade event generation, direct market maker WebSocket (cancel-only + post-only order support)
- **tplus-core WebSocket handler:** `tplus-core/lib/ws-stream-handler/src/lib.rs` — ping/pong, mini-batching, message forwarding
- **tplus-core client lib:** `tplus-core/lib/client/src/ws.rs` — TplusClient trait defining authenticate(), create_order(), cancel_order(), get_user_trades(), get_open_orders(), subscribe_orders()
- **tplus-core pricing lib:** `tplus-core/lib/pricing/src/` — PriceType enum, mark vs oracle price providers
- **tpluspy models:** `tpluspy/tplus/model/` — Order, LimitOrder, MarketOrder, CancelOrder, ReplaceOrder, OrderEvent, TradeTarget (GTC/GTD time-in-force), TriggerAbove/TriggerBelow
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/trigger-orders-overview-255e.md` — stop-loss, take-profit, liquidation triggers
  - `notion-managment/content/remote/pages/docs/sync-makingtaking-spec-265e.md` — synchronous trades, on-chain settlement finalization
- **CLI examples:** `tplus-core/bin/cli/src/main.rs` — order types and parameters
- **Shell scripts:** `tplus-core/bin/market-maker.sh` (spread, spacing, pricing), `tplus-core/bin/trader.sh` (order submission patterns)

---

### 9. Settlement & Clearing

**Scope:** How trades settle onchain after offchain confirmation. Covers the settlement lifecycle (confirmation → netting → signing → onchain submission → finalization), settlement types (single, batch, atomic), EIP-712 signing and quorum approval, how to execute settlements via the SDK, and the withdrawal flow. Does NOT cover smart contract ABIs (section 4), rebalancing fees (section 13), or internal node infrastructure.

**Source material:**
- **tplus-core chain adapter:** `tplus-core/lib/chain-adapter/src/` — ChainAdapter, EvmAdapter, SettlementSigningPayload, WithdrawalSigningPayload, evm/solidity.rs, evm/call/deposit_vault.rs
- **tpluspy settlement:** `tpluspy/tplus/client/clearingengine/` — SettlementClient (init_settlement, get_signatures), WithdrawalClient (init_withdrawal, get_signatures)
- **tpluspy models:** `tpluspy/tplus/model/` — BaseSettlement, InnerSettlementRequest, TxSettlementRequest, BatchSettlementRequest, InnerWithdrawalRequest, WithdrawalRequest
- **tpluspy EVM settlement:** `tpluspy/tplus/evm/` — SettlementManager (approval polling and execution)
- **tplus-contracts:** `tplus-contracts/src/DepositVault.sol` — Settlement struct, SignedSettlement, settle(), Settled event
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/match-finalization-2f2e.md` — match finalization concepts
  - `notion-managment/content/remote/pages/docs/withdrawal-delays-2ebe.md` — withdrawal delay mechanism

---

### 10. Liveness Guarantees & Operator Trust Requirements

**Scope:** Trust model and failure mode documentation. What happens if the TEE operator goes offline or acts maliciously, forced-exit and escape-hatch mechanisms, data availability guarantees, attestation verification (how users verify the TEE is running expected code), operator obligations and SLAs, trust assumptions at each layer (TEE hardware, settlement contracts, light-clients, data availability), and comparison to alternative trust models (optimistic rollups, zk-rollups, sidechains, pure CEX custody). This is the "why should I trust this" section.

**Source material:**
- **tplus-core attestation/mocks:** `tplus-core/lib/mocks/src/` — get_quote(), get_pods(), verify_quote() (TEE attestation interface)
- **tplus-core ATLS test:** `tplus-core/bin/dummy-not-atls/src/bin/malicious.rs` — demonstrates why non-attested nodes cannot participate
- **tplus-core slot finalization:** `tplus-core/lib/slot-finalization/src/lib.rs` — slot commitment for liveness
- **tplus-core overlay encryption:** `tplus-core/lib/encryption/src/` — message encryption for confidentiality
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/tplus-protocol-safety-high-level-overview-2e7e.md` — hardware safety, quorum certificates, interactive client safety
  - `notion-managment/content/remote/pages/docs/slot-commitment-for-liveness-reliability-232e.md` — slot commitment for liveness guarantees
  - `notion-managment/content/remote/pages/docs/escape-hatch-thoughts-264e.md` — forced withdrawal via merkle roots and outbox clearing
  - `notion-managment/content/remote/pages/docs/unlocking-full-safety-without-state-inclusion-proo-2e6e.md` — interactive client safety and balance proofs
  - `notion-managment/content/remote/pages/docs/generalized-tee-attestation-authorization-policy-f-2c7e.md` — TEE attestation framework (TDX, CVMs, cloud providers)
  - `notion-managment/content/remote/pages/docs/sample-tdx-quote-2eee.md` — example TDX quote structure
  - `notion-managment/content/remote/pages/docs/tee-based-censorship-resistant-discovery-2f4e.md` — TEE-based network discovery without CDN
  - `notion-managment/content/remote/pages/docs/losing-determinism-for-oracles-2f3e.md` — oracle handling with non-deterministic replicas
  - `notion-managment/content/remote/pages/docs/dynamic-view-changes-in-the-clearing-engine-2f3e.md` — view change protocol for CE quorum
  - `notion-managment/content/remote/pages/docs/restart-workflow-ce-side-2b9e.md` and `restart-workflow-smart-contract-side-2b6e.md` — CE restart and smart contract validation
  - `notion-managment/content/remote/pages/docs/replay-protection-for-non-tdx-orderbooks-2b7e.md` — replay protection via nonces
  - `notion-managment/content/remote/pages/docs/prod-environment-ce-safetyliveness-testing-2f0e.md` — production safety/liveness testing
- **Landing page:** `research.html` (TEE + Dstack, ZTEE, TEE-KMS paper links), `pitch.html` (trust model descriptions)

---

### 11. Getting Started / Quickstart

**Scope:** Onboarding tutorial for new integrators. Account creation, connecting to the API, depositing collateral, placing a first trade, reading back the execution result. Should be self-contained but link to deeper docs for each step. This is the entry point — the first page someone reads. Boundary: brief and practical, not exhaustive — points to sections 2-5 for full details.

**Source material:**
- **tpluspy client entry points:** `tpluspy/tplus/client/` — ClearingEngineClient.from_local(), OrderBookClient
- **tpluspy user setup:** `tpluspy/tplus/utils/user/` — User (Ed25519 key generation), UserManager (~/.tplus/users/), load_user()
- **tpluspy order helpers:** `tpluspy/tplus/utils/limit_order.py`, `market_order.py`
- **tpluspy EVM deposits:** `tpluspy/tplus/evm/` — DepositManager
- **tplus-core CLI (workflow example):** `tplus-core/bin/cli/src/main.rs` — create-limit-order, get-user-trades, watch-market
- **tplus-core setup script:** `tplus-core/bin/setup.sh` — local dev setup (CE, OB, OMS, Solver)
- **tplus-core sanity check:** `tplus-core/bin/sanity-check.sh` — basic order placement examples
- **demo-algos repo** (path TBD) — simple trading examples
- **OMS Swagger (may not be current):** https://oms.tplus.dev/swagger-ui/

---

### 13. Rebalancing Mechanism (Deposit/Withdrawal Fees & Incentives)

**Scope:** Multi-chain liquidity rebalancing system. Covers the fee/reward mechanism that maintains target liquidity distribution across chains, weight-based vault targeting, deposit fees (up to 2.5% for imbalancing actions) and rewards (up to 2.5% for rebalancing actions), withdrawal fees, settlement fee interactions, pending withdrawal handling, cancellation fee logic, the self-funding guarantee, and practical user guidance on minimizing fees. Boundary: covers only the rebalancing fee/reward mechanism — trading fees (maker/taker) are in section 6, settlement lifecycle is in section 9, withdrawal delays are in section 9.

**Source material:**
- **Primary spec:** `notion-managment/content/remote/pages/docs/rebalancing-spec-250e.md` — Full rebalancing spec: fee/reward formulas, Liquidity Manager design, weight system, pending withdrawal handling, attack prevention
- **Implementation tickets:**
  - `notion-managment/content/remote/pages/sprints/ce-rebalancing-fee-implementation-cdfc.md` — Acceptance criteria, Liquidity Manager, fee/reward calculation, solvency integration
  - `notion-managment/content/remote/pages/sprints/ce-withdrawal-fee-storage-and-charging-a973.md` — Withdrawal fee estimation/storage, cancellation fee logic, attack vectors
  - `notion-managment/content/remote/pages/sprints/ce-depositsettlement-ingestion-fee-and-reward-hand-25b7.md` — Deposit/settlement fee/reward handling, global fee account
- **Smart contract layer:** `notion-managment/content/remote/pages/sprints/sc-asset-registry-add-min-weight-to-assetdata-4f40.md` — AssetData minWeight, RiskParameters bufferMultiple
- **Fee schedule context:** `notion-managment/content/remote/pages/docs/trading-fees-rates-297e.md` — Rebalancing fees section (user-facing summary)
- **Project overview:** `notion-managment/content/remote/pages/projects/risk-engine-rebalancing-fees-53b2.md`
- **tplus-core implementation (reference):**
  - `tplus-core/bin/clearing-engine/src/inventory/liquidity.rs` — Liquidity Manager integration
  - `tplus-core/bin/clearing-engine/src/inventory/withdrawals.rs` — Withdrawal fee handling
  - `tplus-core/bin/clearing-engine/src/inventory/deposits.rs` — Deposit ingestion
  - `tplus-core/bin/clearing-engine/src/inventory/vault.rs` — Vault/VaultRegistry

---

### 14. Interest Rates (Borrow & Funding Rates)

**Scope:** Interest rate system covering both utilization-based borrow rates and skew-based funding rates. Documents the two-VM architecture (Interest Engine computes rates externally, Clearing Engine validates and applies them), rate computation formulas (kink-based borrow curves, additive funding rate with skew + premium components), how rates are applied to user accounts hourly, rate caps and risk controls, funding fee tier discounts, interest accrual mechanics, and the payment distribution model (borrowers pay lenders, funding losers pay funding winners). Boundary: does not cover trading fees (section 6), margin/risk parameters (section 7), or settlement lifecycle (section 9) — only the interest rate subsystem.

**Source material:**
- **Protocol docs:**
  - `notion-managment/content/remote/pages/docs/interest-rate-spec-236e.md` — foundational spec: utilization rates, liquidity calculations, interest curves, funding rate formulas
  - `notion-managment/content/remote/pages/docs/interest-rate-calculations-2d3e.md` — detailed technical specification for both borrow and funding rate computation, rate engine architecture, clearing engine responsibilities
  - `notion-managment/content/remote/pages/docs/funding-rate-calculations-2a3e.md` — archived alt funding rate approaches (multiplicative vs additive); rationale for additive formula
  - `notion-managment/content/remote/pages/docs/interest-rate-tracking-2a2e.md` — interest rate engine architecture overview, utilization and funding calculations, holder interest methodology
  - `notion-managment/content/remote/pages/docs/trading-fees-rates-297e.md` — funding fee tier discounts (14-day average OI based)
- **tplus-core Interest Engine binary:** `tplus-core/bin/interest-engine/`
  - `src/bin/interest_engine.rs` — entry point, libp2p overlay messaging
  - `src/interest_engine_handler.rs` — handles CE requests, computes and broadcasts rates
  - `src/http_api.rs` — HTTP API for querying rates
  - `src/rate_computers/borrow_rate_computer.rs` — kink-based borrow curve, separate base and quote (USD) rates
  - `src/rate_computers/funding_rate_computer.rs` — additive formula: skew_component + premium_component with clamps, cliff and premium adjustment
  - `src/data/aggregator.rs` — time-weighted average aggregation for deposits, liabilities, skew, premium, prices
  - `src/data/asset_aggregated_data.rs` — per-asset aggregated data structure
- **tplus-core Interest Messages:** `tplus-core/messages/interest_messages/src/`
  - `lib.rs` — `ComputeInterestRates` request, `ComputedInterestRates` response, `InterestRateEngine` enum
  - `rate.rs` — `Rate` struct: asset_identifier, funding_rate (i32), utilisation_rate (u32), quote_utilisation_rate (u32)
  - `payment_ingested.rs` — `PaymentIngested`, `AssetPaymentIngested` (funding/utilization fees charged/distributed)
- **tplus-core Clearing Engine interest modules:** `tplus-core/bin/clearing-engine/src/interest/`
  - `interest_handler.rs` — hourly rate request, validation against risk params, `apply_interest_rates()`
  - `funding.rs` — `charge_funding_rate()`, `distribute_funding_rate()`, `compute_funding_distribution_rate()`, per-user solvency checks
  - `utilization.rs` — `charge_utilisation_rate()`, `distribute_utilisation_rate()`, `compute_user_utilization_for_asset()`, per-user solvency checks

---

### 12. Glossary & Reference

**Scope:** Definitions of t+-specific and domain terminology (TEE, confirmation vs settlement, haircut, exposure skew, cross-margining, netting, atomic settlement, light-client, attestation, etc.). Also includes a quick-reference table of all API endpoints (from sections 2-3) and contract methods (from section 4) with one-line descriptions. This is a lookup resource, not a narrative.

**Source material:**
- **All other deliverable outputs** — terms extracted during their drafting
- **tplus-core client trait:** `tplus-core/lib/client/src/ws.rs` — TplusClient method signatures for endpoint reference table
- **tpluspy models:** `tpluspy/tplus/model/` — all exported types for type reference
- **tpluspy EVM contracts:** `tpluspy/tplus/evm/contracts.py` — DepositVault, Registry, CredentialManager for contract method reference
- **Protocol docs glossary terms:** `notion-managment/content/remote/pages/docs/trisk-archive-256e.md` — archived risk parameters glossary
- **OMS Swagger (may not be current):** https://oms.tplus.dev/swagger-ui/

---

## Execution Plan

### Step 1: Create deliverable files

Create `docs-plan-deliverable-1.md` through `docs-plan-deliverable-14.md` — one per section above — each containing scope, source material, content, outline, output format, and cross-references. These are scaffolds only — a different Claude instance will fill them out.

### Step 2: Create the refinement script

Write a bash script (`run-docs-refinement.sh`) that:

- Maintains a pool of **max 5 concurrent** Claude instances at any time (not 12 — to stay within API rate limits and local resource constraints).
- Each instance is assigned one deliverable file and runs the **instance prompt** below.
- Each deliverable file goes through **5 sequential passes** — the next pass for a given file starts only after the previous pass completes.
- When a deliverable completes all 5 passes, the slot opens and the next unstarted deliverable is picked up.
- All 13 deliverables are processed this way. Order doesn't matter as long as the concurrency cap is respected.
- **Rate limit consideration:** The script should include a short delay (e.g. 5s) between spawning new instances to avoid burst rate limit hits. If a Claude invocation fails, retry with exponential backoff before counting it as a completed pass.

### Instance prompt (used for each pass)

The following prompt is given to each Claude instance. `{FILE}` is replaced with the deliverable filename, `{PASS}` with the pass number (1-5).

```
You are reviewing and completing a documentation plan deliverable for t+, a decentralized exchange.

**Your file:** {FILE}
**Pass:** {PASS} of 5

Read {FILE} carefully. Then read the source material files listed in the Source Material section of the document. Based on what you find, do the following:

1. Fill in any content sections that are empty or have placeholder text. Write the actual substance — facts, explanations, parameter values, endpoint signatures — that should appear on the final docs page. Ensure you are very concise. This is technical documentation for professionals.
2. Correct anything that is wrong or misleading based on what you read in the source files.
3. Expand anything that is too vague to be useful as a docs plan. A downstream Claude instance will use this file to generate an actual docs webpage, so it needs concrete detail.
4. If you encounter endpoints or functions that look like debug, test, admin-only, or internal-only, add them to a "## Flagged for Review" section at the bottom of the file rather than including them in the main content.
5. Ensure no critical integration surface within this section's scope is undocumented. If you find relevant source material not already listed, add it.
6. At the bottom of the file, append a brief changelog entry under "## Changelog":
   - `Pass {PASS}: <one-line summary of what you changed>`

Do NOT delete or rewrite content from previous passes unless it is factually wrong or poorly explained. Build on what is already there.
```

## Resolved Questions

- ~~Do we have OpenAPI / Swagger specs in tplus-core that can be ingested directly?~~ **Yes** — https://oms.tplus.dev/swagger-ui/ (may not be current)
- ~~Is there a separate WebSocket API or is it part of the core REST surface?~~ **Integrated** — OMS has both REST and WebSocket (see ws-stream-handler, TplusClient trait with subscribe_orders)
- ~~Should docs cover demo-algos (market making examples) as a separate section?~~ **No** — not a separate section.
- ~~tplus-contracts Solidity source path?~~ **Confirmed** — `/Users/markuspaulsonluna/Dev/tplus-contracts/src`

## Notes

- **Debug/internal endpoints:** There are debug endpoints in tplus-core that should be excluded from public docs. During deliverable execution, flag any endpoints that look like debug/admin/internal-only for manual review before publishing.
