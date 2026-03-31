# Deliverable 10: Liveness Guarantees & Operator Trust Requirements

## Scope

Trust model, failure modes, and liveness guarantees. Covers TEE attestation, escape hatches, data availability, operator obligations, and trust assumptions by layer.

**Boundaries:**
- Architecture overview → D1
- API endpoints → D2, D3
- Contract ABI and access control details → D4
- Risk/margin mechanics → D7
- Settlement flow details → D9

---

## Source Material

### tplus-core attestation/mocks
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/mocks/src/` — get_quote(), get_pods(), verify_quote() (TEE attestation interface)

### tplus-core ATLS test
- `/Users/markuspaulsonluna/Dev/tplus-core/bin/dummy-not-atls/src/bin/malicious.rs` — demonstrates why non-attested nodes cannot participate

### tplus-core slot finalization
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/slot-finalization/src/lib.rs` — slot commitment for liveness

### tplus-core overlay encryption
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/encryption/src/` — message encryption for confidentiality

### tplus-core aTLS / P2P overlay
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/overlay/src/libp2p/mod.rs` — aTLS implementation: attestation exchange, quote verification, attested peer tracking
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/gossipsub/CHANGELOG.md` — gossipsub fork adapted for post-handshake aTLS (reuses TLS for encryption, publishes only to attested peers)

### Cross-deliverable sources (used for synthesis)
- `docs-plan-deliverable-1.md` — TEE architecture summary, DStack, attestation properties, tiered security model
- `docs-plan-deliverable-2.md` — aTLS user-facing semantics, defense-in-depth signature forwarding, internal overlay aTLS
- `docs-plan-deliverable-4.md` — DepositVault access control roles, credentialManagerChangeDelayBlocks, riskParameterChangeDelaySeconds, withdrawal quorum
- `docs-plan-deliverable-7.md` — EigenLayer AVS for liquidation monitoring, circuit breakers
- `docs-plan-deliverable-9.md` — Settlement signing flow, withdrawal lifecycle, epochHash binding

### Landing page sources
- `pitch.html` — TEE execution model, risk controls, EigenLayer insurance
- `research.html` — TEE+DStack, ZTEE, TEE-KMS paper links
- `get-involved.html` — light clients in TEEs, risk engine role
- `investor-letter.html` — team TEE expertise, audit context

### Protocol docs
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/tplus-protocol-safety-high-level-overview-2e7e.md` — hardware safety, quorum certificates, interactive client safety
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/slot-commitment-for-liveness-reliability-232e.md` — slot commitment for liveness guarantees
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/escape-hatch-thoughts-264e.md` — forced withdrawal via merkle roots and outbox clearing
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/unlocking-full-safety-without-state-inclusion-proo-2e6e.md` — interactive client safety and balance proofs
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/generalized-tee-attestation-authorization-policy-f-2c7e.md` — TEE attestation framework (TDX, CVMs, cloud providers)
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/sample-tdx-quote-2eee.md` — example TDX quote structure
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/tee-based-censorship-resistant-discovery-2f4e.md` — TEE-based network discovery without CDN
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/losing-determinism-for-oracles-2f3e.md` — oracle handling with non-deterministic replicas
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/dynamic-view-changes-in-the-clearing-engine-2f3e.md` — view change protocol for CE quorum
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/restart-workflow-ce-side-2b9e.md` and `restart-workflow-smart-contract-side-2b6e.md` — CE restart and smart contract validation
- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/prod-environment-ce-safetyliveness-testing-2f0e.md` — production safety/liveness testing

---

## Content

### 1. Trust Model Overview

Three safety layers:

1. **Hardware** — TDX guarantees code immutability and memory confidentiality. Any party verifies the running binary via remote attestation.
2. **Quorum certificates** — High-risk components (CE, oracle) run as MPC+TEE quorums (k > N/2). Forging an invalid view requires physically compromising k chips and k operators colluding.
3. **Interactive clients** — TEE-based light clients monitor quorum decisions. Users verify balances via ZKP proofs from nonce-based action tracking. Currently unimplemented.

**Tiered security** (D1 §6):
- **Low-risk** (orderbook, OMS, interest engine): TEE only. Mutations re-validated by CE. Replicable via DStack.
- **High-risk** (CE, oracle): MPC+TEE quorum. Credential/risk parameter changes gated by on-chain timelocks (D4).

### 2. TEE Attestation and Verification

