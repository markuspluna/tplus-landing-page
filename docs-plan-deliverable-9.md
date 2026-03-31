# Deliverable 9: Settlement & Clearing

## Scope

How trades settle onchain after offchain confirmation. Covers the settlement lifecycle, settlement types, netting/batching, signing flows, withdrawal mechanics, and SDK/contract execution.

**Boundaries:** Excludes API endpoint signatures (D2, D3), contract ABI details (D4), SDK method signatures (D5), fee mechanics (D6), margin/risk during settlement (D7), order matching (D8), liveness guarantees during settlement failure (D10), rebalancing fees (D13), and confirmation policies (D15).

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/` — ChainAdapter, EvmAdapter, SettlementSigningPayload, WithdrawalSigningPayload, AdapterEvent, DecodedSettledEvent
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/clearingengine/` — SettlementClient, WithdrawalClient
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/model/` — TxSettlementRequest, BatchSettlementRequest, InnerSettlementRequest, WithdrawalRequest
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/` — SettlementManager, DepositManager
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/DepositVault.sol` — Settlement and withdrawal onchain entry points (ABI details in D4)
- `/Users/markuspaulsonluna/Dev/tplus-contracts/src/CredentialManager.sol` — ChainConfig (block confirmations)
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/match-finalization-2f2e.md` — match finalization concepts
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/withdrawal-delays-2ebe.md` — withdrawal delay mechanism
- Cross-references: D4 (contracts), D5 (SDK), D10 (TEE/escape hatches), D15 (confirmation policies)

---

## Content

### 1. Settlement Lifecycle Overview

Settlement is the composability mechanism that lets users settle leveraged exposure into external onchain liquidity rather than closing the position in the t+ book — any piece of onchain state (DEX, RFQ, Mint/Redeem contract, auction) can be interacted with. Settlements can be partial and pull from pooled user deposits across chains; makers don't need inventory on the settlement chain. Four stages:

1. **Initiation** — Settler signs a request specifying assets, amounts, and chain, and submits it to CE.
2. **State lock & approval** — CE validates the request, checks that the settlement won't violate margin requirements, and locks the settled assets so they can't be used elsewhere. CE then signs an EIP-712 approval and streams it back to the settler.
3. **Onchain execution** — Settler calls `executeAtomicSettlement()` on the deposit vault contract deployed on the chain they're executing on with the approval and an arbitrary callback — the callback is where composability happens (DEX swap, RFQ fill, mint/redeem, etc.).
4. **Confirmation & lock release** — CE ingests the onchain settlement event after sufficient block confirmations, releases the lock, and updates inventory. If the settlement never executes, the lock expires and assets are returned.

See D15 for confirmation policies and the `ConfirmationQueue` mechanism.

### 2. Settlement Types

#### Atomic Settlement (RFQ / Tx-Based)

`TxSettlementRequest` wraps `InnerSettlementRequest` (asset_in, amount_in, asset_out, amount_out, tplus_user, settler, chain_id) + settler's Ed25519 signature.

1. Settler calls `init_settlement(request)` → POST `settlement/init`.
2. CE validates, prepares EIP-712 struct hash, signs with TEE-attested key.
3. Settler retrieves approval via `get_signatures(user)` or `stream_approvals(user_hex)` WebSocket (encrypted to user's Ed25519 key).
4. Settler calls `DepositVault.executeAtomicSettlement(order, user, account, validUntil, data, signature)` onchain.

Onchain execution after checks pass (see Section 7 for errors): verify signature → record `lastSignatureUse` → increment nonce **before** callback (replay prevention) → `onAtomicSettlement()` on executor (returns amountIn) → tokenIn executor→vault → tokenOut vault→executor → emit `Settled`.

#### Batch Settlement

Two-phase process enabling netting across multiple fills. `InnerBatchSettlementRequest.settlements` aggregates `BaseSettlement` items with CE-constructed transaction bundle.

1. **Pull phase** — `pullBatchSettlement(...)`: Administrator-only. Requires empty pending queue for `(user, account)`. Validates expiry, iterates orders, validates nonces sequentially, verifies EIP-712 signatures, stores as `PendingSettlement`, transfers `tokenOut` to target. Increments `settlementCounts`.
2. **Push phase** — `pushBatchSettlements(user, account)`: Administrator-only. Pulls `tokenIn` from target into vault, emits `Settled` per order, clears pending queue.

Submitted via `init_batch_settlement()` → POST `settlement/batch`.

#### Forced Settlement

See D10.

### 3. Signing Flow

#### Settlement Signing (EIP-712)

EIP-712 typed struct:

```
Order(address tokenOut, uint256 amountOut, address tokenIn, uint256 amountIn, bytes32 user, uint64 account, uint256 nonce, uint256 validUntil)
```

1. Chain adapter computes `structHash` = `keccak256(abi.encode(ORDER_TYPEHASH, ...))` and `digest` = `keccak256("\x19\x01" || domainSeparator || structHash)`.
2. Domain separator: `"MyrtleWyckoff"` (version "1.0.0", chainId, verifyingContract = vault).
3. CE (TEE / DStack) signs digest with key registered as administrator. Vault `owner` = DStack shared secret address.
4. `checkApproval()` recovers signer via ECDSA, verifies administrator status.

#### Withdrawal Signing (Quorum)

- Digest is **not** EIP-712 compliant (simplified; not wallet-signed): `keccak256(abi.encodePacked(domainSeparator, tokenAddress, amount, user, nonce, validUntil, epochHash, target))`.
- Requires `withdrawalQuorum` unique administrator signatures. Contract recovers signers, deduplicates, requires `numSeenAdmins >= quorum`.
- After verification: nonce bumped, `lastSignatureUse` recorded, tokens transferred, `Withdrew` emitted.

#### Settler Request Signing (Ed25519)

Settler signs request before sending to CE. `InnerSettlementRequest.signing_payload()` produces deterministic JSON; `TxSettlementRequest.create_signed()` signs with user's private key.

### 4. SDK Settlement Functions

See D5 for method signatures. Key classes:

- **`SettlementClient`** — `init_settlement()`, `init_batch_settlement()`, `get_signatures()`, `stream_approvals()`, `update()`
- **`WithdrawalClient`** — `init_withdrawal()`, `get_signatures()`, `get_queued()`, `update()`
- **`SettlementManager`** — High-level: `init_settlement(...)` creates signed request and returns `SettlementInfo`; `execute_settlement(info, approval)` calls `executeAtomicSettlement` onchain
- **`SettlementApprovalHandler`** — `handle_approvals(pending, callback)` streams approvals, matches by nonce, invokes callback

### 5. Contract Settlement Functions

See D4 for full ABI details. Key `DepositVault` entry points:

- `executeAtomicSettlement(order, user, account, validUntil, data, signature)` — settler executor; atomic settlement + callback
- `pullBatchSettlement(orders[], user, account, target, validUntil)` — administrator; batch phase 1
- `pushBatchSettlements(user, account)` — administrator; batch phase 2
- `withdraw(withdrawal, user, account, target, validUntil, epochHash, signatures[])` — signature-gated; quorum-verified
- `deposit(user, account, tokenAddress, amount)` — approved depositor
- `addSettlerExecutor(settler, executor)` — owner (TEE); register settler + executor
- `settlementCounts(user, account)` / `withdrawalCounts(user, account)` — view; nonce queries

### 6. Withdrawal Flow

Delay-gated lifecycle:

1. **Request** — User signs a `WithdrawalRequest` (Ed25519) specifying asset, amount, chain. Submitted via `WithdrawalClient.init_withdrawal()`.
2. **Delay calculation** — CE evaluates `cum_cap_delta` per account per asset. Cliff-based tiers: net depositors → minimum delay; large withdrawals at high utilization → maximum delay. Formula `Δu / (1 - u_before)` amplifies impact at high utilization.
3. **Queue** — Stored with `execution_time = now + delay`. Query via `WithdrawalClient.get_queued(user)`.
4. **Execution** — At `execution_time`, CE re-verifies solvency (MM requirements) and vault balance. Insufficient balance → stays queued. Both pass → CE collects quorum signatures, submits `DepositVault.withdraw()`.
5. **Cancellation** — Solvency failure → cancelled, `cum_cap_delta` reversed.

Chain adapter monitors completion via `CheckWithdrawalProcessed` (queries vault logs for `Withdrew` by user and nonce).

### 7. Failure Modes and Retries

| Failure | Behavior |
|---|---|
| `Expired` | Signature past `validUntil`. Re-initialize with fresh approval. |
| `InvalidNonce` | Prior settlement not confirmed or re-orged. CE tracks nonces via vault calls. |
| `InvalidSignature` | ECDSA recovery did not yield administrator. Key rotation or TEE issue. |
| `NotExecutor` | Caller not in `settlerExecutorMap`. Register via `addSettlerExecutor()`. |
| `MissedQuorum` | Fewer unique admin signatures than `withdrawalQuorum`. |
| `InsufficientAmountFromExecutor` | Callback returned less than `order.amountIn`. |
| Block re-org | `ConfirmationQueue` holds events until sufficient confirmations. Re-orged events silently dropped. |
| CE / TEE failure | See D10 for liveness guarantees and escape hatches. |
| Withdrawal solvency failure | Cancelled at execution time; `cum_cap_delta` reversed. User must re-queue. |

## Flagged for Review

- `DepositVault.ownerWithdrawToken()` — marked TODO for deletion before production.
- `canDeposit` mapping and `setDepositorStatus()` — marked TODO for deletion before production.
- `DepositVault.removeVault()` on `CredentialManager` — marked TODO for removal before production.
- `DepositVault.setCredentialManager()` has a TODO for checking against `latestApproval`.
- Solana settlement support marked TODO in `ConfirmationQueue` dequeue methods.

---

## Changelog

- Content cleared: Previous passes contained inaccuracies. Awaiting regeneration with verified source access.
- Pass 1 (Structure & Content Generation): Generated all sections from source files — chain-adapter (Rust), SDK clients/models/managers (Python), DepositVault.sol, CredentialManager.sol, match-finalization and withdrawal-delays Notion docs.
- Pass 2 (Accuracy): Verified all claims against source files. Fixes: clarified settlement requires single admin signature (quorum is withdrawal-only); corrected onchain execution order (nonce bump before callback, then transfers); fixed executor check to exact mapping path `settlerExecutorMap[user].isExecutor[msg.sender]`; added `lastSignatureUse` recording and callback return value detail; noted batch pull requires empty pending queue and expiry check; corrected Solana confirmation policy (Finalized for deposits/withdrawals, Immediate for settlements); added vault balance insufficient behavior in withdrawal execution; clarified CE signing key must be registered administrator.
- Pass 3 (Prose & Conciseness): Merged netting/batching section into lifecycle and batch settlement; converted SDK and contract tables to compact lists; tightened prose throughout to meet 1200-word target.
