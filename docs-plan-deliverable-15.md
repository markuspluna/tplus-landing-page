# Deliverable 15: Confirmation Policies & Event Ingestion

## Scope

How the chain adapter confirms onchain events before forwarding them to the clearing engine. Covers confirmation policies, the confirmation queue, per-chain configuration, supported event types, and dequeuing logic.

**Boundaries:** Excludes settlement lifecycle (D9), contract ABI details (D4), liveness guarantees (D10), and chain adapter overlay transport.

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/queue.rs` — ConfirmationQueue implementation
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/adapter/evm_adapter.rs` — EVM event decoding, policy selection, enqueue/dequeue orchestration
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/adapter.rs` — AdapterTask event loop, block head handling
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/chain-adapter/src/config.rs` — per-chain default configurations
- `/Users/markuspaulsonluna/Dev/tplus-core/messages/blockchain_client_messages/src/chain_config.rs` — ConfirmationPolicy enum, ConfirmationPolicies struct
- Cross-references: D9 (settlement), D4 (contracts), D10 (liveness)

---

## Content

### 1. Overview

The chain adapter sits between the blockchain and the clearing engine. When onchain events occur (deposits, settlements, withdrawals), the adapter must decide how long to wait before forwarding them to the CE. Waiting reduces the risk of acting on events that get reverted by a chain reorganization; forwarding immediately reduces latency.

Confirmation policies control this tradeoff per chain and per event type.

### 2. Confirmation Policy Types

Three policies are available:

- **`Blocks(n)`** — Wait until the event's block has `n` additional blocks built on top of it before forwarding. The standard policy for EVM chains.
- **`Immediate`** — Forward the event to the CE as soon as it's detected, with no confirmation delay. Used for settlement events on most chains because re-org handling for settlements occurs at the CE layer via state locks (see D9).
- **`Finalized`** — Wait for the chain's native finality signal rather than counting blocks. Intended for chains like Solana where block-count confirmation is not the right model. **Not yet implemented in the dequeue path** — events queued under this policy are currently not released.

### 3. Per-Chain Configuration

Each vault has four independent confirmation policies — one per event type plus a default:

| Policy | Purpose |
|---|---|
| `deposit_ingest` | Confirmation requirement for deposit events |
| `settlement_ingest` | Confirmation requirement for settlement events |
| `withdrawal_ingest` | Confirmation requirement for withdrawal events |
| `default` | Fallback for any event type without an explicit policy |

Default configurations per chain:

| Chain | Default Policy | Block Time |
|---|---|---|
| Ethereum | `Blocks(4)` | 12s |
| Arbitrum | `Blocks(15)` | 1s |
| Base | `Blocks(10)` | 2s |
| Optimism | `Blocks(10)` | 2s |
| Unichain | `Blocks(10)` | 1s |
| BSC | `Blocks(15)` | 3s |
| Bitcoin | `Blocks(6)` | 10m |

Settlement events default to `Immediate` across all EVM chains. Deposit and withdrawal events use the chain's block-count policy.

These defaults can be overridden by values from the vault registry's onchain `ChainConfig` (`depositIngestConfirmations`, `settlementIngestConfirmations`, `withdrawalIngestConfirmations`).

### 4. Confirmation Queue

The confirmation queue buffers events that require block confirmations before being forwarded to the CE.

**Event types tracked:**
- Deposits — `Settled` vault events from `deposit()` calls
- Settlements — `Settled` vault events from `executeAtomicSettlement()` or batch settlement calls
- Withdrawals — `Withdrew` vault events from `withdraw()` calls

Each event is keyed by `(vault_address, user, nonce)`, ensuring exactly-once delivery per unique event.

**Enqueue:** When a vault log is decoded and the event's confirmation policy requires waiting, the event is placed in the queue with its block number recorded.

**Dequeue:** On each new block head, the queue checks all buffered events:
- If `current_block - event_block >= required_confirmations`, the event is confirmed, removed from the queue, and forwarded to the CE as an `AdapterEvent` (`VaultDeposited`, `VaultSettled`, or `VaultWithdrew`).
- If not enough blocks have passed, the event stays queued.

Events with `Immediate` or `Blocks(0)` policy bypass the queue entirely and are forwarded on detection.

### 5. Re-org Considerations

The confirmation queue does not explicitly detect or roll back re-orged events. The block-count delay is the primary defense — by waiting for sufficient confirmations, the probability of acting on a re-orged event is minimized.

For settlement events (which use `Immediate`), re-org safety is handled at the CE layer through the state lock mechanism described in D9. If a settlement event is re-orged after ingestion, the CE's lock expiry ensures assets are eventually returned.

## Flagged for Review

- `Finalized` confirmation policy is defined but not implemented in the dequeue path — events queued under this policy are never released.
- Settlement sub-account index is hardcoded to margin account during event decoding.
- Withdrawal log queries do not specify block ranges, which may cause unnecessary load.

---

## Changelog

- Pass 1: Generated from chain-adapter source (queue.rs, evm_adapter.rs, adapter.rs, config.rs, chain_config.rs).
