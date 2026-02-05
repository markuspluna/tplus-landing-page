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
2. **Quorum certificates** — High-risk components (CE, oracle) run as MPC+TEE quorums (k > N/2). Forging an invalid view requires physically compromising k chips.
3. **Interactive clients** — TEE-based light clients monitor quorum decisions. Users verify balances via ZKP proofs from nonce-based action tracking.

**Trustless:** fund custody (on-chain contracts; operator never custodies), settlement finality (on-chain signature validation), execution integrity (TEE attestation).

**User trusts:** TDX silicon integrity · MPC majority honesty (CE, oracle) · L1/L2 correctness · oracle feeds within circuit breaker thresholds (D7).

**Tiered security** (D1 §6):
- **Low-risk** (orderbook, OMS, interest engine): TEE only. Mutations re-validated by CE. Replicable via DStack.
- **High-risk** (CE, oracle): MPC+TEE quorum. Credential/risk parameter changes gated by on-chain timelocks (D4).

### 2. TEE Attestation and Verification

TEE produces a signed *quote* binding code measurement (`MRTD`) and runtime measurements (`RTMR` registers) to platform identity. Signature chain rooted in Intel CA. TDX CVMs provide full VM isolation — hypervisor cannot read or modify TD memory.

**aTLS:** Attestation exchange during TLS handshake. Gossipsub fork adds `publish_attested` — only peers passing quote verification receive messages. User-facing: channel integrity replaces per-request signing (D2). Internal: encrypted channels (AES-256-GCM, X25519 ECDH) protect order flow.

**GTAAPF:** Node credentials evaluated against attestation policy (hardware type, code measurement) and authorization policy (per-role weight thresholds, diversity requirements across cloud providers).

**User verification:** reproducible build hash → request live quote → verify signature chain → compare `MRTD`.

### 3. Operator Obligations and Failure Scenarios

**Operator must:** maintain TEE infrastructure · keep CE replicas attested · monitor liveness · submit settlement transactions · manage key rotations.

**Operator cannot** (TEE + on-chain enforced): observe orders/orderbook state · modify matching logic · extract user data · immediately rotate admins (`credentialManagerChangeDelayBlocks`, 14,400 blocks; **inverted in source** — see Flagged) · unilaterally change risk parameters (`riskParameterChangeDelaySeconds`, 1 day; D4).

**Liveness:**
- **Slot commitment:** SlotManager (Active/Passive). Leader drains pending actions into `SlotPayload`, bumps sequence. Missed slots recover via timer-based finalization.
- **View change:** Replicas track leader slot finalizations; on timeout, broadcast "leader dead" votes. k-node agreement elects new leader deterministically. Archivers preserve pending meta so unslotted actions survive.
- **Restart:** CE recovers from last encrypted checkpoint (Shamir Secret Sharing decryption). Re-attests via aTLS. On-chain contracts validate restart certificate, admin signatures, nonces — not attestation directly.

### 4. Escape Hatch Mechanisms

If TEE goes permanently offline, users recover funds on-chain. **Design-phase** — see Flagged for Review.

1. TEE periodically commits merkle roots on-chain.
2. Last committed root = most recent valid state.
3. Users construct merkle proofs to prove balances. ZKP balance proofs use nonce-based action tracking.
4. Outbox clearing processes pending withdrawals.
5. Users submit proofs to force-withdraw.

**On-chain safeguards** (D4): admin rotation delay (14,400 blocks from `lastSignatureUse`; **inverted** — see Flagged) · withdrawal quorum (distinct admin per signature) · risk parameter delay (1 day, immutable).

### 5. Data Availability Guarantees

- **Checkpoints:** On-chain merkle roots enable escape-hatch recovery. Encrypted; decryption requires council key share quorum.
- **Settlement data:** On-chain events (`Settled`, `Withdrew`, `Deposited`). **Gap:** Registry/CredentialManager emit limited events (D4).
- **Discovery:** TEE-based node discovery via attestation-authenticated connections, CDN-independent.

### 6. Trust Assumptions by Layer

| Layer | Component | Assumption | Enforced By |
|---|---|---|---|
| Offchain (TEE) | Orderbook, OMS | TDX integrity | Attestation; aTLS |
| Offchain (MPC+TEE) | CE, oracle | MPC majority honest | Quorum; rotating leadership |
| Offchain | Oracle feeds | Within circuit breaker bounds | Circuit breakers (D7) |
| Onchain | DepositVault | L1/L2 correctness | Signature + nonce validation |
| Onchain | Admin governance | Timelocks prevent rapid changes | `credentialManagerChangeDelayBlocks` (inverted — see Flagged); `riskParameterChangeDelaySeconds` |

### 7. Failure Mode Table

