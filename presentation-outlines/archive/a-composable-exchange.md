# Slide 1: Title
## A Composable Exchange
### Putting all Products and Liquidity in One Box PLUS Increasing Flow Value

# Slide 2: What is Composability?
People seem to have all sorts of different definitions for it including being able to deposit and withdraw into the venue.

In our opinion there are only two kinds of composability
1. Read-only composability - this is what oracles offer
2. Write (or FULL) composability - mainnet uniswap has full composability with other smart contracts on ethereum

t+ cares about offering the second kind

# Slide 3: Full Composability Solves Fragmentation
Liquidity and product fragmentation will continue in permissionless finance (reuse material from decentralized CEX presentation)

If out of one venue you can access all liquidity and products from external venues without additional cost then fragmentation no longer matters

# Slide 4: Full Composability Increases Orderflow Value

**The payoff from non-composable orderflow is linear. The payoff from composable orderflow is superlinear.**

Non-composable flow has a fixed value: you fill the order, you capture the spread, you hedge independently. Each operation's value is evaluated in isolation. This is how tradfi works, how CEXs work cross-venue, and how DeFi works cross-chain.

Composable flow breaks this ceiling. When flow can be bundled with other operations, its value is no longer what it's worth standalone — it's what it contributes to the *best possible bundle*. And that contribution is superlinear for three reasons:

---

**1. Flow Substitutes for Capital**

Composable flow can serve as a liquidity source for other operations, eliminating the need to pre-fund each leg.

*Example:* Someone dumps ETH on a Uniswap pool, pushing the price below fair value. An OTC desk with a client wanting to buy ETH can compose the client's order with the mispriced pool — the client's funds route through the mispricing directly. Better execution for the client, zero balance sheet required from the desk. The flow *is* the capital.

*Linear payoff (non-composable):* The desk needs its own capital to buy the mispriced ETH, warehouse the risk, and separately fill the client. The flow is worth the spread the desk charges. In tradfi: the desk's capital is locked T+1 per leg per clearinghouse — you can't even attempt this across venues without massive pre-funding. Cross-chain DeFi: you can pre-fund each chain but now you need N× capital for N chains. You're compensating for non-composability with balance sheet.

---

**2. Composability Wins Winner-Take-All Competitions**

Many markets are structured as winner-take-all: block auctions, batch auctions, RFQ competitions. In these environments, the participant who constructs the best solution wins everything and everyone else gets nothing. Composable flow is a structural advantage here because it lets you build solutions that non-composable participants *cannot build at any price*.

*Example:* Ethereum block building. Two builders compete. Both see the same public mempool arbs, liquidations, and cross-DEX rebalancing. One builder has composable private orderflow. That builder constructs a block containing everything the other builder can do PLUS the private flow and its backrun — a strictly better block. In the block auction, they win the whole block. The other builder gets nothing. It doesn't matter how much capital the losing builder has or how fast they are — they literally cannot construct a block as good, because they don't have the composable ingredient. CoW Swap batch auctions are the same: a solver with access to a composable liquidity source that others don't have constructs a strictly better batch. The other solvers cannot match it regardless of their sophistication.

*Non-composable:* Winner-take-all competitions exist everywhere — tradfi RFQ auctions, CEX maker competitions for taker flow. But without composability, the competition is constrained to capital and speed: who has the most pre-funded inventory, who can hedge fastest. A participant with composable flow competing against non-composable participants has a dimension of optimization that others can't access. They can integrate external mispricings, route through cheaper liquidity, and attach value-additive operations to their solution. Non-composable competitors are optimizing over a strictly smaller solution space — they can only offer what their pre-positioned capital on that single venue allows. Composability doesn't just make you marginally better at these competitions, it makes you categorically better — you're searching a larger space and will always find a solution at least as good as any non-composable participant, and usually strictly better.

---

**3. Combinatorial Value Discovery**

The space of possible bundles grows combinatorially with the number of composable operations. Legs that are NPV-negative standalone become NPV-positive in combination — strategies emerge that literally cannot exist without composability.

*Example:* A market maker on t+ is short ETH from market making. They need to clear the exposure. Meanwhile there's a Uniswap pool on Arbitrum with ETH priced 3bps below fair value — too thin to arb standalone. There's also a stale bid on a smaller venue for ETH/BTC — too small to bother with independently. None are worth doing alone: the clearing is a cost center, the mispricing is too thin, the stale bid isn't worth the overhead. But composed: clear the short by buying ETH through the mispriced pool (capturing 3bps on clearing you were doing anyway), route through the stale bid to pick up the ETH/BTC spread. The bundle is profitable *because the legs interact*. Remove any one and the others may not justify execution. This is a trade that doesn't exist in a non-composable world — no one would discover it by evaluating each leg independently.

