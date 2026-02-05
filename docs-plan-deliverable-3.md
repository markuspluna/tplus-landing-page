# Deliverable 3: Clearing Engine Endpoints

## Scope

HTTP API reference for the Clearing Engine (CE) — all non-OMS public-facing endpoints exposed by tplus-core. The CE runs a Warp HTTP server on port 3032 (configurable). No authentication is required for any CE endpoint.

**Boundary with D2:** Account inventory, positions, balances, and margin state are OMS-served (`GET /inventory/user/{user_id}` — D2 §5, `WS /account/stats/{user_id}` — D2 §6) and documented in D2.

**Out of scope:** OMS order/market data → D2. Smart contract interfaces → D4. Python SDK wrappers → D5. Fee computation → D6. Risk/margin mechanics → D7. Settlement lifecycle → D9. Interest rate formulas → D14.

---

## Source Material

### CE HTTP server and routes
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/permissionless.rs` — Warp server setup, route registration, rejection handling
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/permissionless/routes/` — all route handler files: `settlement.rs`, `settlement_ws.rs`, `withdrawal.rs`, `deposits.rs`, `assetregistry.rs`, `decimals.rs`, `vault.rs`, `transfer.rs`, `admin.rs`, `restart.rs`, `rotation.rs`

### Request type definitions
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/orderbook_messages/src/user_requests.rs` — TxSettlementRequest, InnerSettlementRequest, WithdrawalRequest, InnerWithdrawalRequest, CancelWithdrawalRequest, InnerCancelWithdrawalRequest, ClosePositionRequest, ClosePositionRequestInner, SubAccountTransferRequest, InnerSubAccountTransferRequest
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/settlement.rs` — UpdateSettlementsRequest
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/withdrawals/request.rs` — UpdateWithdrawalsRequest
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/deposits.rs` — UpdateDepositsRequest
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/decimals.rs` — DecimalsRequest
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/liquidity.rs` — UpdateVaultBalanceRequest

### Response type definitions
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/clearing-engine/src/inventory/types/signature.rs` — OneTimeSignature, InnerOneTimeSignature

### Shared types
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/shared_messages/src/chainid.rs` — ChainId
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/shared_messages/src/chainaddress.rs` — ChainAddress
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/orderbook_messages/src/asset_index.rs` — AssetIdentifier
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/orderbook_messages/src/user.rs` — UserPublicKey
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/orderbook_messages/src/account_index.rs` — AccountIndex

### Interest Engine
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/interest-engine/src/http_api.rs` — WS /rates and GET /health
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/interest_messages/src/rate.rs` — Rate struct

### On-chain asset registry (response shape reference)
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/Registry.sol` — AssetData, RiskParameters structs

---

## Content

### Overview

**Base URL:** `http://<ce-host>:3032` (port configurable via `listen_port`).

**Amount encoding:** U256 values serialize as hex strings without `0x` prefix (e.g., `"64"` = 100, `"4d2"` = 1234). Fields use `#[serde(with = "crate::u256")]`. CE uses 18 decimals internally (`INVENTORY_DECIMALS = 18`). Clients convert between on-chain token decimals (e.g., USDC = 6) and CE representation.

---

### 1. Settlement Endpoints

Settlement lifecycle: D9. On-chain settlement contract: D4.

#### `POST /settlement/init`

Initiates an atomic settlement.

**Request body:** `TxSettlementRequest`

| Field | Type | Description |
|---|---|---|
| `inner` | `InnerSettlementRequest` | Settlement details (signed portion) |
| `signature` | `Vec<u8>` | Ed25519 signature over `inner` signing payload |
| `nonce` | `Option<u32>` | Settlement nonce; CE uses next nonce if omitted |

**`InnerSettlementRequest` fields:**

