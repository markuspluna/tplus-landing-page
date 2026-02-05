# Deliverable 4: Smart Contract Endpoints (tplus-contracts)

## Scope

On-chain contract interfaces for deposit, withdrawal, settlement, and RFQ/atomic-settlement. ABI reference, event definitions, and transaction flows. Solidity public interface only.

**Out of scope:** REST/WebSocket APIs (D2, D3). SDK wrappers (D5). Fee logic (D6). Risk/margin concepts (D7). Settlement lifecycle and off-chain signing (D9). Escape hatch/liveness (D10). Rebalancing fees (D13). Interest rate formulas (D14). Admin functions listed in §6 for completeness — see D10 for trust model.

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/DepositVault.sol` — deposits, withdrawals, settlements; EIP-712 signatures; quorum-based withdrawals
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/Registry.sol` — asset registry, risk parameters, deposit caps
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/CredentialManager.sol` — vault registration, admin update strategies
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/interfaces/IDepositVault.sol` — public interface definition
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/interfaces/IAtomicSettlementCallback.sol` — atomic settlement callback
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/interfaces/IRegistry.sol` — registry interface
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/interfaces/ICredentialManager.sol` — credential manager interface
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/interfaces/IAdminUpdateStrategy.sol` — admin update strategy interface (used by CredentialManager)
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/constants.py` — registry address, deposit vault, chain mappings
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/contracts.py` — deployment addresses, chain mappings
- `/Users/markuspaulsonluna/Dev/myrtle_wyckoff/myrtle-wyckoff-dstack/src/domains.rs` — EIP-712 domain definitions (Rust)
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/domains/src/lib.rs` — EIP-712 domain definition: name `"MyrtleWyckoff"`, version `"1.0.0"`, dynamic chainId and verifyingContract (confirmed by D5)
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/withdrawal-delays-2ebe.md` — withdrawal delay mechanism