*Linear payoff (non-composable):* Each operation gets evaluated in isolation. The 3bps mispricing isn't worth anyone's capital. The stale bid sits untouched. The MM clears at market, eating the full cost. All parties get worse outcomes. This is the default everywhere: tradfi can't jointly optimize across clearinghouses. CEX MMs evaluate each venue's P&L independently. Single-chain DeFi searchers can compose within their chain but the combinatorial space stops at the chain boundary. The strategy space is artificially constrained to single-venue strategies — the combinatorial explosion of cross-venue bundles is inaccessible.

---

**The flywheel:** superlinear payoff means market makers quote tighter on composable venues (each fill's expected value is higher than its standalone value). Tighter spreads attract more flow. More flow creates more bundling opportunities. More bundling opportunities make each fill even more valuable. The venue with the most composability wins disproportionately — this isn't a linear advantage, it compounds.

> **Speaker notes:**
> - **Framing:** the linear vs superlinear distinction is the single point to land. Every example demonstrates the same thing from a different angle — flow that can be composed is worth more than what it would fetch on any non-composable venue
> - **On capital substitution (1):**
>   - The OTC backrunning example is the cleanest — literally zero balance sheet to fill a client order
>   - Tradfi: T+1 settlement, capital turns over once/day/venue. Pre-funding 15 clearinghouses requires separate legal entities, regulatory approvals, operational infrastructure per clearinghouse. Even with infinite capital you can't compose — the systems don't support it
>   - CEXs: credit lines are capital-intensive composability — MM needs capital pre-positioned everywhere, execution still non-atomic per leg
>   - Cross-chain DeFi: capital cost lower than tradfi (seconds-to-minutes settlement) but scales badly. 5 chains manageable, 50 chains is a capital nightmare. Bridging adds exploit risk, finality assumptions, variable confirmation times
> - **On winner-take-all (2):**
>   - The key insight: composable participants are optimizing over a strictly larger solution space. It's not that they're faster or better capitalized — they have access to solutions that non-composable participants cannot construct at all
>   - Builders pay millions/day for private composable orderflow — that's the market price of this structural advantage
>   - CoW Swap solvers: same dynamic in miniature. Solver with one extra composable liquidity source wins the whole batch. Other solvers get nothing regardless of sophistication
>   - Tradfi parallel: RFQ competitions exist (dealers competing for institutional flow), but the competition dimensions are capital and speed only. Every dealer is searching the same solution space (their pre-positioned inventory on that venue). Composability adds a new dimension — external liquidity, cross-venue routing, bundled operations — that non-composable participants don't have access to
>   - CEX parallel: market makers compete for taker flow, but each is constrained to the liquidity and products available on that one exchange. They can't integrate external mispricings into their quotes. A composable MM can
>   - This matters for t+ specifically: participants on t+ competing in any auction or RFQ can compose their fills with external venue liquidity, exposure clearing, cross-chain operations. Participants on non-composable venues are bidding with one hand tied behind their back
> - **On combinatorial discovery (3):**
>   - Hardest to intuit but potentially most important long-term
>   - With N composable operations the strategy space grows combinatorially. More venues/protocols t+ integrates → disproportionately more value per additional integration → network effects on composability
>   - Analogy if needed: chef who can only use one ingredient at a time vs one who can combine them. A 3bps mispricing and a stale bid are boring ingredients alone — together they're a trade
>   - Ethereum's searcher/solver ecosystem already demonstrates this — builders run optimization over thousands of possible transaction orderings. t+ extends this from single-chain to cross-venue
>   - This is also why t+'s composability advantage compounds over time: each new integration doesn't add value linearly, it multiplies the combinatorial space for every participant
>   - **Aside — this is one reason I'm against private mempools** (besides sandwich bots deserving to live): private mempools reduce flow value by removing transactions from the composable set. If a solver can't see a tx, they can't include it in their bundle optimization. Every tx hidden from the public mempool shrinks the combinatorial space — fewer ingredients available means fewer valuable bundles discovered. Private mempools trade away systemic flow value in exchange for individual MEV protection
# Slide 5: t+FULL composability (chains)
t+ offers composability on chains by allowing t+ accounts to atomically interact with external protocols with flash loan style interactions funded by global user deposits. These interactions are called Settlements

1. User requests settlement approval form tplus offchain system
2. CE validates that the settlement flow of funds is safe
3. CE passes approval 
4. user executes onchain 
5. pull funds from deposit vault
6. perform arbitrary interactoin
7. return funds to chain
(we should re-use pitch.html materials here)

this is safe due to an atomicity guard on the full interaction.

The main use for this is allowing market makers to fill trades on t+ and settle the flow into external onchain spot liquidity. ie get short ETH clear exposure into uniswap, or synchronously fill a memecoin and clear the exposure without even realizing the margin hit (sync making required, only allowed for long tail assets)

However in the future we can expand this to non-token based interactions

# Slide 6: What about re-orgs?

Settlements interact with external chains where finality isn't instant. A settlement can be observed, credited to a user, and traded against — then the underlying chain re-orgs and the settlement never happened. We need to handle this without disrupting trading.

**Solution: Optimistic Execution with Pending Inventory**

t+ uses an optimistic execution model — settlements (and deposits) are credited immediately but tracked as **pending** until the underlying chain tx reaches finality. Users can trade against pending balances instantly, but the system tracks which inventory depends on which unfinalized txs.

---

**How it works:**

Every user has two inventory layers:
| Layer | What it is | Used for |
|---|---|---|
| **Finalized** | Ground truth — only includes state backed by finalized on-chain txs | Withdrawals, settlement locking |
| **Effective** | Speculative — finalized + all pending diffs applied | Trading, margin checks |

When a settlement or deposit is observed on-chain (but not yet finalized):
1. The diff is applied to the user's **effective inventory** immediately — they can trade on it right away
2. The diff is stored in a **pending aggregate** tagged with the tx it depends on
3. When the tx reaches finality → the pending aggregate is promoted to finalized inventory
4. If the tx is dropped in a re-org → the pending aggregate and all downstream state depending on it are reverted

---

**Dependency propagation is transitive**

If Alice deposits (pending tx₁) and trades with Bob, Bob's inventory is now polluted by tx₁. If Bob trades with Carol, Carol is also polluted. If tx₁ re-orgs, all three are reverted.

This fan-out is managed by tracking **dependency sets** per user — each pending aggregate is tagged with the set of unfinalized txs it depends on. When a trade happens between two users, the resulting diffs depend on the *union* of both users' tx dependencies.

*Example:* Alice (polluted by tx₁) trades with Dave (polluted by tx₂). The trade diffs for both now depend on {tx₁, tx₂}. If either tx re-orgs, the trade is reverted for both.

---

**Re-org handling:**

A re-org doesn't necessarily invalidate everything — txs can be re-included in the new canonical block. The system diffs old vs new block contents:
- **Re-included txs:** confirmation window restarts, no rollback needed
- **Dropped txs:** all pending aggregates depending on that tx are reverted from effective inventory. OMS is notified to trigger margin checks and force-cancel orders for affected users

**Reactive finalization at re-org time:** before reverting, check if the user's finalized inventory (excluding all pending diffs) can still support their positions. If yes — promote remaining aggregates and skip rollback. The user can absorb the loss, so no disruption needed.

---

**Mitigating dependency fan-out:**

The transitive pollution is a potential concern — a single pending deposit could pollute a market maker who trades with everyone, spreading pending status across the venue.

**Proactive partial early finalization:** periodically check if a user's finalized inventory alone supports their positions. If it does, promote all their pending aggregates early. This "cleans" well-capitalized users before their pending status can spread further — the pollution window shrinks faster than it can propagate.

---

**Withdrawals:** only against finalized balance. A polluted user can still withdraw up to the portion of their balance that is fully finalized.

> **Speaker notes:**
> - **Why optimistic:** waiting for finality before crediting would mean minutes of delay on every settlement — completely kills the trading experience and defeats the purpose of composability. The whole point is that settlements are fast
> - **Pending aggregates are commutative diffs** — individual trade diffs are aggregated into a single entry per dependency set, not stored individually. An MM with 1000 trades during a finality window has 1-3 aggregate entries, not 1000. Dependency sets are identified by hash of sorted tx IDs for O(1) lookup
> - **On the transitive pollution concern:**
>   - Worst case: malicious user deposits, trades with an MM to pollute them, then forces a re-org to cascade rollbacks across the MM's counterparties
>   - Mitigated by: (1) proactive early finalization cleans well-capitalized MMs before pollution spreads, (2) reactive finalization at re-org time skips rollback for users who can absorb the loss
>   - Additional guardrails under consideration: configurable cap on distinct dependency set aggregates per user (e.g., 8-16), tiered finality windows for high-throughput accounts
> - **Settlement locking stays finalized-only** — when a user locks inventory for a new settlement, it deducts from finalized inventory only. This is conservative but safe. Open question on whether solvers should be able to settle against effective inventory with safety caps — current design is restrictive here
> - **Re-org order cancellation:** conservative approach is cancel all open orders for affected users. May be handled by existing OMS margin monitor (if available margin drops below order requirements after revert, orders get force-cancelled automatically)
> - **This is the cost of optimistic execution** — complexity in exchange for no-latency settlements. The alternative (wait for finality) is simpler but makes composability slow enough to be useless for active trading
# Slide 7: t+FULL Composability (exchanges)
t+ offers composability with external non-programmable state machines by allowing users to cross-margin with them (hyperliquid, binance, bybit, qualified custodians, etc.)

This allows us to ingest their liquidity and products as market makers can quote against CEX liquidity and hedge on the CEX with zero capital cost on the t+ side due to cross-margining

It also allows us to scale our open interest extermely efficinetly by enabling basis trades that are twice as capital efficient as normal.

# Slide 8: Account Encumbrance

Cross-margining requires t+ to trustlessly observe and control a user's external account. We call this **account encumbrance**.

**How it works:** TEE-based adapters manage external account credentials. Credentials and keys live inside the TEE — neither t+ nor anyone else can access them. The adapter monitors balances, reports margin contributions to the clearing engine, and enforces risk controls on the external account.

**Encumbrance ranges from observe-only to full control:**
- **Observe-only** (read-only API keys): t+ can see your external balances but can't act. Requires credit limits.
- **Veto** (multisig, user + adapter): t+ can block risky actions but can't act unilaterally. Requires credit limits.
- **Full control** (adapter holds signing majority or write API keys): t+ can force-liquidate the external account if needed. No credit limits required — fully permissionless.

The stronger the encumbrance, the less trust required. Full encumbrance eliminates credit limits, KYB, and bad debt risk entirely — automated liquidation, no cooperation needed.

**Privacy makes this possible.** TEEs provide confidentiality, not just security. The adapter knows your external positions, balances, and fee tiers — but this data never leaves the enclave. t+ sees margin contributions, not underlying positions. No market maker, custodian, or broker would participate if their clients' positions were exposed.

**The vision: log in with your custodian or broker account, commit capital to t+.** The adapter architecture generalizes to any venue with an API — crypto custodians (Copper Clearloop, Fireblocks), CEXs, and eventually traditional brokers. A user's equity portfolio at Schwab becomes cross-margin collateral on t+. Privacy is the prerequisite — no custodian or broker would allow client positions to be made public.

> **Speaker notes:**
> - **Encumbrance model detail (if audience asks):**
>   - Read-only: CEX API keys in TEE. Liquidation = delever on t+, escalate to margin call, worst case absorb as bad debt
>   - Partial: 2/2 multisig (e.g. Hyperliquid). User gets agent wallet for free trading, withdrawals require adapter co-sign. Liquidation = block user actions, timelock, worst case bad debt
>   - Full (decentralized): 2/3 multisig, adapter holds 2 shards. Liquidation = force-close positions, withdraw to t+ vault automatically
>   - Full (CEX): write API keys. Same automated liquidation
> - **Adapter architecture (if audience asks):**
>   - One adapter per venue type. Runs in dstack CVM. Keys derived via dstack-kms bound to code measurement
>   - Shared adapters (multi-user, default) or dedicated adapters (single user, custom operator)
>   - Adapters connect to CE via ATLS, CE verifies TEE attestation on-chain
>   - Heartbeat liveness monitoring — adapter disconnect triggers state lock, extended downtime zeroes credit line
> - **On the vampire attack angle:**
>   - TEEs let us encumber CEX traders' account credentials and trustlessly verify their volume, fee tier, etc.
>   - Then offer them more perks, assets, and incentives than they had on the CEX
>   - t+ offers same UX as a CEX, broader product, lower counterparty risk
> - **On full encumbrance being the key:**
>   - Permissionless (no KYB, no credit limits, no admin approval)
>   - This is what makes cross-margining scale to all users, not just known counterparties
>   - Present all models as part of the architecture, not a roadmap