| Field | Type | Description |
|---|---|---|
| `tplus_user` | `UserPublicKey` | User whose account is modified; signature validated against this key |
| `sub_account_index` | `AccountIndex` | Sub-account to pull settled funds from |
| `settler` | `UserPublicKey` | Account executing the settlement |
| `asset_in` | `AssetIdentifier` | Asset entering the protocol |
| `amount_in` | `U256` | Amount entering (CE 18-decimal) |
| `asset_out` | `AssetIdentifier` | Asset leaving the protocol |
| `amount_out` | `U256` | Amount leaving (CE 18-decimal) |
| `chain_id` | `ChainId` | Deposit vault chain |

**Response:** Empty (200 OK).

Maps to on-chain `Settlement` struct (D4).

---

#### `POST /settlement/update`

Checks the deposit vault for new settlements for a user.

**Request body:** `UpdateSettlementsRequest`

| Field | Type | Description |
|---|---|---|
| `chain_id` | `ChainId` | Chain to check |
| `user` | `UserPublicKey` | User to query |

**Response:** Empty (200 OK).

---

#### `WS /settlement/approvals/{user_hex}`

Streams settlement approvals for a settler. Messages encrypted to the settler's public key.

**Path parameter:** `user_hex` — settler Ed25519 public key, hex-encoded (no `0x` prefix).

**Message format:** `SettlementApprovalMessage`

| Field | Type | Description |
|---|---|---|
| `signature` | `OneTimeSignature` | Approval signature for on-chain submission |
| `encrypted_data` | `string` (hex) | Hex-encoded encrypted approval data (`Vec<u8>` serialized via `hex_serde`) |

**`OneTimeSignature` fields:**

| Field | Type | Description |
|---|---|---|
| `inner.signature` | `string` (hex) | Approval signature to use on-chain |
| `inner.nonce` | `u32` | Settlement nonce |
| `expiry` | `u64` | Signature expiry timestamp |
| `chain_id` | `ChainId` | Chain this signature is for |
| `epoch_hash` | `Option<EpochHash>` | `null` for settlements (used only for withdrawals) |

Filters by settler — only delivers approvals for the connected user.

---

#### `POST /settlers/update`

Checks a vault for newly approved settlers.

**Request body:** `ChainAddress` — JSON string `"{hex_address}@{hex_chain}"` (e.g., `"62622e77...00000000@000000000000aa36a7"`). 32-byte vault address + 9-byte chain ID.

**Response:** Empty (200 OK).

---

#### `GET /settlers/{chain_id}`

Returns approved settlers for a chain.

**Path parameter:** `chain_id` — 9-byte hex (routing ID + VM ID).

**Response:** `Vec<String>` — hex-encoded settler public keys.

---

### 2. Withdrawal Endpoints

Withdrawal lifecycle and delay mechanism: D9. On-chain withdrawal contract: D4.

#### `POST /withdrawal/init`

Initiates a withdrawal. CE validates solvency, locks inventory, and begins approval.

**Request body:** `WithdrawalRequest`

| Field | Type | Description |
|---|---|---|
| `inner` | `InnerWithdrawalRequest` | Withdrawal details (signed portion) |
| `signature` | `Vec<u8>` | Ed25519 signature over `inner` signing payload |

**`InnerWithdrawalRequest` fields:**

| Field | Type | Description |
|---|---|---|
| `tplus_user` | `UserPublicKey` | Withdrawing user's public key |
| `asset` | `AssetIdentifier` | Asset to withdraw |
| `amount` | `U256` | Withdrawal amount (CE 18-decimal) |
| `chain_id` | `ChainId` | Target chain |
| `nonce` | `Option<u32>` | Withdrawal nonce; defaults to `1 + last ingested` |
| `target` | `[u8; 32]` | On-chain target address (hex) |

**Response:** Empty (200 OK). Rebalancing fees may apply (D13).

---

#### `GET /withdrawal/signatures/{user}`

Returns CE-approved signatures for pending withdrawals.

**Path parameter:** `user` — hex-encoded public key.

**Response:** `Vec<OneTimeSignature>` — approval signatures with nonces, expirys, chain IDs, and epoch hashes. Submit on-chain via `DepositVault.withdraw()` (D4). Uses a non-EIP-712 digest (D4).