| Scenario | Impact | Mitigation |
|---|---|---|
| Single TEE node failure | Service interruption | DStack replication; switch operators |
| CE leader failure | Settlement paused | BFT view change; new leader elected |
| CE majority failure | CE halted | Checkpoint restart; escape hatch if permanent |
| TEE permanent offline | No trades/settlements | Force-withdraw via merkle proofs |
| TDX silicon vulnerability | Attestation weakened | Quorum rotation (ZTEE); MPC majority required |
| Admin key compromise (single) | 1 signature exposed | Quorum requires distinct admin signatures |
| Admin key compromise (quorum) | Unauthorized withdrawals | Time-delayed credentials (D4); nonce replay limits |
| Oracle manipulation | Incorrect pricing | Circuit breakers (D7); oracles affect margin only |
| Missed slot | Delayed transition | Timer-based recovery |
| Settlement tx revert | On-chain failure | Nonce re-read; fresh `validUntil` (D9) |
| Network partition | Nodes isolated | View change on quorum side; minority halts |
| Leader dies before slot | Unslotted actions | Archivers preserve meta; force-include on new leader |
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
| `setCredentialManager` delay logic inverted | D4 Flagged for Review | D4 documents that the `credentialManagerChangeDelayBlocks` condition in `DepositVault.sol` is inverted — reverts when enough blocks *have* passed instead of when they *haven't*. This directly weakens the admin-rotation delay guarantee described in §3 and §4. Must be fixed before production. |
| GTAAPF diversity requirements | `generalized-tee-attestation-authorization-policy-f-2c7e.md` | Authorization policy supports per-role weight thresholds and diversity requirements (multiple cloud providers). Confirm whether diversity requirements are enforced in production or planned. |
| Oracle bounded divergence parameters | `losing-determinism-for-oracles-2f3e.md` | Replicas tolerate non-deterministic oracle values within configurable bounds. Confirm bound values and whether divergence triggers alerts or halts. |
| Archiver trust model | `dynamic-view-changes-in-the-clearing-engine-2f3e.md` | Archivers are non-attested nodes that persist leader meta. Confirm trust assumptions — malicious archiver could inject invalid meta into new leader's force-include window. |
| Source files in sibling repos | All `/Users/markuspaulsonluna/Dev/notion-managment/` and `/Users/markuspaulsonluna/Dev/tplus-core/` paths | Source files are in sibling repositories, accessible via absolute paths. |

---

## Changelog

