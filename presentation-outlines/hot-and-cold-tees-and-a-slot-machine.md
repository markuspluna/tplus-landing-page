# Hot and Cold TEEs plus a Slot Machine
## Processing 10 Million Orders per Second without Compromising

---

# Slide 1: Title
## Hot and Cold TEEs plus a Slot Machine
### Processing 10 Million Orders per Second without Compromising

---

# Slide 2: The Problem

**Slide job:** Convince the audience that prime exchange requirements are genuinely contradictory — not just hard, impossible to satisfy simultaneously in one system.

A Prime Exchange's tech stack needs to be:
- Private
- Permissionless
- Decentralized
- Trustless
- VERY fast
- High throughput
- Non-rotating
- Continuous execution

**This is impossible. Even with TDX.**

> **Speaker notes:**
> - "Ideating t+ took me 3 years. I'm actually not stupid — prime exchanges just have absurd property requirements, and building one wasn't feasible until Intel TDX became widely available."
> - Quick framing — in the previous talk we showed WHAT a prime exchange does, now we show HOW
> - These aren't aspirational — each property is load-bearing for the marketplace described in talk 1:
>   - Private — pre-trade privacy prevents frontrunning, enables tight quotes
>   - Permissionless — excluding participants = excluding liquidity
>   - Decentralized + Trustless — can't ask people to trust an operator with their funds and flow
>   - Fast + High throughput — MMs need consistent low latency to quote tight, high throughput means the network layer can't be the bottleneck
>   - Non-rotating — rotation means latency spikes, MMs can't price risk during rotation so they widen or pull quotes
>   - Continuous execution — no discrete blocks/batches for the trading path, orders execute immediately
> - Why impossible: decentralization requires consensus, consensus on the hot path kills latency and throughput. Privacy conflicts with trustlessness (how do you verify what you can't see?). A single TDX instance can be fast and private but not decentralized or trustless.
> - ~~[VERIFY: TDX timeline — resolved, not important for this audience]~~
> - **Transition:** "So how do we solve an impossible problem? We stop trying to solve it all at once."

---

# Slide 3: Enter Hot and Cold TEEs

**Slide job:** Introduce the decomposition insight — different components have different priorities, so they get different TEE configurations.

Not every component of a prime exchange needs all of these properties equally.

[Table — properties as rows, Hot TEEs and Cold TEEs as columns, emoji priorities]

| Property | Trading Components (Hot TEEs) | State Components (Cold TEEs) |
|---|---|---|
| Private | 🔴 Critical | 🟡 Important |
| Fast | 🔴 Critical | 🟢 Low priority |
| High throughput | 🔴 Critical | 🟢 Low priority |
| Non-rotating | 🔴 Critical | 🟢 Low priority |
| Continuous execution | 🔴 Critical | 🟢 Low priority |
| Permissionless | 🟡 Important | 🔴 Critical |
| Decentralized | 🟡 Important | 🔴 Critical |
| Trustless | 🟡 Important | 🔴 Critical |

**Hot TEEs** = performance is the highest priority
**Cold TEEs** = security is the highest priority

> **Speaker notes:**
> - This is the key architectural insight — decompose the system by what each component actually needs
> - Trading components (OMS, orderbook, matching) — users interact with these directly, latency and throughput matter most
>   - Privacy is critical here because this is where order and position data lives
> - State components (clearing engine, risk systems, deposit management, accounting) — these hold the money and the truth
>   - Decentralization and trustlessness matter most because these are the custodial/settlement layer
>   - They still care about privacy but it's secondary to security guarantees
> - Neither side compromises — they just optimize for different things
> - **Q&A prep — "why not one fast decentralized TEE?":** This question misunderstands the slide — the whole point is that you CAN'T. Decentralization requires consensus, consensus on the hot path kills latency. The decomposition IS the answer.
> - **Transition:** "Let's start with the fast side — Hot TEEs."

---

# Slide 4: Hot TEEs

**Slide job:** Explain that Hot TEEs deliver performance and permissionless access, but are deliberately restricted to proposal-only — they can't steal anything.

**Trading components: OMS, Orderbook, Matching Engine**

One fast TEE per component — optimized for raw performance.
- Fast and non-rotating
- Private — only L2 book data published
- Continuous execution

**Being censored? Run your own.**
- dstack (Phala Network) — verifiable containers inside TEEs
- Anyone can spin up and prove correct code via remote attestation

**Primary/backup for liveness — every component has standby replicas.**

**Proposers only — they cannot mutate state.**
- Safe to upgrade without heavy governance — can't steal funds even if buggy

> **Speaker notes:**
> - Hot TEEs are where the speed lives — this is the CLOB from talk 1
> - One TEE, one process, no rotation — consistent low latency
>   - Rotation (swapping the active TEE) causes latency spikes — MMs can't price risk during rotation, so they widen or pull quotes
>   - Non-rotating means consistently fast, not just fast on average
>   - Sub-millisecond latency — benchmarks exist, assumes co-location. [TODO: Get specific benchmark numbers before presentation.]
> - **Permissionlessness through replicability — this is the key framing:**
>   - Permissionlessness for Hot TEEs doesn't come from decentralizing a single instance — it comes from anyone being able to run their own
>   - If you're being censored by an OMS or orderbook operator, spin up your own via dstack and connect to the Cold TEE network
>   - The credential manager will authorize any correctly attested Hot TEE — no gatekeeper
> - **This doesn't harm privacy guarantees:**
>   - A rogue Hot TEE operator running their own instance doesn't get access to other users' data
>   - The Clearing Engine (Cold TEE) will not hand out user position info to a Hot TEE unless the user has explicitly authorized that Hot TEE
>   - So running your own Hot TEE gives you access to the network, not access to everyone else's positions
> - dstack quick explainer:
>   - Open-source framework for running Docker containers inside Intel TDX enclaves
>   - Remote attestation lets anyone verify the code running inside matches the published binary
> - **Liveness via primary/backup replication:**
>   - Every orderbook market has one primary OB and one or more backup OBs maintaining replicated state
>   - Every user has a primary OMS; all OMS instances maintain state for all users (broadcast model) so failover is instant — no state transfer needed
>   - Directory service (managed by CE) assigns primary/backup roles, detects failures via heartbeats, promotes backups automatically
>   - Replication is async and fire-and-forget — primary doesn't wait for backup acks, trades latency for durability
>   - **System continues during CE downtime:** OBs keep matching orders, OMS keeps running risk checks. Fills are pending (unvalidated). Buffered to archivers. When new CE leader comes up, it pulls buffered actions and validates them — most recover, some may fail if margin conditions changed.
>   - This means t+ doesn't fully stall during CE failover — users can still trade, commitment is deferred
> - Horizontal scaling — the architecture is modular:
>   - Many OMS instances can connect to one orderbook (user-facing load balancing)
>   - Many orderbooks can propose matches to the state machine (market-level parallelism)
> - Critical design choice: Hot TEEs are PROPOSERS only
>   - They can match orders and propose the result, but they cannot settle trades, move funds, or update balances
>   - A compromised Hot TEE can propose garbage — it cannot steal anything
>   - All proposed mutations must be validated and approved by Cold TEEs
>   - **Q&A prep — "can a malicious Hot TEE DOS with garbage proposals?":** Cold TEEs simply blacklist it. Currently Cold TEEs choose which measurement profiles they accept — a malicious program wouldn't pass attestation in the first place. Even if it did, credential revocation is straightforward.
> - **Upgradability:**
>   - Hot TEE operators can upgrade their codebase without a heavy governance process
>   - Since Hot TEEs can't mutate state unilaterally, a buggy or malicious upgrade can't steal funds — worst case it proposes invalid mutations that Cold TEEs reject
>   - Cold TEEs are the opposite — upgrades require timelocked measurement profile changes (7 days) because they DO control state
> - **Q&A prep — "can the Hot TEE operator front-run?":**
>   - No — orders are private and encrypted inside the TEE. The operator cannot see them.
>   - The TEE is the trust boundary, not the operator. The operator runs the hardware but cannot inspect the enclave's memory.
> - **Q&A prep — "if you run your own Hot TEE, can the Cold TEE network censor you at settlement?":**
>   - No — packets between Hot and Cold TEEs are encrypted. The Cold TEE network cannot distinguish which Hot TEE a proposal originated from or selectively reject proposals by source.
>   - Cold TEEs validate proposals against protocol rules (margin, risk, balances), not per-proposer identity
>   - Additionally, Cold TEE leadership rotates — even if a single Cold TEE leader attempted censorship, rotation prevents sustained censorship
> - **Q&A prep — "Hot TEE compromise = front-running, that's what traders care about":**
>   - Distinguish fund safety (threshold Cold TEEs, strong) from trade integrity (Hot TEE confidentiality via TDX)
>   - Trade integrity relies on TEE confidentiality — this is strictly better than a CEX where the operator definitely CAN see your orders, but weaker than a ZK-based system where confidentiality is cryptographic
>   - Multi-vendor TEE plan partially motivated by this: a quorum spanning Intel and AMD requires collusion across competitors in different legal jurisdictions
>   - Be honest: place t+ on the trust spectrum between "trust the CEX operator" and "trust only math"
> - **Transition:** "Hot TEEs can propose but can't settle. What validates and finalizes? Cold TEEs."

---

# Slide 5: Cold TEEs

**Slide job:** Explain that Cold TEEs are the security layer — threshold signing means no single party controls funds or state.

**State components: Clearing Engine, Risk Systems, Deposit Management, Accounting**

These hold the money and the truth — security over performance.

- Decentralized — a network of TEEs, not a single instance
- Trustless — no single party can mutate state or move funds
- Private — all state encrypted in memory

**Threshold TEE signing** — a threshold of the network must agree before anything happens.

> **Speaker notes:**
> - Cold TEEs are the clearing and settlement layer — the "back office" that actually moves money
> - They deliberately sacrifice speed for security:
>   - Multiple TEEs must validate each proposed mutation — adds latency but removes single points of failure
>   - Privacy is still important (all state encrypted in memory) but secondary to decentralization
> - Threshold model means:
>   - Hot TEE proposes a trade settlement → Cold TEE network validates margin, risk, balances → threshold signs off → state mutates
>   - No single Cold TEE can approve anything alone
>   - No single operator can move funds even if they control one node
> - To do anything malicious you'd need to:
>   - Crack a threshold of TEEs (break hardware root of trust on multiple machines)
>   - AND have those operators collude
>   - Proof of cloud + frequent hardware/key rotation makes the first part extremely difficult
> - **Q&A prep — "what if Intel has a backdoor in TDX?":**
>   - Threshold mitigates: compromising one instance isn't enough, you'd need to crack a threshold of machines
>   - Proof of cloud + frequent hardware/key rotation make mass exploitation harder
>   - We plan to use multiple TEE vendors/models — not just Intel TDX — so a single vendor compromise doesn't break the system
>   - Long-term: ZK proof systems and economic security layer cryptographic/economic guarantees on top of hardware (see slide 7)
>   - Be honest that hardware RoT is a trust assumption — but it's much smaller than trusting a single operator, and the architecture is designed to layer stronger guarantees on top
> - Note: Cold TEE operators are currently known and permissioned (see slide 9 for the path to permissionless participation)
> - **Q&A prep — "can the Cold TEE leader censor specific proposals?":**
>   - Proposals from Hot TEEs arrive encrypted — the leader cannot inspect contents to selectively filter
>   - The attested code processes all valid proposals — running censoring code would change the measurement and fail attestation
>   - Cold TEE leadership rotates, preventing sustained censorship by a single leader
> - **Transition:** "How does a network of Cold TEEs coordinate without a blockchain? Enter the Slot Machine."

---

# Slide 6: The Slot Machine

**Slide job:** Explain how Cold TEEs coordinate — the Slot Machine batches, validates, and finalizes state mutations.

[Animated diagram: Hot TEE proposes → slot batched → Cold TEE network validates → threshold signs → state finalized]

Cold TEEs participate in a distributed system called the **Slot Machine**.

**How it works:**
1. Hot TEEs propose state mutations
2. Leader Cold TEE batches proposals into **slots**
3. Peers independently validate the slot
4. Threshold signs off → **slot finalized**

**Checkpointing:**
- Leader periodically snapshots critical state (balances, inventories)
- Encrypted to key shards held by a governance council
- Peers endorse checkpoints → distributed recovery point

> **Speaker notes:**
> - "Slot Machine" — actual name for this system, not a metaphor
> - Slots are analogous to blocks in a blockchain, but with key differences covered in next slide
> - Single-slot finality — once the threshold signs off, it's done. No confirmation wait.
> - Leader/peer model:
>   - One Cold TEE is the active leader — receives proposals from Hot TEEs, batches into slots
>   - Backup peers are dormant for state mutation — they only process finalized slots from the leader
>   - This prevents conflicting state mutations while maintaining replication
> - **Q&A prep — "what stops the leader from equivocating (sending different slots to different peers)?":**
>   - TEE code enforces single slot per slot number — the attested code cannot produce two different slots for the same sequence
>   - View number system: every message carries a monotonically increasing view number. Replicas reject messages from stale views. A new leader is only recognized after an authority-endorsed view change with a strictly fresher timestamp — prevents phantom leaders (old leader still sending after demotion)
>   - Even in the case of a compromised TEE producing equivocating slots: backup peers would detect divergent state on checkpoint endorsement, and the L1 contract's split-brain detection (same epoch, different checkpoint hash → ambiguity, restart blocked) catches it at the settlement layer
> - Why "Slot Machine" works as a name:
>   - Slots are the unit of state change
>   - Multiple independent machines must align for anything to happen
>   - The threshold requirement is the "combination" that must line up
> - Checkpointing is the recovery mechanism:
>   - t+ runs entirely in encrypted memory — if the whole network goes down, state would be lost without checkpoints
>   - Encrypted to council key shards — no single council member can decrypt alone
>   - Council is a defined governance body, separate from the Cold TEE operators
>   - Recovery mechanics covered in slide 8
> - Checkpointing should be a separate visual flow in the animation — slot finalization flow first, then checkpointing flow branching off.
> - **Transition:** "You're probably already mapping this to things you know — blockchains, rollups. Let me make the comparison explicit so you don't do it wrong."

---

# Slide 7: Slot Machine vs Traditional Decentralized State Machines

**Slide job:** Position the Slot Machine's tradeoffs honestly against familiar systems — better performance and privacy, weaker cryptographic guarantees (for now).

| | Blockchains | Rollups | Slot Machine |
|---|---|---|---|
| **State visibility** | Public | Public (posted to L1) | Private (encrypted in memory) |
| **Finality** | Sometimes single-block, often multi-block | Fraud proof window / proof generation | Single-slot |
| **Compute model** | Deterministic, re-executed by all validators | Reproducible / provable via ZK circuits | Arbitrary — no re-execution or proof requirement |
| **Trust model** | Cryptographic / economic | Inherited from L1 + sequencer trust | TEE hardware integrity + threshold signing* |
| **Throughput** | Limited by consensus + re-execution | Better, but limited by proof overhead | High — no re-execution overhead on hot path |

*Can be enhanced with ZK proof systems or economic security

> **Speaker notes:**
> - This slide is for the audience that's already mapping the Slot Machine onto things they know — make the comparison explicit so they don't do it wrong
> - **State visibility** — blockchains and rollups have public state by default. Slot Machine state is encrypted in memory inside TEEs. This is what enables pre-trade privacy.
> - **Finality:**
>   - Blockchains: varies. Ethereum ~12 min (2 epochs). Solana ~400ms slots but >12s for confirmed finality. BFT chains (Tendermint-based) have single-block finality but with other tradeoffs (smaller validator sets, communication overhead).
>   - Optimistic rollups: 7-day fraud proof window for full security. ZK rollups: depends on proof generation time (minutes to hours).
>   - Slot Machine: single-slot finality — once threshold signs off, it's done.
>   - [STEELMAN: "Tendermint has single-block finality too." — Yes, but Tendermint requires all validators to communicate per block, limiting throughput and validator set size. Slot Machine's leader model avoids per-slot all-to-all communication on the hot path.]
> - **Compute model** — this is the big unlock for throughput:
>   - Blockchains require every validator to re-execute every transaction
>   - ZK rollups require computation to be expressible in ZK circuits — extremely limiting for complex financial logic (try doing portfolio margining in a ZK circuit)
>   - Slot Machine: TEEs guarantee correct execution via hardware attestation, so compute can be arbitrary — complex risk calculations, margining, clearing logic with no overhead
> - **Trust model — be honest about the tradeoff:**
>   - Blockchains and rollups rely on cryptographic or economic guarantees (stake slashing, fraud proofs, validity proofs)
>   - Slot Machine relies on TEE hardware root of trust + threshold — you're trusting Intel TDX integrity across a threshold of machines
>   - This is the real tradeoff — weaker cryptographic guarantees, but dramatically better performance and privacy
>   - **However:** this trust model is not fixed. It can be layered with:
>     - ZK proof systems — prove correct execution after the fact, adding cryptographic guarantees on top of hardware attestation. Done asynchronously, not on the hot path — doesn't compromise performance.
>     - Economic security — staking/slashing for Cold TEE operators, making misbehavior costly even if hardware is compromised
>   - The architecture is designed to accommodate these enhancements as the technology matures
>   - **Q&A prep — "adding ZK means you have the overhead you claimed to avoid":** No — ZK verification is asynchronous/after-the-fact, not on the hot execution path. You get real-time performance from TEEs and post-hoc cryptographic guarantees from ZK. Best of both worlds, at the cost of delayed finality for the ZK layer.
> - **Throughput** — consequence of the compute model. No re-execution on the hot path (order processing isn't gated on peer consensus — Cold TEE finalization happens asynchronously). Cold TEE peers do re-execute slots for validation, but this is pipelined, not blocking.
> - **Transition:** "The tradeoffs are clear. But what happens when things go wrong?"

---

# Slide 8: Recovery and Failover

**Slide job:** Show that the system handles failure gracefully, and that the current recovery bottleneck (council) has a concrete path to removal.

**Leader goes down:**
- Authority-endorsed view change with monotonic view number → new leader elected
- **Surgical rollback** — only the unrecovered tail is rolled back, not everything

**Full network failure:**
- Council decrypts checkpoint key shards within a fresh, attestation-verified TEE
- L1 contract verifies: correct software + valid checkpoint → new leader

**The council is a bottleneck — we're removing it.**
- Witness encryption for DCAP: encrypt checkpoints so *any valid TEE with a correct attestation* can decrypt — no council needed

> **Speaker notes:**
> - **Leader failover** is relatively fast — peers already have replicated state up to the last finalized slot
>   - View change: authority detects failure, signs endorsement with monotonic view number → new leader promoted
>   - All replicas verify the authority signature and that the view number is strictly fresher than cached — prevents phantom leaders (old leader still sending after demotion)
>   - Leader election will be automatic (most recent finalized slot wins) — not yet implemented. Currently uses `appointLeader` with committee quorum as a stopgap.
> - **Surgical rollback** — the system doesn't roll back everything, only the unrecovered tail:
>   - New CE leader (P') recovers buffered actions from archivers, validates them, confirms what it can
>   - P' broadcasts a ViewChange with `last_recovered_action_nonce` — the nonce of the last action it successfully recovered
>   - Downstream (OBs, OMSes) compare their pending actions against this nonce
>   - Actions with nonce ≤ threshold: finalized by P' normally, no rollback needed
>   - Actions with nonce > threshold: rolled back (fills reversed, orders restored to book)
>   - If P' recovered 95% of pending actions, only the remaining 5% are rolled back
>   - Auto-reduce triggers after rollback to correct any margin violations
> - **System doesn't fully stall during CE failover:**
>   - Hot TEEs (OBs) keep matching orders, OMSes keep running risk checks
>   - Fills are pending (unvalidated) and buffered to archivers with OB-relative ordering
>   - When new CE activates, it pulls buffered actions and validates them — most recover, some may fail if margin conditions changed
>   - Users can still trade during CE downtime — commitment is deferred, not blocked
> - **Full recovery** is the expensive path — requires council coordination
>   - Council members never see decrypted state themselves — they encrypt their key shard to the new TEE's attestation-endorsed public key
>   - Unless a threshold of council members collude, inventories remain encrypted even during recovery
>   - L1 contract enforces: most recent epoch wins (monotonicity check), measurement profile must match, split-brain detection blocks ambiguous restarts
>   - 1-hour gathering window for candidates to submit restart proofs, then the best (highest epoch) is promoted
> - **The council is a known bottleneck:**
>   - Recovery depends on a threshold of council members being available and willing to participate
>   - Interactive — council members must actively submit their key shards to the recovering TEE
>   - Introduces availability and liveness assumptions on humans, which is exactly what we're trying to remove elsewhere
> - **Witness encryption for DCAP removes the council from the recovery path entirely:**
>   - Instead of encrypting checkpoints to council key shards, encrypt them so that any TEE with a valid DCAP attestation matching approved measurements can decrypt
>   - The cryptography itself enforces the access policy — only genuine Intel TDX hardware running the correct code can decrypt, no intermediary needed
>   - Uses bilinear pairings to build a ZK circuit that verifies DCAP attestation as the "witness" — if you have a valid attestation, you can recover the decryption key
>   - No interactive handshake, no availability dependency on specific humans, no trust in a council not to collude or go offline
>   - Limitation: not quantum-resistant in current construction — but checkpoints are short-lived data, not long-term secrets
>   - **Q&A prep — "witness encryption is research-grade, when does it ship?":** Be honest: this is active R&D and we're excited about pushing this research forward. The council works for now. Witness encryption is the path to removing the last human dependency in the system. Should land as exciting forward-looking work, not a gap.
> - **Transition:** "Recovery relies on the credential manager to verify everything. Let's look at what that actually is."

---

# Slide 9: The Credential Manager

**Slide job:** Explain the onchain root of trust — what it verifies, how it governs, and where it's headed.

[Diagram: L1 smart contract in the center, arrows to/from Cold TEE network and Hot TEE proposers]

**Onchain root of trust for the entire system.**

- **Dual-key model** — identity key + hardware-attested key, bound together
- **Measurement profiles** — approved TDX "gold images," only matching code participates
- **Proof of cloud** — Automata DCAP + ZK proofs verify real Intel TDX hardware onchain
- **Timelocked governance** — critical changes require 48h–7 day delays
- **Restart certification** — onchain process elects new leader from freshest valid checkpoint

**Escape hatch:** users can permissionlessly submit bonded withdrawal requests onchain, enforced by timelock.

**Today:** known, permissioned operators.
**Tomorrow:** federated trust-based quorum.

> **Speaker notes:**
> - The credential manager is the root of authority — lives on L1, the only part of t+ that touches a public blockchain during normal operation
> - **Dual-key model:**
>   - Every Cold TEE operator has two keys bound together in the contract
>   - Operator key (EOA) — their identity, used for governance signatures
>   - Attested key — generated inside the TEE, endorsed by hardware attestation. Proves this operator controls a genuine TEE.
>   - Both keys must agree for the operator to act — identity alone isn't enough, hardware attestation alone isn't enough
>   - **Q&A prep — "so this is basically a multisig right now?":**
>     - Any proof-of-authority model is a multisig at the governance layer — this isn't unique to t+
>     - But a plain multisig operator can run any code they want. A t+ operator must run attested code on verified hardware. The dual-key model enforces this — it's a multisig with hardware guarantees, not just identity.
>     - The plan is to federate and move to a proof-of-agreement system where Cold TEE participation isn't gated by operator identity
> - **Measurement profiles ("gold image"):**
>   - The contract stores approved TDX measurements: MRTD (code identity) + RTMRs (runtime measurements)
>   - When a TEE presents its attestation, the contract checks its measurements against approved profiles
>   - If the code doesn't match an approved profile, the TEE is rejected — only correct, approved software can participate
>   - Supports partial matching (some RTMRs optional) to accommodate different cloud providers
>   - Updating measurement profiles is timelocked (7 days) — can't sneak in a malicious code version
> - **Proof of cloud via Automata DCAP + SP1:**
>   - TDX attestation quotes are verified onchain using Automata's DCAP attestation toolkit
>   - ZK proofs (SP1 coprocessor) make onchain verification feasible — proves the quote came from genuine Intel TDX hardware without replaying the full attestation onchain
>   - This is what "proof of cloud" means concretely — cryptographic proof that the hardware is real, not emulated or tampered
> - **Timelocked governance:**
>   - Immediate actions (add vault, set threshold) need committee quorum but execute instantly
>   - High-risk changes are timelocked: risk manager (48h), registry (72h), measurements and delays (7 days)
>   - This means even if the committee is compromised, there's a window to detect and respond to malicious changes
>   - Timelocks can't be shortened without a 7-day timelock on the delay change itself — turtles all the way down
>   - **Q&A prep — "immutable is misleading if you can update measurement profiles":** The governance process is immutable (the contract's rules for how updates happen cannot be changed). The governed parameters (approved code, risk manager, etc.) are updatable by the committee within those rules. This is like saying Ethereum's protocol is immutable but the state changes — the governance mechanism is fixed, the inputs evolve. The 7-day timelock is a concrete, enforceable constraint. [TODO: Disclose current committee structure — how many signers, who are they — audience will ask.]
>   - **Q&A prep — "what can users DO within the 7-day timelock?":**
>     - Escape hatch: users can permissionlessly submit a withdrawal request onchain to an "inbox" contract, posting a proportional bond
>     - A timelock period must pass before the withdrawal can execute
>     - During the timelock, the CE quorum can reject the request if it's invalid (e.g., user doesn't actually have those assets, or has open positions that make the withdrawal unsafe)
>     - After the timelock expires without rejection, the user can withdraw the requested assets from the vault — no operator cooperation needed
>     - If rejected, the bond is slashed — this prevents spam/griefing
>     - This is the concrete safety guarantee: even if every operator colludes or goes offline, users have a unilateral exit path
>     - **Limitation:** doesn't handle leverage positions well — price movement during the timelock may make a previously valid withdrawal no longer possible. Modifiable withdrawal requests could address this.
>     - **Limitation:** would be stronger with a merkle-based state commitment system (onchain proof of balances), but works without one — the CE quorum validates against internal state during the timelock
>   - **Q&A prep — "so the escape hatch is just an optimistic withdrawal?":** Yes, structurally similar to an optimistic rollup's forced inclusion — assume valid unless challenged within the window. The CE quorum plays the role of the fraud prover.
> - **Restart certification flow (ties back to slide 8):**
>   - Step 1: anyone calls `initiateRestart()` — opens a 1-hour gathering window
>   - Step 2: candidates submit restart proofs during the window — each proof includes ZK-verified attestation, measurement check, checkpoint hash, epoch
>   - Contract keeps the candidate with the highest epoch. If two candidates claim the same epoch with different state → ambiguity detected, restart blocked (split-brain protection)
>   - Step 3: after the window closes, `resolveRestart()` promotes the best candidate to leader
>   - The contract is the deterministic source of truth for which checkpoint to restore from — removes ambiguity for peers rejoining
> - **Operator model — be transparent about the current state:**
>   - Today: operators are a known, permissioned set. Committee threshold governance (k-of-n signing).
>   - This is pragmatic for early releases — small trusted set, move fast
>   - The path to true permissionlessness: federated trust-based quorum where Cold TEE participation isn't gated by operator identity
>   - The architecture already supports this — the credential manager can evolve its authorization logic without changing the Hot/Cold TEE model or the Slot Machine
> - Keep all 5 bullets separate on the slide — measurement profiles and proof of cloud are distinct concepts worth individual emphasis.
> - **Transition:** "Now you know every piece. Let me show you how they connect."

---

# Slide 10: Network Architecture

**Slide job:** Show how all the pieces connect spatially — one diagram that ties together everything from slides 3–9.

[Diagram: hub-and-spoke pattern]

- **Center:** L1 Credential Manager
- **Inner ring:** Cold TEE network (Slot Machine) — clearing engine peers, all registered with the credential manager
- **Outer ring:** Hot TEE proposers — orderbooks, OMS instances, each attested and credentialed
- **Edges:** Hot TEEs propose → Cold TEEs validate and finalize → Credential manager governs participation

**The vertical hierarchy:**
- OMS (user-facing) → Orderbook (matching) → Clearing Engine (settlement)
- Downstream verifies upstream via slot acknowledgements

> **Speaker notes:**
> - The architecture is modular and hierarchical:
>   - OMS is the user's interface — manages orders across multiple books
>   - Orderbook matches orders and proposes settlements
>   - Clearing Engine (Cold TEE leader) is the final authority on state
> - Each layer scales independently:
>   - Many OMS per orderbook (user-facing horizontal scaling)
>   - Many orderbooks per clearing engine (market-level parallelism)
>   - Cold TEE peers replicate for security, not throughput — throughput comes from Hot TEEs
> - Communication flow:
>   - User → OMS (Hot TEE) → Orderbook (Hot TEE) → Clearing Engine (Cold TEE network)
>   - Proposals flow upstream through the hierarchy
>   - Finalizations flow back down via slot acknowledgements
> - Credential manager sits in the center because it's the root of trust — everything connects back to it for authorization
> - **User-visible guarantees — slot lifecycle (Open → Finalized → Checkpointed → Endorsed):**
>   - OB match = pending fill, instantly visible to user but not yet validated by CE
>   - CE slot finalization = confirmed or rolled back. This is the "soft commit."
>   - Checkpoint = critical state snapshot, encrypted to council. Hard recovery point.
>   - L1 endorsement = checkpoint endorsed by council threshold, reflected onchain. Withdrawals only execute after endorsement.
>   - If CE leader crashes between pending and finalized: surgical rollback handles the unrecovered tail, most pending fills survive via archiver buffering
>   - Honest tradeoff: async replication means a command acknowledged to the user could theoretically be lost if primary crashes before any backup or archiver receives it. This is the latency vs durability tradeoff — we favor latency.
> - One integrated diagram — hub-and-spoke with the vertical hierarchy (OMS → OB → CE) shown within the outer ring. Mention the hierarchy verbally as you walk through the diagram.
> - **Transition:** "That's the full architecture. What does it enable?"

---

# Slide 11: 10 Million Orders per Second without Compromising

**Slide job:** Land the presentation — connect the tech stack back to the prime exchange capabilities from talk 1.

[Callback to talk 1's mission block — same visual style]

Hot TEEs + Cold TEEs + Slot Machine =

- ✅ **Optimal quoting environment** — non-rotating CLOB, prioritized cancels, no cost-to-quote, pre-trade privacy
- ✅ **One day, 10M+ orders per second** — horizontally scalable proposers, no consensus on the trading path
- ✅ **Permissionless** — censored? Run your own Hot TEE. No gatekeeper.
- ✅ **Noncustodial and trustless** — no operator can unilaterally move funds or mutate state
- ✅ **Foundation for composability and capital efficiency** — the other talks

> **Speaker notes:**
> - Callback to the subtitle — "processing 10 million orders per second without compromising"
> - "One day" is deliberate — 10M is the architectural ceiling, not a current benchmark. The horizontal scaling model (many OMS → many OB → state machine) is what makes this achievable, but we haven't hit it yet. Be honest if asked.
> - Frame this as what the tech stack ENABLES for the prime exchange, not the properties themselves
> - The audience already heard the missions in talk 1 — now they know what's underneath:
>   - Optimal quoting = Hot TEEs (fast, non-rotating, private, continuous execution)
>   - Throughput = horizontally scalable proposer architecture
>   - Permissionless = dstack replication + credential manager — the "run your own" story
>   - Noncustodial/trustless = Cold TEE threshold signing + Slot Machine + credential manager
> - **Q&A prep — "this is custodial, you just have a multisig controlling vaults":**
>   - This is no more custodial than a PoS chain with a limited or capped validator set
>   - The difference is the security model: hardware + reputation derived node security rather than stake derived
>   - In a plain multisig, operators can run any code they want — in t+, operators are constrained to attested code on verified hardware. They cannot deviate from protocol even if they collude at the identity level.
>   - Cost of attack is typically higher than economic staking — you need to crack hardware root of trust across a threshold of machines, not just accumulate tokens
>   - The plan to federate to proof-of-agreement makes this strictly better over time
> - Composability and capital efficiency sit on top of this foundation — tease the other talks
> - Keep this slide brief — it's a landing, not a new argument