---

#### `POST /withdrawal/update`

Checks for completed withdrawals on a chain.

**Request body:** `UpdateWithdrawalsRequest`

| Field | Type | Description |
|---|---|---|
| `user` | `UserPublicKey` | User public key |
| `chain_id` | `ChainId` | Chain to check |

**Response:** Empty (200 OK).

---

#### `GET /withdrawal/queue/{user}`

Returns queued (pending) withdrawals for a user.

**Path parameter:** `user` — hex-encoded public key.

**Response:** `Vec<WithdrawalRequest>` — each includes `amount_filled` (`U256`, hex string) indicating partial fill progress. A fill requires at least 50% of the remaining amount.

---

#### `POST /withdrawal/cancel`

Cancels a pending withdrawal.

**Request body:** `CancelWithdrawalRequest`

| Field | Type | Description |
|---|---|---|
| `inner` | `InnerCancelWithdrawalRequest` | Cancel details (signed portion) |
| `signature` | `Vec<u8>` | Ed25519 signature over `inner` signing payload |

**`InnerCancelWithdrawalRequest` fields:**

| Field | Type | Description |
|---|---|---|
| `tplus_user` | `UserPublicKey` | User's public key |
| `asset_id` | `AssetIdentifier` | Asset of the withdrawal |
| `chain_id` | `ChainId` | Chain of the withdrawal |
| `nonce` | `u32` | Nonce of the withdrawal |

**Response:** Empty (200 OK). Cancellation fee logic: D13.

---

### 3. Deposit Endpoints

Deposits initiate on-chain via `DepositVault.deposit()` (D4). CE monitors `Deposited` events and credits after `depositIngestConfirmations` block confirmations.

#### `POST /deposits/update`

Checks for new deposits on a chain.

**Request body:** `UpdateDepositsRequest`

| Field | Type | Description |
|---|---|---|
| `user` | `UserPublicKey` | User public key |
| `chain_id` | `ChainId` | Chain to check |

**Response:** Empty (200 OK).

Triggers a check; does not return deposit status. Rebalancing rewards may apply (D13).

---

### 4. Vault Endpoints

#### `GET /vaults`

Returns all registered vault addresses.

**Response:** `Vec<ChainAddress>` — vault addresses across chains, each as `"{hex_address}@{hex_chain}"`.

---

#### `POST /vaults/update`

Refreshes registered vaults from the on-chain Registry contract.

**Response:** Empty (200 OK).

---

#### `POST /vault/balance/update`

Refreshes cached vault balance for an asset on a chain. Progresses pending withdrawals.

**Request body:** `UpdateVaultBalanceRequest`

| Field | Type | Description |
|---|---|---|
| `asset_id` | `AssetIdentifier` | Asset to refresh |
| `chain_id` | `ChainId` | Chain ID |

**Response:** Empty (200 OK).

Call before depositing to select the chain minimizing rebalancing fees (D13).

---

### 5. Asset Registry and Risk Parameters

CE mirrors asset data from the on-chain `Registry` (D4).

#### `GET /assets`

Returns all registered assets.

**Response:** JSON object — asset index (string) → chain ID → asset data. Mirrors on-chain `AssetData` struct (D4).

---

#### `POST /assets/update`

Refreshes registered assets from on-chain Registry.

**Response:** Empty (200 OK).

---

#### `GET /params`

Returns all risk parameters.

**Response:** JSON object — asset identifiers → risk parameters. Mirrors on-chain `RiskParameters` struct (D4). Semantics: D7.

Key fields:

| Field | Type | Description |
|---|---|---|
| `collateralFactor` | `uint8` | Haircut percentage (90 = 90%) |
| `liabilityFactor` | `uint8` | Liability scaling factor |
| `isolatedOnly` | `bool` | Restricted to isolated-margin accounts |
| `maxCollateral` | `uint256` | Collateral cap |
| `maxOpenInterest` | `uint256` | OI cap |
| `maxSpotOpenInterest` | `uint256` | Spot OI cap |
| `maxUtilization` | `uint256` | Utilization cap (scaled to 1e18) |

