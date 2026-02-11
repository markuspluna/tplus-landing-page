# Deliverable 1 — Architecture Overview

## Purpose
Conceptual entry point grounding the reader in how t+ works at a systems level. Not a pitch, not user docs — an architectural map that explains why the system is shaped the way it is.

## Audience
Developers, integrators, and technical evaluators who need to understand t+'s design before diving into specific APIs or subsystems.

## Target Structure
1. Offchain trading environment — TEE-based orderbook, sub-ms matching, private state, margin-checked-on-match (designated market makers only), prioritized maker path
2. Clearing engine (distributed state machine) — authoritative MPC+TEE quorum that validates all state mutations, enforces risk limits, coordinates fund movement approvals
3. Funds architecture — per-chain deposit vault contracts, how deposits enter the system, how settlement transactions pull from and return to vaults, pooled deposits across chains
4. External composability — t+ composes with external liquidity and products because makers fill on margin and settle exposure into any venue; exposure settlement is the mechanism that enables this
5. Leverage model — combined spot+leverage marketplace, Derivative OI vs Spot Margin OI, why minimizing spot-margin OI matters, skew-based funding rates
6. Security architecture — tiered security (low-risk TEE-only vs high-risk MPC+TEE quorum), trustlessness model, censorship resistance via dstack and rotating leadership

## Depth Level
Conceptual but precise. No endpoint signatures, no code samples, no parameter tables. Each section should explain the mechanism and its rationale in 3–6 sentences. Use bullet lists where multiple options or properties need listing.

## Exclusions (covered in other deliverables)
- API endpoint details → D2, D3, D4
- SDK usage → D5
- Fee schedules → D6
- Margin/risk parameter details (haircuts, caps, liquidation mechanics) → D7
- Order types, TIF, matching rules → D8
- Settlement lifecycle (netting, signing, batching) → D9
- Liveness guarantees, escape hatches, attestation details → D10
- Step-by-step tutorials → D11
- Terminology definitions → D12
- Rebalancing mechanism → D13
- Interest rate formulas → D14
- Orderflow monetization use cases (solver/builder integrations) — out of scope for docs

## Word Count Target
Content sections: under 800 words total.
