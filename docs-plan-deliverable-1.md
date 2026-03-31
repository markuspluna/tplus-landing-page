# Deliverable 1: Architecture Overview

## Scope

Conceptual entry point for developers, integrators, and technical evaluators already familiar with t+. High-level architectural grounding — no API details, no code samples, no tutorials. Covers trading environment, distributed state machine, TEE role, external composability via exposure settlement, leverage model,and security architecture.

---

## Source Material

- `/Users/markuspaulsonluna/Dev/notion-managment/content/remote/pages/docs/tonepage-2e1e.md` — canonical platform overview
---

## Content

### 1. Offchain Trading Environment

Users interact with t+ through an offchain orderbook+order-management system. Both run inside Intel TDX trusted execution environments. 

Trading Environment Properties:
- sub-millisecond time-to-tick
- master+slave distributed quorums to provide liveness guarantees without adding latency
- TEE provides cryptographic guarantees that the operator cannot observe or modify the programs (privacy + integrity)
- For designated market makers: 
   - margin is checked on match rather than on quote submission, allowing quoting across many pairs without locking capital
   - Cancel and post-only orders can bypass the OMS via a direct orderbook websocket, reducing latency

The trading environment proposes state mutations (balance changes, position updates, clearing prices) but cannot apply them directly. All proposed changes are forwarded to the clearing engine for validation. 

The orderbook and OMS are permissionlessly replicatable using the dstack framework. If an operator is suspected of censoring, users can switch to a new replica hosted by a different operator.

### 2. Clearing Engine Network

The clearing engine network is a distributed MPC network that manages t+ state (inventories) and authorizes fund movements (deposits/withdrawals/settlements). Trading components (orderbook, rate engine, etc) propose state mutations to the clearing engine, which then validates security invariants (signatures, risk limits, balance mutations) before applying them. Thus, a compromised trading component cannot unilaterally alter state. 

A quorum of geographically distributed nodes is required to agree on state transitions. Each node uses it's own oracle and RPC's to validate the transition.

Clearing engine nodes are authorized by an Ethereum mainnet smart contract that validates cryptographic attestations of hardware, software, and quorum trust status. The contract also coordinates key rotation.

### 3. Funds Architecture

Users deposit into and withdraw from vault smart contracts deployed on each supported chain. 

Some assets are fungible by like-asset: cbBTC and wBTC are both BTC, USDC and USDT are both USD, ETH on Arbitrum/Base/Mainnet is all ETH. For fungible assets, users can deposit one form on one chain and withdraw a fungible equivalent on another chain. Per-token deposit caps isolate risk an exploit on one underlying component component (e.g., infinite mint of cbBTC) cannot drain the entire fungible set.

**Settlement Transactions**: Settlements allow users to cash settle leverage exposure on t+ into external onchain liquidity using t+ funds. The flow:
1. Pull funds from pooled user deposits (makers don't need their own inventory)
2. Execute an onchain interaction (ie DEX swap)
3. Return proceeds to a vault
4. Update the maker's margin position
Settlements are atomic interactions so if one portion of the transaction fails the whole thing reverts

Makers only need margin to open the exposure; the protocol's pooled deposits provide settlement capital.

Flow imbalances can skew asset distributions across chains. See [link to rebalancing deliverable] for rebalancing mechanics.

### 4. External Composability

t+ composes with external liquidity through two mechanisms: exposure settlement and cross-margining.

**Exposure Settlement**: Traders can open leveraged exposure on margin and cash settle it externally via arbitrary onchain interactions if they prefer to do so rather than closing the position into the t+ book. Settlements can be partial and pull from pooled user deposits across chains, makers don't need inventory on the settlement chain.

For long-tail assets where margin is unsafe, market makers can post Synchronous Quotes which delay match finalization until an associated settlement finalizes onchain, functioning as a fast RFQ. See D8 for fill-rate requirements.

**Cross-Margining**: External accounts (e.g., Binance, Fireblocks custody, Hyperliquid) can count as collateral. The cross-margined user provides a TEE-based cross-margin manager with some of their external account credentials such as an API key, or a portion of a multi-sig accounts signing keys. This allows the margin engine to poll external positions and recognizes hedged exposure, reducing margin requirements without moving funds into t+.

External composability allows t+ to inherit external liquidity and products from venues it's composable with. This is crucial for allowing t+ to offer new products and liquidity sources without having to build them out in-house or attract additional capital.
### 5. Matched-book Margin based Leverage

Margin positions in t+ offset each other in the eyes of our risk engine - they’re treated like derivative positions. While non-offset margin positions are treated as spot-margin exposure.

To provide a brief example:
- Trader A longs 10 ETH on margin, Trader B fills on margin → both sides are leverage-backed, liabilities and credits match. No borrow originated, no venue-level asset shortage. This is matched (derivative) exposure.
- Trader A longs 10 ETH on margin, Trader B fills with a spot sell → Trader A is borrowing USD, Trader B is owed real assets. The venue is now short USD. This is spot-margin exposure.

t+'s matched-book margin engine allows it to:
1. Scale open interest and leverage allowances to the same levels as perpetuals exchanges -> Offset (matched) margin positions can be auto-deleveraged into counterparties rather than clearing into external liquidity, making their risk profile equivalent to that of a derivatives contract. Thus, open interest and leverage allowances are safe at the same levels as perpetuals exchanges.

2. Keep funding and funding volatility low -> Instead of sourcing counterparties to fill lopsided flow using a premium-based funding rate like perpetual's exchanges do (which causes rate and premium volatility), t+ can absorb the lopsided flow and match it against internal or external spot liquidity which prevents a premium from forming in the first place. Once lopsided flow begins forming a skew (high spot-margin to matched exposure ratio), we begin charging skew-based funding rates that incentivize cross-side flow leading to a balanced exposure surface.

3. Improve liquidity conditions -> Leverage positions in t+ are not purely synthetic, they remain fungible with the underlying spot asset. As a result, t+ can unify spot and leverage orderbooks and enable settlement of leverage positions into external spot liquidity.

### 6. Security Architecture

t+ uses a tiered security model based on component risk level.

**Low-Risk Components** (orderbook, OMS, interest rate engine):
- Run in TEEs hosted by allowlisted operators in secure data centers
- Cannot mutate critical state or authorize fund movements — only propose changes
- Permissionlessly replicatable via dstack; if an operator censors, switch to a new replica
- Frequent software upgrades permitted
- Trust requirement: TEE integrity. Physical exploitation requires sustained data center access to analyze memory patterns and extract the encryption key. Even if compromised, impact is observable and low-reward.

**High-Risk Components** (clearing engine, oracle):
- Run as MPC quorums where each node also uses a TEE
- Validate all state mutations and control fund movements
- Geographically distributed nodes with frequent key rotation
- Timelocked upgrades, audits, and broader governance required
- Trust requirement: TEE Integrity + majority of quorum nodes must be honest. Leadership rotates across hosts, so censorship requires all nodes to collude.

---

## Changelog

- v2 Pass 1 (Content Generation): Rewrote all six sections from source material; focused on technical concepts without pitch framing; added credential management via mainnet contract, omnibus deposit model, cross-margining mechanism, Derivative vs Spot Margin OI examples, tiered trust requirements