Full 18-field struct: D4. Interest rate curve parameters (`interestKinks`, `kinkInterestRates`, `usdInterestKinks`, `usdKinkInterestRates`, `skewModifier`, `skewCliff`, `baseFundingRate`, `premiumClamp`, `maxFundingRate`, `maxUtilizationRate`): D14. Initial margin parameters (`initialMarginClamps`, `initialMarginFactors`): D7.

---

#### `POST /params/update`

Refreshes risk parameters from on-chain Registry.

**Response:** Empty (200 OK).

---

#### `GET /registry`

Returns the on-chain Registry contract address used by CE.

**Response:** `ChainAddress` — JSON string in `"{hex_address}@{hex_chain}"` format.

---

### 6. Decimal Precision

#### `POST /decimals`

Returns cached on-chain decimal precision for given assets and chains. POST with JSON body (query semantics).

**Request body:** `DecimalsRequest`

| Field | Type | Description |
|---|---|---|
| `assets` | `Vec<AssetIdentifier>` | Assets to query |
| `chains` | `Vec<ChainId>` | Chains to query |

**Response:** JSON object — asset IDs → chains → decimal precision (integer).

---

#### `POST /decimals/update`

Refreshes cached decimals from on-chain.

**Request body:** `DecimalsRequest` (same as above).

**Response:** Empty (200 OK).

---

### 7. Transfer Endpoints

#### `POST /transfer/update`

Closes a margin position (converts between spot and margin).

**Request body:** `ClosePositionRequest`

| Field | Type | Description |
|---|---|---|
| `inner` | `ClosePositionRequestInner` | Close details (signed portion) |
| `signature` | `Vec<u8>` | Ed25519 signature over `inner` signing payload |

**`ClosePositionRequestInner` fields:**

| Field | Type | Description |
|---|---|---|
| `user` | `UserPublicKey` | User's public key |
| `account` | `AccountIndex` | Sub-account index |
| `asset_identifier` | `AssetIdentifier` | Asset to close |

**Response:** Empty (200 OK).

---

#### `POST /transfer/sub-account`

Transfers assets between sub-accounts.

**Request body:** `SubAccountTransferRequest`

| Field | Type | Description |
|---|---|---|
| `inner` | `InnerSubAccountTransferRequest` | Transfer details (signed portion) |
| `signature` | `Vec<u8>` | Ed25519 signature over `inner` signing payload |

**`InnerSubAccountTransferRequest` fields:**

| Field | Type | Description |
|---|---|---|
| `user` | `UserPublicKey` | User's public key |
| `source_index` | `AccountIndex` | Source sub-account |
| `target_index` | `AccountIndex` | Target sub-account |
| `transfer_asset` | `AssetIdentifier` | Asset to transfer |
| `transfer_amount` | `U256` | Amount to transfer |
| `target_account_type` | `Option<SubAccountType>` | For new target accounts: `Spot`, `Isolated { asset }`, or `CrossMargin` |

**Response:** Empty (200 OK).

---

### 8. Interest Engine Endpoints

The Interest Engine (IE) is a standalone binary with its own base URL and port. Rate formulas and accrual: D14.

#### `WS /rates`

Streams borrow and funding rates. On connection: welcome message (`type: "subscriptions"`), initial snapshot, then updates on recomputation.

**Message format:** `Vec<RateJson>`

| Field | Type | Description |
|---|---|---|
| `asset_identifier` | `AssetIdentifier` | Asset |
| `funding_rate` | `Option<Decimal>` | Decimal string. Positive = longs pay shorts. `null` if unavailable |
| `utilisation_rate` | `Option<Decimal>` | Base asset borrow rate (decimal string) |
| `quote_utilisation_rate` | `Option<Decimal>` | Quote (USD) borrow rate (decimal string) |

**Update frequency:** Hourly, using time-weighted average data.

**Internal rate model:**