**Rebalancing fields (not yet implemented):**
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/sprints/sc-asset-registry-add-min-weight-to-assetdata-4f40.md` — planned `minWeight` (AssetData) and `bufferMultiple` (RiskParameters); not in current source

**Secondary context (parameter semantics only):**
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/` — ChainAdapter, EvmAdapter
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/blockchain-client-utils/src/` — RPCHandler, events

---

## Content

### 1. Contract Overview and Deployment Addresses

Three Solidity `^0.8.28` contracts on EVM chains:

| Contract | Purpose | Address (Arbitrum) |
|---|---|---|
| **DepositVault** | Holds deposits; executes settlements and withdrawals | `0x7a9eAA74eF31ed3eca5447252b443651Ad250916` |
| **Registry** | Asset registry, deposit caps, risk parameters | `0xBBd0020ae0DAB578515d0c72EdFf37Bf30D31BE5` |
| **CredentialManager** | Vault registration, cross-chain admin update strategies | _(TBD)_ |

DepositVault uses Solady (`SafeTransferLib`, `EfficientHashLib`, `ECDSA`).

**Supported chains:**

| Chain | Chain ID | Network |
|---|---|---|
| Ethereum Mainnet | 1 | `ethereum:mainnet` |
| Ethereum Sepolia | 11155111 | `ethereum:sepolia` |
| Arbitrum One | 42161 | `arbitrum:mainnet` |
| Arbitrum Sepolia | 421614 | `arbitrum:sepolia` |

**User-facing roles:**

| Role | Description |
|---|---|
| **Administrators** | Sign settlement/withdrawal approvals; execute batch settlements. Set via CredentialManager. |
| **Settler Executors** | Execute atomic settlements for assigned user. Registered by owner via `addSettlerExecutor()`. |

See D10 for trust model, admin key management, and access control hierarchy.

---

### 2. Deposit Functions and Events

#### 2.1 deposit

```solidity
function deposit(
    bytes32 user,
    uint64 account,
    address tokenAddress,
    uint256 amount
) external
```

| Parameter | Type | Description |
|---|---|---|
| `user` | `bytes32` | User public key (Ed25519, 32 bytes) |
| `account` | `uint64` | Sub-account index |
| `tokenAddress` | `address` | ERC-20 token address |
| `amount` | `uint256` | Token amount (must be > 0) |

**Access:** Caller must be in `canDeposit` allowlist (temporary — see Flagged for Review).

**Behavior:**
1. `safeTransferFrom(msg.sender → vault)` — requires prior ERC-20 approval.
2. Emits `Deposited` (nonce = pre-increment `depositCounts` value).
3. Increments `depositCounts[user][account]`.

**Errors:** `"!depositor"` if caller not approved. `"Zero"` if amount is 0.

#### 2.2 Deposited Event

```
event Deposited(bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenAddress, uint256 amount)
```

`nonce` = pre-increment `depositCounts` value (first deposit = 0).

#### 2.3 Deposit Transaction Flow

1. Approve DepositVault for ERC-20 spend.
2. Call `deposit(user, account, tokenAddress, amount)`.
3. Listen for `Deposited` event.

See D5 for SDK wrappers automating approvals and polling.

---

### 3. Withdrawal Functions and Events

#### 3.1 withdraw

```solidity
function withdraw(
    Withdrawal calldata withdrawal,
    bytes32 user,
    uint64 account,
    address target,
    uint256 validUntil,
    bytes32 epochHash,
    bytes[] calldata signatures
) external
```

| Parameter | Type | Description |
|---|---|---|
| `withdrawal` | `Withdrawal` | Token address, amount, nonce (see §6.1) |
| `user` | `bytes32` | User public key |
| `account` | `uint64` | Sub-account index |
| `target` | `address` | Destination for withdrawn tokens |
| `validUntil` | `uint256` | Signature expiry timestamp |
| `epochHash` | `bytes32` | CE epoch hash — binds withdrawal to state snapshot, prevents cross-epoch replay |
| `signatures` | `bytes[]` | Administrator signatures (must meet quorum) |

**Access:** `signatures.length >= withdrawalQuorum`. Each signature must recover to a unique administrator.

**Behavior:**
1. Validates expiry and nonce.
2. Computes digest from domain separator + withdrawal fields + `epochHash` + `target`. **Not EIP-712** — CE-signed, not wallet-signed (see §6.4).
3. Verifies each signature recovers to a unique administrator; stops at quorum.
4. Increments `withdrawalCounts[user][account]`, sets `lastSignatureUse = block.number`.
5. Transfers tokens to `target`. Emits `Withdrew`.

**Errors:** `Expired`, `MissedQuorum`, `InvalidNonce`, `InvalidSignature`.

On-chain `withdraw()` executes immediately with valid signatures. Delays are enforced off-chain by CE — see D9.

#### 3.2 Withdrew Event

```
event Withdrew(bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenAddress, uint256 amount)
```

#### 3.3 Withdrawal Transaction Flow

1. Initiate withdrawal via CE (off-chain) — D9.
2. CE administrators sign withdrawal digest (quorum required).
3. Call `withdraw(withdrawal, user, account, target, validUntil, epochHash, signatures)`.
4. Tokens transferred to `target`.

---

### 4. Settlement Functions and Events

Two modes: batch (two-phase pull/push for netting multiple trades) and atomic (single-tx with callback for RFQ/DEX fills — see §5).

#### 4.1 pullBatchSettlement (Pull Phase)

Phase 1: vault sends `tokenOut` to target, stores pending records.

```solidity
function pullBatchSettlement(
    SignedSettlement[] calldata orders,
    bytes32 user,
    uint64 account,
    address target,
    uint256 validUntil
) external
```

| Parameter | Type | Description |
|---|---|---|
| `orders` | `SignedSettlement[]` | Settlements with EIP-712 signatures (see §6.1) |
| `user` | `bytes32` | User public key |
| `account` | `uint64` | Sub-account index |
| `target` | `address` | Receives `tokenOut`; must provide `tokenIn` in push phase |
| `validUntil` | `uint256` | Signature expiry timestamp |

**Access:** `msg.sender` must be an administrator.

**Behavior:**
1. Validates expiry; reverts if pending settlements exist for `(user, account)`.
2. Per order: validates sequential nonce, verifies EIP-712 signature, stores as `PendingSettlement`, transfers `tokenOut` to `target`.
3. Increments `settlementCounts[user][account]` by `orders.length`.

Batch settlements do **not** update `lastSignatureUse` (atomic settlements and withdrawals do).

**Errors:** `Expired`, `NotAdmin`, `InvalidNonce`, `InvalidSignature`, `EmptyOrders`, revert on existing pending settlements.

#### 4.2 pushBatchSettlements (Push Phase)

Phase 2: target returns `tokenIn` to vault via `safeTransferFrom`.

```solidity
function pushBatchSettlements(bytes32 user, uint64 account) external
```

| Parameter | Type | Description |
|---|---|---|
| `user` | `bytes32` | User public key |
| `account` | `uint64` | Sub-account index |

**Access:** `msg.sender` must be an administrator.

**Behavior:**
1. Per pending settlement: `safeTransferFrom(target → vault)` for `tokenIn`, emits `Settled`.
2. Clears all pending settlements for `(user, account)`.

**Errors:** `NotAdmin`. Reverts if ERC-20 transfer fails.

#### 4.3 Settled Event

```
event Settled(bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenOut, uint256 amountOut, address tokenIn, uint256 amountIn)
```

Emitted per settlement. **Note:** For atomic settlements, emits `order.amountIn` (minimum), not actual transferred amount (callback may return more).

#### 4.4 Batch Settlement Transaction Flow

1. **Pull:** Administrator calls `pullBatchSettlement(orders, user, account, target, validUntil)` — vault sends `tokenOut` to target.
2. **Push:** Target approves vault for `tokenIn`. Administrator calls `pushBatchSettlements(user, account)` — vault pulls `tokenIn`, emits `Settled`, clears pending state.

---

### 5. RFQ / Atomic Settlement Mechanics

Single-transaction settlement with callback — executor performs an on-chain swap (e.g., DEX fill) atomically.

#### 5.1 executeAtomicSettlement

```solidity
function executeAtomicSettlement(
    Settlement calldata order,
    bytes32 user,
    uint64 account,
    uint256 validUntil,
    bytes calldata data,
    bytes calldata signature
) external
```

| Parameter | Type | Description |
|---|---|---|
| `order` | `Settlement` | Tokens, amounts, nonce (see §6.1) |
| `user` | `bytes32` | User public key |
| `account` | `uint64` | Sub-account index |
| `validUntil` | `uint256` | Signature expiry timestamp |
| `data` | `bytes` | Forwarded to callback (e.g., DEX swap calldata) |
| `signature` | `bytes` | EIP-712 administrator signature |

**Access:** `msg.sender` must be a registered executor for `user` (via `settlerExecutorMap`).

**Behavior:**
1. Validates expiry and nonce.
2. Verifies EIP-712 signature against an administrator. Sets `lastSignatureUse = block.number`.
3. Increments `settlementCounts[user][account]` **before** callback (reentrancy protection).
4. Calls `IAtomicSettlementCallback(msg.sender).onAtomicSettlement(order.tokenOut, order.amountOut, data)`.
5. Reverts if returned amount < `order.amountIn`.
6. Pulls `tokenIn` from executor → vault via `safeTransferFrom` (may exceed `order.amountIn`). Sends `tokenOut` vault → executor via `safeTransfer`.
7. Emits `Settled`.

**Errors:** `Expired`, `NotExecutor`, `InvalidNonce`, `InvalidSignature`, `InsufficientAmountFromExecutor`.

#### 5.2 IAtomicSettlementCallback

Executors must implement:

```solidity
interface IAtomicSettlementCallback {
    /// @param token Token sent from vault to executor.
    /// @param amount Amount of token sent.
    /// @param data Arbitrary data forwarded from the settlement call.
    /// @return Amount of tokenIn the executor will provide back to vault.
    function onAtomicSettlement(
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (uint256);
}
```

Must return >= `order.amountIn`. Reverts with `InsufficientAmountFromExecutor` otherwise.

#### 5.3 Atomic Settlement Transaction Flow

1. Implement `IAtomicSettlementCallback` on executor contract.
2. Register executor via `addSettlerExecutor(settler, executorAddress)` (owner-only).
3. Obtain signed settlement from CE (EIP-712 `Order` signature).
4. Call `executeAtomicSettlement(order, user, account, validUntil, data, signature)`.
5. Callback fires — execute swap, return `tokenIn` amount.
6. Vault pulls `tokenIn`, sends `tokenOut` to executor.

---

### 6. ABI Reference

#### 6.1 Structs

##### DepositVault Structs

```solidity
struct Settlement {
    address tokenOut;    // Token leaving the vault to the settler
    uint256 amountOut;   // Amount of tokenOut
    address tokenIn;     // Token entering the vault from the settler
    uint256 amountIn;    // Amount of tokenIn
    uint256 nonce;       // Sequential nonce per (user, account) pair
}

struct SignedSettlement {
    Settlement settlement;
    bytes signature;     // EIP-712 signature from an administrator
}

struct PendingSettlement {
    Settlement settlement;
    address target;      // Executor address for push phase
}

struct Withdrawal {
    address tokenAddress;
    uint256 amount;
    uint256 nonce;       // Sequential nonce per (user, account) pair
}

struct SettlerInfo {           // Internal: maps settler to authorized executors
    address[] executors;
    mapping(address => bool) isExecutor;
}
```

##### Registry Structs

```solidity
struct AssetData {
    uint16 index;            // Asset index
    bytes32 assetAddress;    // Token address (bytes32 to support non-EVM chains)
    uint64 chainId;          // Chain ID where asset is deployed
    uint256 maxDeposits;     // Deposit cap (collateral cap)
    uint256 max1hrDeposits;  // Hourly deposit cap
}

struct RiskParameters {
    uint8 collateralFactor;           // Pct (e.g. 90 = 90%). See D7.
    uint8 liabilityFactor;            // Pct. See D7.
    uint256 maxCollateral;            // Optional
    uint256 maxOpenInterest;
    uint256 maxSpotOpenInterest;
    uint256 maxUtilization;           // Scaled to 1e18
    bool isolatedOnly;
    uint256[] interestKinks;          // Utilization breakpoints in 100ths of bp (0 to 1_000_000 = 0% to 100%). See D14.
    uint256[] kinkInterestRates;      // Borrow rates at kinks in 100ths of bp, non-decreasing. See D14.
    uint256[] usdInterestKinks;       // USD utilization breakpoints, same scale. See D14.
    uint256[] usdKinkInterestRates;   // USD borrow rates at kinks in 100ths of bp, non-decreasing. See D14.
    uint256 skewModifier;             // Funding rate skew modifier in 100ths of bp
    uint256 skewCliff;                // Funding rate skew cliff in 100ths of bp
    int256 baseFundingRate;           // Base funding rate in 100ths of bp (can be negative)
    uint256 premiumClamp;             // Funding rate premium clamp in 100ths of bp
    uint256[] initialMarginClamps;    // Position-size breakpoints in 100ths of bp, increasing from 0. See D7.
    uint256[] initialMarginFactors;   // IM factors at each clamp in 100ths of bp, non-increasing (< 1,000,000). See D7.
    uint256 maxFundingRate;           // In 100ths of bp, capped at ~1000% APR (1142)
    uint256 maxUtilizationRate;       // In 100ths of bp, capped at ~1000% APR (1142)
}

struct PendingRiskParameters {
    RiskParameters parameters;
    uint256 validAfter;   // Timestamp after which parameters can be applied
}
```

##### CredentialManager Structs

```solidity
struct Vault {
    uint8 routingId;         // Routing identifier
    uint256 vmId;            // Chain ID for EVM chains
    bytes32 vaultAddress;    // Vault address (bytes32 for non-EVM support)
    ChainConfig config;
}

struct ChainConfig {
    uint64 blockTimeMs;                     // Block time in ms (e.g., 250 for Arbitrum)
    uint8 defaultConfirmations;             // Default confirmations
    uint8 depositIngestConfirmations;       // Confirmations before CE ingests deposit
    uint8 withdrawalIngestConfirmations;    // Confirmations before withdrawal finality
    uint8 settlementIngestConfirmations;    // Confirmations before settlement finality
}
```

#### 6.2 DepositVault Functions

**Constructor:** `constructor(address _owner, address _credentialManager)` — both must be non-zero.

##### User-Facing Functions

| Function | Signature | Description |
|---|---|---|
| `deposit` | See §2.1 | Deposit ERC-20 tokens into vault |
| `withdraw` | See §3.1 | Withdraw tokens with quorum signatures |
| `executeAtomicSettlement` | See §5.1 | Single-tx settlement with callback |
| `pullBatchSettlement` | See §4.1 | Batch settlement pull phase (administrator) |
| `pushBatchSettlements` | See §4.2 | Batch settlement push phase (administrator) |

##### View Functions

| Function | Signature | Returns |
|---|---|---|
| `ORDER_TYPEHASH()` | `view returns (bytes32)` | EIP-712 Order typehash (§6.4) |
| `owner()` | `view returns (address)` | Vault owner |
| `credentialManager()` | `view returns (address)` | Credential manager |
| `withdrawalQuorum()` | `view returns (uint256)` | Min signatures for withdrawal |
| `getApprovedSettlers()` | `view returns (bytes32[])` | All approved settler IDs |
| `approvedSettlers(uint256)` | Array accessor | Settler ID at index |
| `isAdministrator(address)` | `view returns (bool)` | Whether address is administrator |
| `settlementCounts(bytes32, uint64)` | Mapping | Settlement nonce per (user, account) |
| `depositCounts(bytes32, uint64)` | Mapping | Deposit nonce per (user, account) |
| `withdrawalCounts(bytes32, uint64)` | Mapping | Withdrawal nonce per (user, account) |
| `administrators(uint256)` | Array accessor | Administrator at index |
| `lastSignatureUse()` | `view returns (uint256)` | Block of last signature use |
| `credentialManagerChangeDelayBlocks()` | `view returns (uint256)` | Block delay for credential manager change (default: 14,400 ≈ 1 hr on Arbitrum) |
| `pendingSettlements(bytes32, uint64, uint256)` | Mapping + array | Pending settlement at index; returns `(Settlement, address target)` |
| `settlementCaps(address)` | Mapping | Per-token settlement cap (unused; see Flagged for Review) |
| `canDeposit(address)` | Mapping | Depositor allowlist (temporary; see Flagged for Review) |

Admin functions (`setAdministrators`, `addSettlerExecutor`, `removeSettler`, `setDomainSeparator`, `setCredentialManager`, `setOwner`, `setDepositorStatus`, `ownerWithdrawToken`) — see Flagged for Review and D10.

#### 6.3 Registry and CredentialManager Functions

##### Registry Read Functions

| Function | Signature | Description |
|---|---|---|
| `getAssets(uint16 start, uint16 end)` | `returns (AssetData[])` | Paginated asset list, range `[start, end)` |
| `getAssetData(uint64 chainId, uint16 index)` | `returns (AssetData)` | Asset data by chain + index |
| `getAssetIndex(uint64 chainId, bytes32 assetAddress)` | `returns (uint32)` | Address → index. Returns `type(uint32).max` if not found |
| `getRiskParameters(uint16 start, uint16 end)` | `returns (RiskParameters[])` | Paginated risk parameters by asset index |
| `riskParameters(uint16)` | Single accessor | Risk parameters for asset index |
| `pendingRiskParameters(uint16)` | `returns (RiskParameters parameters, uint256 validAfter)` | Pending risk params + eligibility timestamp |
| `feeAccount()` | `returns (bytes32)` | Fee collection account |
| `riskParameterChangeDelaySeconds()` | `returns (uint256)` | Delay before pending risk params apply (default: 1 day) |
| `admin()` | `returns (address)` | Admin address |
| `riskManagerMultisig()` | `returns (address)` | Risk manager multisig |

Admin/risk-manager functions (`setAdmin`, `setRiskManagerMultisig`, `setAssetData`, `setMaxDeposits`, `setMax1HrDeposits`, `setPendingRiskParameters`, `applyPendingRiskParameters`, `setFeeAccount`, `validateRiskParameters`) — see Flagged for Review. See D7 for risk concepts, D14 for interest rate formulas.

##### CredentialManager Read Functions

| Function | Signature | Description |
|---|---|---|
| `getVaults(uint16 start, uint16 end)` | View | Paginated registered vaults |
| `vaults(uint256 index)` | View | Vault at index |
| `adminUpdateStrategies(uint256 routingId, uint256 vmId)` | View | Strategy for (routingId, vmId) |
| `admin()` | View | Admin (immutable — set in constructor) |

Admin functions (`addVault`, `registerAdminUpdateStrategy`, `setDepositVaultAdministrators`, `removeVault`, `withdraw`) — see Flagged for Review.

**bytes32→address conversion:** `_getVaultAddress` extracts EVM address from `bytes32` via `address(uint160(uint256(vault.vaultAddress >> 96)))`. Left-aligned: address in high 20 bytes, zeros in low 12. Non-EVM vaults use full 32 bytes.

##### IAdminUpdateStrategy

Chain-specific strategies must implement:

```solidity
interface IAdminUpdateStrategy {
    function setAdministrators(
        address vault,
        address[] calldata newAdministrators,
        uint256 newWithdrawalQuorum
    ) external payable;
}
```

Called via `delegatecall` from `CredentialManager.setDepositVaultAdministrators`. Strategy handles chain-specific messaging (e.g., L1→L2 bridging).

CredentialManager has `receive()` and `fallback()` (both `external payable`) — accepts ETH for cross-chain calls.

#### 6.4 EIP-712 Signing

##### Domain Separator

| Field | Value |
|---|---|
| `name` | `"MyrtleWyckoff"` |
| `version` | `"1"` (dstack `domains.rs`) / `"1.0.0"` (tplus-core, Python SDK). Solidity has no hardcoded version — accepts pre-computed hash. **Mismatch → different separators; verify at deployment.** |
| `chainId` | Chain-specific (e.g. `42161` for Arbitrum One) |
| `verifyingContract` | DepositVault address |

Set once via `setDomainSeparator(bytes32)` (owner-only, reverts if non-zero). Immutable after first set.

##### Order TypeHash (Settlements)

```solidity
bytes32 constant ORDER_TYPEHASH = keccak256(
    "Order(address tokenOut,uint256 amountOut,address tokenIn,uint256 amountIn,bytes32 user,uint64 account,uint256 nonce,uint256 validUntil)"
);
// = 0xca09a5b505bde8373ae9902bedb88c22a083f84263d36caa7df7cff3a7f034ff
```

Struct hash computation:

```solidity
bytes32 structHash = keccak256(abi.encode(
    ORDER_TYPEHASH,
    order.tokenOut,
    order.amountOut,
    order.tokenIn,
    order.amountIn,
    user,
    account,
    order.nonce,
    validUntil
));

bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
```

##### Withdrawal Digest

Withdrawals use a simplified (non-EIP-712) digest — signed by CE, not user wallets:

```solidity
bytes32 digest = keccak256(abi.encodePacked(
    domainSeparator,
    withdrawal.tokenAddress,
    withdrawal.amount,
    user,
    withdrawal.nonce,
    validUntil,
    epochHash,
    target
));
```

No `\x19\x01` prefix — intentional; CE-signed, so EIP-712 wallet-compatibility unnecessary.

`account` is **not** in the digest despite being a `withdraw()` parameter — used only for nonce lookup. Contrast with `Order` typehash which includes both `user` and `account`.

#### 6.5 Error Definitions

##### DepositVault Errors

| Error | Parameters | Condition |
|---|---|---|
| `NotOwner` | — | Caller not owner |
| `NotAdmin` | — | Caller not administrator |
| `NotExecutor` | — | Caller not registered executor |
| `NotCredentialManager` | — | Caller not credential manager |
| `Expired` | — | `block.timestamp > validUntil` |
| `InvalidNonce` | `uint256 expected, uint256 given` | Nonce mismatch |
| `InvalidSignature` | — | Recovery failed or signer not admin |
| `EmptyOrders` | — | Empty orders array |
| `MissedQuorum` | `uint256 provided, uint256 required` | Insufficient unique admin signatures |
| `InsufficientAmountFromExecutor` | `uint256 actual, uint256 required` | Callback returned < `amountIn` |
| `ZeroAddress` | — | `address(0)` provided |
| `ZeroWithdrawalQuorum` | — | Quorum set to 0 |
| `InsufficientAdministrators` | `uint256 actual, uint256 required` | Fewer admins than quorum |
| `TooSoon` | — | Credential manager change before delay elapsed |

##### Registry Errors

| Error | Condition |
|---|---|
| `NotAdmin` | Caller not admin |
| `NotRiskManager` | Caller not risk manager multisig |
| `IndexOutOfBounds` | Asset index >= count |
| `ChainAlreadyExists` | Asset already registered on chain |
| `ZeroAddress` | Asset address is zero |
| `RiskManagerNotSet` | Admin renounce without risk manager set |
| `NoPendingRiskParameters(uint16)` | No pending risk params for asset |
| `TooSoon(uint16, uint256)` | Pending risk params not yet eligible |
| `InvalidCollateralFactor` | CF > 100 |
| `InvalidLiabilityFactor` | LF > 100 |
| `InvalidUtilizationCap` | > 1e18 |
| `InvalidMaxFundingRate` | > 1142 |
| `InvalidMaxUtilizationRate` | > 1142 |
| `InvalidInterestKinks` | Not increasing from 0 to 1,000,000 |
| `InvalidRateInterestKinks` | Rates not increasing |
| `InvalidUSDInterestKinks` | USD kinks not valid |
| `InvalidUSDRateInterestKinks` | USD rates not increasing |
| `InvalidInitialMarginsConfiguration` | Clamps/factors length mismatch |
| `InvalidInitialMarginsClamps` | Not increasing or > 1,000,000 |
| `InvalidInitialMarginsFactors` | Not non-increasing or >= 1,000,000 |

##### CredentialManager Errors

| Error | Condition |
|---|---|
| `NotAdmin` | Caller not admin |
| `NoStrategy` | No strategy registered for (routingId, vmId) |
| `StrategyAlreadyExists` | Strategy already registered for (routingId, vmId) |
| `VaultNotFound(uint256, uint256)` | No vault for (routingId, vmId) |

---

### 7. Event Definitions and Indexed Parameters

#### DepositVault Events

| Event | Parameters | Description |
|---|---|---|
| `Deposited` | `bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenAddress, uint256 amount` | Deposit completed |
| `Settled` | `bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenOut, uint256 amountOut, address tokenIn, uint256 amountIn` | Settlement completed |
| `Withdrew` | `bytes32 indexed user, uint64 indexed account, uint256 indexed nonce, address tokenAddress, uint256 amount` | Withdrawal completed |
| `AdministratorSetReset` | _(none)_ | Admin set cleared and replaced |
| `AdminAdded` | `address newAdmin, uint256 numAdminsAfter` | Per admin added in `setAdministrators` |
| `WithdrawalQuorumChanged` | `uint256 previous, uint256 current` | Quorum updated |
| `CredentialManagerChanged` | `address oldCredentialManager, address newCredentialManager` | Credential manager changed |

**Event topic hashes** (for log filtering):

| Event | Topic 0 |
|---|---|
| `Deposited` | `0x9d677c46e10ba33882144473956fae8d2c52353dcde5aab8230d1bd280cfc3b4` |
| `Settled` | `0x9969fe768a70bff6317c8dea6fafd06f63a1ce37fd7a2a227862aced26fa7dfa` |
| `Withdrew` | `0xc4f5735f1abe60807c07c06560e4a6d7eb655a37442b6a47e3ab1998c9611e2f` |

#### Registry Events

| Event | Parameters | Description |
|---|---|---|
| `MaxDepositChanged` | `uint64 chain, uint16 index, uint256 previous, uint256 current` | Deposit cap changed |
| `Max1HrDepositChanged` | `uint64 chain, uint16 index, uint256 previous, uint256 current` | Hourly deposit cap changed |

No other custom events. For `setAssetData`, `setPendingRiskParameters`, `applyPendingRiskParameters`, `addVault`, `registerAdminUpdateStrategy` — monitor tx receipts.

---

### 8. Transaction Flow Diagrams

#### 8.1 Deposit Flow

```
User Wallet          DepositVault
    │                     │
    ├──approve(vault)────▶│  (ERC-20 approval)
    │                     │
    ├──deposit(user,      │
    │  account, token,    │
    │  amount)───────────▶│
    │                     ├──safeTransferFrom(user → vault)
    │                     ├──emit Deposited(user, account, nonce, token, amount)
    │                     ├──depositCounts[user][account]++
    │                     │
```

#### 8.2 Withdrawal Flow

```
Clearing Engine (off-chain)         DepositVault              Target Wallet
    │                                    │                        │
    ├──administrators sign digest───────▶│                        │
    │                                    │                        │
    ├──withdraw(withdrawal, user,        │                        │
    │  account, target, validUntil,      │                        │
    │  epochHash, signatures)───────────▶│                        │
    │                                    ├──verify quorum sigs    │
    │                                    ├──safeTransfer──────────▶│
    │                                    ├──emit Withdrew          │
    │                                    │                        │
```

See D9 for off-chain withdrawal lifecycle and delays.

#### 8.3 Batch Settlement Flow

```
Administrator        DepositVault              Target
    │                     │                      │
    ├──pullBatchSettlement │                      │
    │  (orders, user,     │                      │
    │  account, target,   │                      │
    │  validUntil)───────▶│                      │
    │                     ├──verify EIP-712 sigs  │
    │                     ├──store pending        │
    │                     ├──safeTransfer(tokenOut)▶│
    │                     │                      │
    │  (target approves vault for tokenIn)       │
    │                     │                      │
    ├──pushBatchSettlements│                      │
    │  (user, account)───▶│                      │
    │                     ├──safeTransferFrom(tokenIn)◀│
    │                     ├──emit Settled (per order)  │
    │                     ├──clear pending        │
    │                     │                      │
```

#### 8.4 Atomic Settlement Flow

```
Executor Contract    DepositVault              Admin (off-chain)
    │                     │                      │
    │                     │◀──EIP-712 signature───┤
    │                     │                      │
    ├──executeAtomicSettlement                   │
    │  (order, user,      │                      │
    │  account, validUntil,│                     │
    │  data, signature)──▶│                      │
    │                     ├──verify sig + nonce   │
    │                     ├──increment nonce      │
    │◀──onAtomicSettlement │                      │
    │  (tokenOut, amount,  │                      │
    │   data)              │                      │
    │  (executor swaps)    │                      │
    ├──return amountIn────▶│                      │
    │                     ├──safeTransferFrom(tokenIn from executor)
    │                     ├──safeTransfer(tokenOut to executor)
    │                     ├──emit Settled         │
    │                     │                      │
```

---

## Cross-References

| Links to | Reason |
|---|---|
| D5 (Python SDK) | EVM module wraps these contracts |
| D7 (Risk Mechanisms) | Registry stores risk parameters; D7 covers margin concepts |
| D9 (Settlement & Clearing) | Settlement/withdrawal lifecycle, off-chain signing, delays |
| D10 (Liveness & Trust) | Escape hatch, admin key management, access control |
| D13 (Rebalancing) | Registry deposit caps; `minWeight`/`bufferMultiple` planned, not yet in contract |
| D14 (Interest Rates) | Registry `RiskParameters` interest kinks and funding params; D14 covers formulas |

---

## Flagged for Review

Pre-production, admin-only, or discrepancy items from source:

**Pre-production / temporary:**

| Item | Location | Reason |
|---|---|---|
| `canDeposit` + `setDepositorStatus()` | `DepositVault.sol:61, 350-353` | `TODO: Delete before production` — temporary allowlist |
| `ownerWithdrawToken()` | `DepositVault.sol:635-639` | `TODO: Delete before production` — owner can withdraw any token |
| `removeVault()` | `CredentialManager.sol:110-119` | `TODO: Remove once live` |
| `deploy_dev()` / `get_dev_default_owner()` | `tpluspy/tplus/evm/contracts.py` | Dev-only deployment helpers |
| `settlementCaps` mapping | `DepositVault.sol:43` | Unused — not yet implemented |

**Interface/implementation discrepancies:**

| Item | Location | Reason |
|---|---|---|
| `IDepositVault` out of sync | `IDepositVault.sol` vs `DepositVault.sol` | (1) Omits `uint64 account` from `deposit`, `executeAtomicSettlement`, `pullBatchSettlement`, `pushBatchSettlements`, `withdraw`; (2) `withdraw` takes `bytes` not `bytes[]`; (3) nonce mappings take `bytes32` not `(bytes32, uint64)`; (4) events omit `uint64 indexed account`. |
| `IRegistry` out of sync | `IRegistry.sol` vs `Registry.sol` | `RiskParameters` uses `uint16[]` for `initialMarginClamps`/`initialMarginFactors` vs `uint256[]` in impl. Omits `premiumClamp`, `maxFundingRate`, `maxUtilizationRate`, `feeAccount()`, `setFeeAccount()`. |
| `ICredentialManager` type mismatch | `ICredentialManager.sol` vs `CredentialManager.sol` | Interface `Vault.vmId` is `uint64`; implementation uses `uint256`. |
| Python `Order` EIP712Message | `tpluspy/tplus/evm/eip712.py` | Missing `account` field from Solidity `ORDER_TYPEHASH`. Will cause signing failures. |
| EIP-712 domain `version` mismatch | `eip712.py` vs `DepositVault.sol` + `domains.rs` | tplus-core and Python SDK use `"1.0.0"`. dstack `domains.rs` uses `"1"`. Solidity has no hardcoded version. Mismatch → failed signatures. |
| Python SDK `domain_separator` slot | `tpluspy/tplus/evm/contracts.py:403` | Reads `get_storage(self.address, 1)` but `_domainSeparator` is slot 2 (slot 0 = `owner`, slot 1 = `credentialManager`). Wrong slot. |

**Bugs / design concerns:**

| Item | Location | Reason |
|---|---|---|
| `setCredentialManager` delay logic | `DepositVault.sol:228-238` | Condition `if (block.number >= ... + delay) revert TooSoon()` is **inverted** — reverts when enough blocks have passed. Should be `<`. |
| CredentialManager admin immutability | `CredentialManager.sol` | No `setAdmin()` — admin immutable. Verify intentional (Registry has `setAdmin`). |
| `minWeight` / `bufferMultiple` | `Registry.sol` vs D13 sprint ticket | Referenced in D13 but **not in current source**. Planned, not implemented. |

**Admin functions (excluded from main content per scope):**

DepositVault admin functions:

| Function | Access | Description |
|---|---|---|
| `setAdministrators(address[], uint256)` | Credential Manager | Replace admin set + quorum |
| `addSettlerExecutor(bytes32, address)` | Owner | Register executor for atomic settlements |
| `removeSettler(bytes32)` | Owner | Remove settler and all executors |
| `setDomainSeparator(bytes32)` | Owner | Set EIP-712 domain separator (one-time) |
| `setCredentialManager(address)` | Owner | Update credential manager (inverted delay bug — see above) |
| `setOwner(address)` | Owner | Transfer ownership |
| `setDepositorStatus(address, bool)` | Owner | Depositor allowlist (temporary) |
| `ownerWithdrawToken(address, address, uint256)` | Owner | Emergency withdrawal (temporary) |

Registry admin/risk-manager functions:

| Function | Access | Description |
|---|---|---|
| `setAdmin(address)` | Admin | Transfer admin. Renounceable to `address(0)` only if `riskManagerMultisig` set. |
| `setRiskManagerMultisig(address)` | Admin | Set risk manager multisig |
| `setAssetData(AssetData)` | `riskManagerMultisig` | Register asset or add chain instance (`data.index` <= count) |
| `setMaxDeposits(uint16, uint16, uint256)` | `riskManagerMultisig` | Update deposit cap |
| `setMax1HrDeposits(uint16, uint16, uint256)` | `riskManagerMultisig` | Update hourly deposit cap |
| `setPendingRiskParameters(uint16, RiskParameters)` | `riskManagerMultisig` | Queue risk params (`validAfter = block.timestamp + delay`) |
| `applyPendingRiskParameters(uint16)` | Permissionless | Apply pending params once eligible; deletes pending |
| `setFeeAccount(bytes32)` | `riskManagerMultisig` | Set fee account |
| `validateRiskParameters(RiskParameters)` | `pure` | Validate risk params; reverts on invalid input |

CredentialManager admin functions:

| Function | Access | Description |
|---|---|---|
| `addVault(uint8, uint256, bytes32, ChainConfig)` | Admin | Register vault (append-only) |
| `registerAdminUpdateStrategy(uint256, uint256, IAdminUpdateStrategy)` | Admin | Register strategy (append-only) |
| `setDepositVaultAdministrators(uint256, uint256, address[], uint256)` | Admin (payable) | Update vault admins via strategy (`delegatecall`) |
| `removeVault(uint256)` | Admin | Remove vault (temporary) |
| `withdraw(address)` | Admin | Transfer full ETH balance |

Registry constructor: `constructor(address _admin)` — transferable via `setAdmin()`, renounceable if `riskManagerMultisig` set.

CredentialManager constructor: `constructor(address _admin)` — admin immutable (no transfer function).

---

## Changelog

- Initial passes (0–5): Built from source contracts. All structs, functions, events, errors, EIP-712, flows. Flagged 12 items.
- Structure passes (1–2): 8-section target structure. Admin functions to Flagged for Review. Merged EIP-712/errors into §6.
- Accuracy passes (2–3): Cross-verified all deliverables and source. Fixed domain version attribution, bytes32→address, delay logic, storage slot. Added event caveats.
- Prose pass (3): Tightened descriptions, standardized "CE", removed filler.
- Pass 3 (Prose & Conciseness): Shortened table descriptions, cut redundant phrases, condensed changelog, tightened cross-references. No content added or facts changed.
- Pass 1 (Structure & Scope): Verified all content against source files. Fixed IM factors validation from "strictly decreasing" to "non-increasing" per Registry.sol. Added event topic hashes (from blockchain-client-utils) to §7. No out-of-scope content found.
- Pass 2 (Accuracy): Read all 12 source files plus 2 secondary-context dirs. Verified every function signature, struct field, parameter type, error definition, event signature, and EIP-712 encoding against DepositVault.sol, Registry.sol, CredentialManager.sol, and all interfaces. Fixed kinkInterestRates/usdKinkInterestRates validation description from "monotonically increasing" to "non-decreasing" (source validateIncreases allows equal adjacent values). All other claims confirmed correct against source.
- Pass 3 (Prose & Conciseness): Tightened table descriptions, view function signatures, admin function tables, and flagged item wording. Removed filler words and redundant qualifiers. Shortened file paths in flagged items. No content added or facts changed.