TEE produces a signed *quote* binding code measurement and runtime state to platform identity. Signature chain rooted in Intel CA. TDX CVMs provide full VM isolation — hypervisor cannot read or modify TD memory.

**aTLS:** Attestation exchange during TLS handshake. Only peers passing quote verification receive messages. User-facing: channel integrity replaces per-request signing (D2). Internal: encrypted channels protect order flow. Implementation details in D2.

**GTAAPF:** Node credentials evaluated against attestation policy (hardware type, code measurement) and authorization policy (per-role weight thresholds, diversity requirements across cloud providers).

**User verification:** reproducible build hash → request live quote → verify signature chain → compare code measurement.

### 3. Operator Obligations and Failure Scenarios

**Operator must:** maintain TEE infrastructure · keep CE replicas attested · monitor liveness · submit settlement transactions · manage key rotations.

**Operator cannot** (TEE + on-chain enforced): observe orders/orderbook state · modify matching logic · extract user data · immediately rotate admins (time-delayed; **inverted in source** — see Flagged) · unilaterally change risk parameters (time-delayed; D4).

**Liveness:**
- **Slot commitment:** Leader batches pending actions into slots. Missed slots recover via timer-based fallback. Details in D9.
- **View change:** Replicas detect leader failure via timeout; quorum agreement elects new leader. Pending actions preserved across transitions.
- **Restart:** CE recovers from last encrypted checkpoint. Re-attests via aTLS to peers. On-chain contracts validate admin signatures and nonces — not attestation directly. Details in D9.

### 4. Escape Hatch Mechanisms

If TEE goes permanently offline, users recover funds on-chain. **Design-phase** — see Flagged for Review.

1. TEE periodically commits merkle roots on-chain.
2. Last committed root = most recent valid state.
3. Users construct merkle proofs to prove balances. ZKP balance proofs use nonce-based action tracking.
4. Outbox clearing processes pending withdrawals.
5. Users submit proofs to force-withdraw.

**On-chain safeguards** (D4): time-delayed admin rotation (**inverted in source** — see Flagged) · withdrawal quorum (distinct admin per signature) · time-delayed risk parameter changes.

### 5. Data Availability Guarantees

- **Checkpoints:** On-chain merkle roots enable escape-hatch recovery. Encrypted; decryption requires council key share quorum.
- **Settlement data:** On-chain events for deposits, withdrawals, and settlements. **Gap:** some contract modules emit limited events (D4).
- **Discovery:** TEE-based node discovery via attestation-authenticated connections, CDN-independent.

### 6. Trust Assumptions by Layer

| Layer | Component | Assumption | Enforced By |
|---|---|---|---|
| Offchain (TEE) | Orderbook, OMS | TDX integrity | Attestation; aTLS |
| Offchain (MPC+TEE) | CE, oracle | MPC majority honest | Quorum; rotating leadership |
| Offchain | Oracle feeds | Within circuit breaker bounds | Circuit breakers (D7) |
| Onchain | DepositVault | L1/L2 correctness | Signature + nonce validation |
| Onchain | Admin governance | Timelocks prevent rapid changes | On-chain time delays (D4; admin delay inverted — see Flagged) |

### 7. Failure Mode Table

| Scenario | Impact | Mitigation |
|---|---|---|
| Single TEE node failure | Service interruption | DStack replication; switch operators |
| CE leader failure | Settlement paused | View change; new leader elected |
| CE majority failure | CE halted | Checkpoint restart; escape hatch if permanent |
| TEE permanent offline | No trades/settlements | Force-withdraw via merkle proofs |
| TDX silicon vulnerability | Attestation weakened | Quorum rotation (ZTEE); MPC majority required |
| Admin key compromise (single) | 1 signature exposed | Quorum requires distinct admin signatures |
| Admin key compromise (quorum) | Unauthorized withdrawals | Time-delayed credentials (D4); nonce replay limits |
| Oracle manipulation | Incorrect pricing | Circuit breakers (D7); oracles affect margin only |
| Missed slot | Delayed transition | Timer-based recovery |
| Settlement tx revert | On-chain failure | Retry with fresh nonce/expiry (D9) |
| Network partition | Nodes isolated | View change on quorum side; minority halts |
| Leader dies before slot | Unslotted actions | Pending actions preserved; new leader force-includes |
| Checkpoint too infrequent | Wide recovery window | Unspecified — see Flagged |