```rust
pub struct Rate {
    pub asset_identifier: AssetIdentifier,
    pub funding_rate: i32,           // signed — positive = longs pay shorts
    pub utilisation_rate: u32,       // borrow rate for base asset
    pub quote_utilisation_rate: u32, // borrow rate for quote asset (USD)
}
```

**Rate units (internal):** Scaled by `RISK_PARAM_RATE_SCALING_DENOMINATOR` (1,000,000). 100 = 1 bp = 0.01%. 10,000 = 100 bp = 1%. 1,000,000 = 100%.

**Rate caps:** `maxFundingRate` and `maxUtilizationRate` per-asset in on-chain `RiskParameters` (D4). Hard max: 1142 (100ths of bp/hour) ≈ 1000% APR.

---

#### `GET /health`

Returns IE health status.

**Response:** `{"status": "healthy"}` (200) or `{"status": "unhealthy"}` (503).

---

### 9. System Endpoints

#### `GET /status`

CE health check.

**Response:** `"live"` (200 OK, plain text).

---

### 10. Error Handling and Authentication

**Authentication:** No HTTP-level auth. Signed requests (settlement, withdrawal, transfer, cancel-withdrawal) carry Ed25519 signatures in the request body, validated against the `tplus_user` key in `inner`.

**Error responses** (Warp rejection handler in `permissionless.rs`):

| Status | Body | Condition |
|---|---|---|
| 200 | Varies (empty or JSON) | Success |
| 400 | `{"error": "Bad request: ..."}` | Deserialization failure (`BodyDeserializeError`) |
| 404 | `{"error": "Not found."}` | Unknown route |
| 500 | `{"error": "Internal server error"}` | Unhandled rejection or channel failure |

Route handlers raise custom rejections via `ErrorResponse` with status code and reason: `{"error": "<reason>"}`.

**Signature validation:** `ValidateSignature` trait — `inner.signing_payload()` produces canonical bytes; `signature` is an Ed25519 signature over that payload, verified against `tplus_user` (or `user`) `UserPublicKey`.

---

### 11. Shared Type Reference

#### ChainId

9-byte identifier: 1-byte `routing_id` + 8-byte `vm_id`.

| Routing ID | Chain Type |
|---|---|
| 0 | EVM |
| 1 | Solana |
| 2 | Bitcoin |

Examples: Ethereum = `(0, 1)`, Arbitrum = `(0, 42161)`, Unichain = `(0, 130)`, Base = `(0, 8453)`, Optimism = `(0, 10)`, BSC = `(0, 56)`.

**JSON:** Serializes as `0x`-prefixed hex (e.g., `"0x000000000000000001"` for Ethereum). Deserializes from hex string, `{"routing_id": 0, "vm_id": 1}` object, or `[0, 0, 0, 0, 0, 0, 0, 0, 1]` byte array.

#### ChainAddress

32-byte `address` + 9-byte `chain` (a `ChainId`).

**JSON:** String `"{hex_address}@{hex_chain}"` (e.g., `"62622e77...00000000@000000000000aa36a7"`). Binary formats use `{address, chain}` hex object.

#### AssetIdentifier

Enum: `USD` (alias for `Index(0)`), `Index(u64)`, or `Address(AssetAddress)`.

**JSON:** `Index` serializes as numeric string (`"0"` for USD, `"1"` for index 1). `Address` serializes as `"{hex_address}@{hex_chain}"`. Deserializes from `{"Index": 200}` or `{"Address": {...}}` object form.

#### UserPublicKey

Ed25519 public key (`[u8; 32]`). Serializes as 64-char hex (no `0x` prefix). Deserializes from `0x`-prefixed hex or byte array `[u8, u8, ...]`.

#### AccountIndex

Sub-account index (`u64`). Main account = `0`. Index `1` reserved for internal margin sub-account (`RESERVED_MARGIN_SUB_ACCOUNT_IDX`).

---

## Cross-References