- Pass 1 (original): Populated all 8 content sections with concrete detail from cross-deliverable sources and HTML sources. Added comparison table, research links, and 9 Flagged for Review items.
- Pass 2 (original): Incorporated tiered security model from D1 §4. Distinguished low-risk (TEE-only) from high-risk (MPC+TEE) components.
- Pass 3 (original): Cross-checked against D2, D4, D9. Enriched aTLS description with implementation detail.
- Pass 4 (original): Verified protocol doc availability. Enriched aTLS user-facing trust implications.
- Pass 5 (original): Conciseness pass — cut ~250 words.
- Pass 1 (Structure & Scope): Restructured from 8 sections to 7 matching target structure. Removed §8 (Comparison to Alternatives) — architectural comparison belongs in D1; research links moved there. Removed §4 (Safety Mechanisms) as standalone section — distributed content: hardware safety and interactive client safety folded into §1 trust model; quorum certificates and replay protection moved to §7 failure mode table or §4 escape hatches (on-chain safeguards); message encryption moved to §5 data availability. Merged liveness mechanisms (slot commitment, view change, restart) into §3 under operator obligations. Added §6 (Trust Assumptions by Layer) as new table. Added §7 (Failure Mode Table) with 13 concrete scenarios. Removed settlement finality SLA details and withdrawal delay rationale (D9 scope). Removed performance expectations (D8/D9 scope). Tightened scope statement and boundaries. Cleaned up Output Format section.
- Pass 2 (Accuracy): Cross-verified all claims against D1, D2, D4, D7, D9, pitch.html, research.html, get-involved.html, investor-letter.html. Key fixes: (1) §1 replaced "upgrades gated by on-chain timelocks" with precise "risk parameter and credential changes gated by on-chain timelocks" — no on-chain timelock governs code upgrades. (2) §3 corrected "secure administrator key material" to reflect TEE-held keys (operator cannot extract). (3) §3/§4/§6/§7 added notes throughout that `credentialManagerChangeDelayBlocks` delay logic is inverted in current DepositVault source (D4 Flagged for Review) — weakens admin-rotation delay guarantee. (4) §4 corrected DepositVault owner from "is" to "is expected to be" DStack address (convention, not enforced on-chain) per D4. (5) §5 fixed D4 cross-reference from §6 to §8 (events section). (6) Flagged for Review: added `setCredentialManager` delay inversion item; removed stale `replay-protection-for-non-tdx-orderbooks` entry (content removed in prior pass). All other factual claims verified correct against available sources.
- Pass 3 (Prose & Conciseness): Cut ~300 words to bring Content section under 1000-word target. Converted §5 from paragraphs to bullet list. Tightened prose throughout — fragments over full sentences, removed filler and hedging. Shortened table cell text in §6 and §7. Standardized "DStack" capitalization per D12 glossary. Removed redundant source attribution notes. No content added or facts changed.
- Pass 1 (Structure & Scope): Removed attestation interface function signatures from §2 (implementation detail). Trimmed aTLS user-facing session detail to D2 cross-ref. Moved P2P encryption from §5 (data availability) to §2 (attestation/trust property). Consolidated §3 operator obligations (merged light client and key rotation items). Trimmed §4 on-chain safeguards to trust-relevant summary with D4 cross-ref (removed DepositVault owner convention — duplicates D4). Collapsed §6 trust table from 9 to 7 rows (merged aTLS/P2P overlay into §2 prose; kept only layer-distinct entries). Shortened §7 failure mode table cells. Cut ~230 words to bring content closer to 1000-word target.
- Pass 2 (Accuracy): Cross-verified all §1–§7 claims against D1, D2, D4, D7, D9, pitch.html, research.html, get-involved.html, investor-letter.html. Fixed §3 restart description: replaced incorrect "on-chain contracts validate attestation" with "CE re-attests via aTLS to peers; on-chain contracts validate admin signatures and nonces, not attestation" (per D9 Pass 2 correction). All other factual claims verified correct against sources.
- Pass 3 (Prose & Conciseness): Tightened prose throughout — removed filler words, hedging, and redundant qualifiers. Shortened table cells in §6 and §7. No content added or facts changed.
- Pass 1 (Structure & Content Generation): Enriched §1 with three-layer safety model (hardware, quorum certificate, interactive client) from protocol safety overview. Added GTAAPF authorization policy to §2. Enriched §3 liveness mechanisms with SlotManager Active/Passive modes, slot-timeout-based leader detection, archiver meta preservation, and Shamir Secret Sharing checkpoint decryption. Added ZKP balance proof detail to §4 escape hatch. Added checkpoint encryption and TEE-based discovery detail to §5. Added oracle replica divergence and leader-dies-before-slot rows to §7 failure table. Added 3 new Flagged for Review items (GTAAPF diversity, oracle bounds, archiver trust). All additions sourced from tplus-core, protocol docs, and cross-deliverables.
- Pass 2 (Accuracy): Read all source files: tplus-core (mocks/lib.rs, malicious.rs, slot-finalization/lib.rs, overlay/mod.rs, gossipsub/CHANGELOG.md, encryption/lib.rs+encryption.rs), protocol docs (safety-overview-2e7e, slot-commitment-232e, escape-hatch-264e, unlocking-full-safety-2e6e, GTAAPF-2c7e, sample-tdx-quote-2eee, censorship-resistant-discovery-2f4e, losing-determinism-oracles-2f3e, dynamic-view-changes-2f3e, restart-ce-2b9e, restart-sc-2b6e, prod-testing-2f0e), cross-deliverables (D1, D2, D4, D7, D9), and HTML sources (pitch, research, get-involved, investor-letter). Fixed §1 cross-reference from "D1 §4" to "D1 §6" — Security Architecture is section 6 in D1, not section 4. All other factual claims verified correct: §1 three-layer safety model matches protocol safety overview; §2 MRTD/RTMR terminology matches sample TDX quote; publish_attested confirmed in overlay source; AES-256-GCM/X25519 ECDH confirmed in encryption source; §3 SlotManager Active/Passive confirmed in slot-finalization source; view change protocol confirmed in dynamic-view-changes doc; restart flow confirmed in restart-ce and restart-sc docs; §4 escape hatch design-phase status confirmed; §5 limited Registry/CredentialManager events confirmed in D4; §6 and §7 all entries verified against corresponding sources.
- Pass 3 (Prose & Conciseness): Cut ~850 words to bring Content section under 1000-word target. Converted §1 trustless/user-trusts lists to inline fragments. Compressed §2 attestation prose and removed redundant CVM detail. Collapsed §3 operator must/cannot into mid-dot-separated inline lists. Shortened §3 liveness mechanism descriptions. Simplified §4 escape hatch steps. Compressed §5 to three tight bullets. Reduced §6 trust table from 7 to 5 rows (merged light clients and DA into prose or removed where redundant with §1/§5). Cut §7 failure table from 15 to 13 rows (removed light client desync and oracle divergence as duplicative of §6/§3). Shortened all table cell text. Removed filler, hedging, and promotional language throughout. No content added or facts changed.