---

## Output Format

**Conceptual guide.** Narrative page with:
- Prose explanations for trust model and failure modes
- Tables for trust assumptions and failure modes
- No code examples (conceptual document)
- Style: follow docs-plan.md Part 1: Documentation Style Guide

---

## Cross-References

| Links to | Reason |
|---|---|
| Deliverable 1 (Architecture) | Architecture context, TEE properties, tiered security model, DStack role |
| Deliverable 2 (OMS Endpoints) | aTLS implementation, session authentication, defense-in-depth signatures |
| Deliverable 4 (Smart Contracts) | Contract access control, timelocks, withdrawal quorum, event gaps |
| Deliverable 7 (Risk Mechanisms) | EigenLayer AVS, circuit breakers, margin/liquidation risk controls |
| Deliverable 9 (Settlement & Clearing) | Settlement signing flow, nonce tracking, epochHash binding, withdrawal delays |

---

## Flagged for Review

| Item | Source | Reason |
|---|---|---|
| EigenLayer restaking insurance fund | `pitch.html` | Referenced as Phase 1 feature ("billions in insurance"). Confirm implementation status — live or planned. |
| Zellic audit | `investor-letter.html` | Investor letter states audit is in progress. Confirm completion status and whether results are public. |
| Escape hatch implementation status | `escape-hatch-thoughts-264e.md` | Source titled "thoughts" — confirm whether merkle-root forced withdrawal is implemented or design-only. |
| `ownerWithdrawToken()` | `DepositVault.sol` | Emergency admin withdrawal marked for deletion before production. Conflicts with noncustodial claims if present at launch. |
| `canDeposit` allowlist | `DepositVault.sol` | Temporary depositor gate marked for deletion. Conflicts with permissionless claims if present at launch. |
| Checkpoint commitment frequency | Not documented | Escape hatch recovery window depends on TEE state root commitment frequency. Must be specified. |
| TEE vulnerability disclosure process | Not documented | Document migration plan / quorum rotation (ZTEE) if a TDX vulnerability is disclosed. |
| `prod-environment-ce-safetyliveness-testing` | Protocol doc (not in repo) | Confirm what liveness SLAs are tested and whether results are published. |
| MPC details for high-risk components | D1 §4 | MPC protocol, node count, rotation schedule, geographic distribution unspecified. |
| Admin rotation delay logic inverted | D4 Flagged for Review | D4 documents that the admin rotation delay condition is inverted in the contract — reverts when enough blocks *have* passed instead of when they *haven't*. Directly weakens the admin-rotation delay guarantee described in §3 and §4. Must be fixed before production. |
| GTAAPF diversity requirements | `generalized-tee-attestation-authorization-policy-f-2c7e.md` | Authorization policy supports per-role weight thresholds and diversity requirements (multiple cloud providers). Confirm whether diversity requirements are enforced in production or planned. |
| Oracle bounded divergence parameters | `losing-determinism-for-oracles-2f3e.md` | Replicas tolerate non-deterministic oracle values within configurable bounds. Confirm bound values and whether divergence triggers alerts or halts. |
| Archiver trust model | `dynamic-view-changes-in-the-clearing-engine-2f3e.md` | Archivers are non-attested nodes that persist leader meta. Confirm trust assumptions — malicious archiver could inject invalid meta into new leader's force-include window. |
| Source files in sibling repos | All `/Users/markuspaulsonluna/Dev/notion-managment/` and `/Users/markuspaulsonluna/Dev/tplus-core/` paths | Source files are in sibling repositories, accessible via absolute paths. |

---

## Changelog

- Initial draft: 8 content sections with cross-deliverable and HTML sources.
- Restructured to 7 sections. Added trust assumptions table and failure mode table. Removed comparison section (D1 scope) and standalone safety mechanisms section (distributed into other sections).
- Accuracy passes: cross-verified against D1, D2, D4, D7, D9, HTML sources, protocol docs, and tplus-core source. Fixed inverted admin delay reference, restart flow description, section cross-references.
- Enriched with three-layer safety model, GTAAPF authorization policy, liveness mechanism details, escape hatch ZKP detail. Added flagged items for GTAAPF diversity, oracle bounds, archiver trust.
- Conciseness passes: cut to ~1000-word content target. Removed implementation details (crypto primitives, function signatures, variable names, SlotManager internals). Pushed specifics to cross-references (D2, D4, D9).