| Links to | Reason |
|---|---|
| D2 (OMS Endpoints) | Inventory/margin state; auth contrast |
| D4 (Smart Contracts) | On-chain deposit/withdraw/settle; Registry; AssetData/RiskParameters structs |
| D5 (Python SDK) | ClearingEngineClient wrappers for these endpoints |
| D7 (Risk Mechanisms) | Risk parameter semantics |
| D9 (Settlement & Clearing) | Settlement/withdrawal lifecycle; delay mechanism |
| D13 (Rebalancing) | Deposit/withdrawal rebalancing fees; vault weights |
| D14 (Interest Rates) | Rate formulas; IE architecture |

---

## Flagged for Review

| Item | Source | Reason Flagged |
|---|---|---|
| Debug endpoints (9 total) | `routes/debug.rs` | Feature-gated behind `debug-admin-endpoint`. Exclude from public docs |
| `GET /admin/verifying-key` | `routes/admin.rs` | Admin endpoint — public status unclear |
| `GET /restart_cert`, `POST /share` | `routes/restart.rs` | Internal key-recovery protocol. Operational only |
| `POST /rotation/fetch` | `routes/rotation.rs` | Leader rotation — source: "highly unsafe for prod" |
| `GET /settlement/signatures/{user}` | tpluspy (`settlement.py`) | **No Rust route exists.** Approvals are WS-only (`/settlement/approvals/{user_hex}`) |
| `POST /settlement/batch` | tpluspy (`settlement.py`) | **No Rust route exists.** `BatchSettlementRequest` not in CE |
| IE base URL | `interest-engine/` | Separate binary; URL/port not configured in CE |
| EIP-712 version mismatch | Python SDK vs Solidity | Python/Rust: `"1.0.0"`; Solidity: `"1"` |

---

## Changelog

- Initial rewrite: Replaced SDK-method-based documentation with actual HTTP endpoint reference. Source material now points to CE Warp route handlers and Rust request type definitions instead of tpluspy client wrappers. Added transfer endpoints (§7) not in previous version. Flagged `GET /settlement/signatures/{user}` and `POST /settlement/batch` as SDK-only (no Rust route found). Added shared type reference section.
- Pass 1 (Structure & Scope): Verified all route paths and request/response types against Rust source. Fixed AssetIdentifier from `Index(u16)` to `Index(u64)`. Added accurate JSON serialization formats for ChainId (0x-prefixed hex), ChainAddress (`addr@chain` string), AssetIdentifier (numeric or `addr@chain` string), and UserPublicKey (hex). Added Bitcoin routing ID (2). Fixed RiskParameters field count to 18. Added section 10 (Error Handling and Authentication) per target structure. Added U256 hex encoding details from test assertions. Added `amount_filled` field documentation for withdrawal queue responses. Expanded Flagged for Review with source-verified details for debug, restart, and rotation endpoints.
- Pass 2 (Accuracy): Verified all claims against source files. Fixed `CLEARING_ENGINE_DECIMALS` → `INVENTORY_DECIMALS` (correct constant name from `decimals/src/lib.rs`). Fixed `SubAccountType` enum variant from `IsolatedMargin` to `Isolated { asset }` per `user_inventory.rs`. Corrected `encrypted_data` type description to reflect `Vec<u8>` with `hex_serde`. Added `0x`-prefix acceptance on `UserPublicKey` deserialization. Specified `RESERVED_MARGIN_SUB_ACCOUNT_IDX = 1` for `AccountIndex`. All endpoint paths, HTTP methods, request/response types, struct field names/types, `RiskParameters` fields, `Rate` struct, `OneTimeSignature` struct, rejection handler logic, and shared type serialization formats verified against Rust source and `Registry.sol`.
- Pass 3 (Prose & Conciseness): Tightened descriptions throughout — cut filler words, redundant phrases, and verbose qualifiers. Shortened endpoint descriptions to imperative fragments. Consolidated response/note lines where possible. Compressed Flagged for Review entries. Standardized serialization docs to "JSON:" prefix. No content added or facts changed.
