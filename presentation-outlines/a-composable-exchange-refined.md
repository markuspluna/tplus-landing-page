# Slide 1: Title

**Slide job:** Set context — this is the composability deep-dive from the three-pillar framework.

**Slide content:**
## A Composable Exchange
### Putting all Products and Liquidity in One Box PLUS Increasing Flow Value

> **Speaker notes:**
> - Second of three deep-dives. Framing talk established: you need a marketplace for execution monopolies. That marketplace needs (1) optimal quoting, (2) full composability, (3) extreme capital efficiency. This talk covers (2).
> - Structure: what composability actually means → why it's even more valuable than you think → how t+ implements it.
> - **Transition:** "Let's start with what composability actually means — the word gets thrown around loosely."

---

# Slide 2: What Composability Means

**Slide job:** Establish a precise definition that the rest of the talk builds on.

**Slide content:**

| | Read-Only (Partial) | Read + Write (Full) |
|---|---|---|
| **What it does** | Observe external state | Atomically read AND write external state |
| **Example** | Oracle price feeds | Swap composed into a multi-step bundle |
| **Value** | Information | Execution |

**t+ cares about full composability. We want:**
- All products and liquidity in OUR box
- More valuable flow

> **Speaker notes:**
> - "Composability" is overloaded — people use it to mean "I can deposit and withdraw." That's custody, not composability.
> - Read-only = partial composability. Oracles. You can see what's happening elsewhere. Can't act on it atomically. Every DeFi protocol has this. Table stakes.
> - Full composability = your execution can atomically read and write external state. Uniswap on mainnet Ethereum has this with other Ethereum contracts — a swap can be part of a larger atomic transaction. "Full" because there's no level beyond read + write — you can observe and act.
> - t+ cares exclusively about full composability — the ability to atomically bundle operations across venues and chains.
> - **If someone pushes back on "full":** "full means read and write. Read-only is partial. There's no third level — you either observe or you observe and act."
> - **Transition:** "Read-only composability is table stakes — oracles exist. Full composability is where the value is. Here's why."

---

# Slide 3a: Composability Solves Fragmentation

**Slide job:** Audience understands that fragmentation forces expensive capital deployment across venues — for both liquidity and products — and composability eliminates most of it.

**Slide content:**

Fragmentation means no single venue has all the products or all the liquidity. If you want access to everything, you're managing capital across many different venues.

That's **annoying** and it's **expensive:**
- Working capital deployed to each venue independently
- Additional capital to rebalance between them
- ~20% annualized return required on deployed capital (MM hurdle rate)

That's the market maker's problem. If you're a user, you just pay for all of this through worse fills.

---

# Slide 3b: Cost of Accessing Fragmented Liquidity

**Slide job:** Audience sees the concrete cost of liquidity fragmentation for one asset, and how composability eliminates most of it.

**Slide content:**

**[Part 1: Liquidity]**
**So how much does it cost to access fragmented liquidity?**
**ETH spot ±2% depth: ~$173M across 13 venues (5 DEX chains, 8 CEXs).**

[Graph: "Cost of Accessing ETH Spot Liquidity" — two lines comparing status quo vs t+. Y-axis: cumulative ±2% depth accessible (USD). X-axis: incremental annual cost per 1% of depth (USD). t+ line starts at $66.3M on the y-axis (38% of depth accessible with no venue capital via settlements), then climbs gradually as cross-margined CEXs are added. Status quo line starts at $0 and climbs more steeply (working capital + rebalancing on every venue). Data in `data/eth-depth-cost-curve.json`.]

*Assuming MMs deploy 8-25% of venue depth as working capital (inversely with venue size) and hold 5-10% additional capital for inter-venue rebalancing:*

| | Status quo | With t+ |
|---|---|---|
| Total capital required | ~$17.4M | ~$9.9M |
| Annual cost (at ~20% hurdle) | ~$3.5M | ~$2.0M |
| Depth with no venue capital | $0 | **$66.3M (38%)** |
| Rebalancing capital | ~$1.2M | $0 |

**Full composability: 38% of depth with no venue capital. ~43% less total capital. No rebalancing.**

---

# Slide 3c: Cost of Accessing Fragmented Products

**Slide job:** Audience sees the concrete cost of product fragmentation across the top 100 instruments, and how composability collapses it.

**Slide content:**

**[Part 2: Products]**
**So how much does it cost to access fragmented products?**

**Top 100 instruments by volume span 15+ venues.** No single venue lists them all.
Crypto perps, equity perps (TSLA, NVDA, COIN...), commodities (gold, silver, oil), spot — scattered across CEXs, DEXs, and specialized venues.

[Graph: "Cost of Accessing All Products" — two lines comparing status quo vs t+. Y-axis: cumulative instruments accessible (out of 100). X-axis: cumulative hedging capital (USD). **t+ line** starts at 63 instruments on the y-axis ($0 capital — DEX-accessible assets via settlements), then climbs gradually as cross-margined assets are added, reaching 100 at ~$9M. **Status quo line** starts at 0 instruments, $0 capital — adding Binance gets ~75 instruments at ~$47M, then OKX adds ~5 more at ~$1.5M, then Bybit/Bitget/MEXC add the rest, reaching 100 at ~$51M. The gap between the lines = the value of composability for product access. Data in `data/top-100-instruments.md` and `data/product-access-cost-model.md`.]

*An MM providing liquidity for all 100 products on one exchange needs hedging capital on every venue. Capital per asset scales superlinearly — thinner assets need proportionally more capital. (Calibrated to known hedging requirements: BTC ~$5M, ETH ~$2.5M, SOL ~$1.5M.)*

| | Status quo | With t+ |
|---|---|---|
| Quoting venue capital | ~$51M | ~$0 (settlements clear positions) |
| Hedging venue capital | ~$51M | ~$9M (25 non-DEX/uncertain assets, counts as t+ margin) |
| Rebalancing (across ~8 venues) | ~$4M | $0 |
| **Total capital** | **~$106M** | **~$9M** |
| **Annual cost (at ~20% hurdle)** | **~$21M** | **~$1.8M** |

**63 of the top 100 products are DEX-accessible — t+ gets them for free via settlements.**
**~92% less capital. Products you literally cannot offer without composability.**

> **Speaker notes:**
> - Framing talk already established fragmentation is permanent. This slide focuses on the cost mechanism: what MMs actually pay to access fragmented liquidity and products, and why users bear that cost through spreads.
> - **Part 1 — Liquidity (ETH example):**
>   - Data: real ETH spot ±2% depth across 13 venues, pulled 2026-03-19. CEX depth from live order book APIs. DEX depth from router-based estimates (more accurate than individual pool TVL). 5 DEX chains (Mainnet $30M, Base $15.5M, Solana $10M, Arbitrum $7.4M, Unichain $3.4M) + 8 CEXs (Binance $31.4M, Kraken $27.8M, OKX $15.2M, Coinbase $11.7M, Bybit $7.9M, Bitfinex $7.1M, Hyperliquid $3M, Bitstamp $2.6M).
>   - Each chain counts as a separate venue — different settlement, different capital requirements.
>   - **Cost model assumptions (stated on slide):** MMs deploy 8-25% of venue depth as working capital (inversely with venue size — ~8% on Binance, ~25% on thin venues) plus 5-10% additional capital for inter-venue rebalancing. These are estimates — the structural argument holds regardless of exact assumptions.
>   - **Status quo curve:** starts at $0 depth, $0 cost. Working capital + rebalancing on every venue. Total: ~$17.4M capital, ~$3.5M/year for all 13 venues.
>   - **t+ curve:** starts at $66.3M depth, $0 cost — settlement venues (all DEX chains) are accessed atomically via deposit vault, zero additional capital. Then cross-margined CEXs are added: same working capital per CEX, but zero rebalancing. Total: ~$9.9M capital, ~$2.0M/year.
>   - **The visual punchline:** the t+ line starts way up the y-axis (38% of depth with no venue capital) and stays above the status quo line at every cost level. The gap between the lines IS the value of composability.
>   - Full venue-by-venue breakdown in `data/eth-depth-cost-curve.json`.
>   - **The 20% hurdle rate:** MMs require ~20% annualized return on USD capital deployed to a new venue. Most of the audience won't know this number. Makes fragmentation cost concrete.
> - **Transition to Part 2:** "That's one asset. What about offering ALL the top products from one venue?"
> - **Part 2 — Products (top 100 example):**
>   - Data: top 100 instruments by combined 24h volume across all crypto exchanges, pulled 2026-03-19. Includes crypto perps/spot (~86), equity perps (~7 — TSLA, MSTR, COIN, HOOD, PLTR, INTC, NVDA), commodities (~5 — gold, silver, crude oil, platinum, copper), equity-adjacent (~1 — CRCL). Same-underlying consolidated (XAU+PAXG+XAUT = Gold). Full breakdown in `data/top-100-instruments.md`.
>   - **Product fragmentation is arguably worse than liquidity fragmentation.** For liquidity, the same asset exists on multiple venues — you're paying more to access it. For products, some things simply don't exist on most venues. Equity perps are on 2-4 CEXs each. Commodities on 2-4. Long-tail crypto on 1-2.
>   - **63 of 100 are DEX-accessible** — the underlying token exists on a DEX chain with verified liquidity. t+ accesses these for free via settlements. The remaining ~25 (commodities, equity perps, and tokens without verified DEX pools) require cross-margining.
>   - **Capital model:** MM needs hedging capital to quote each product. Capital per asset scales superlinearly with declining volume — thinner books need proportionally more capital per unit of volume. Power law calibrated to three known data points: BTC ~$5M, ETH ~$2.5M, SOL ~$1.5M. Exponent ~0.25 for ETH-SOL range, adjusted ~50% lower for sub-$100M tail per MM input. Full model in `data/product-access-cost-model.md`.
>   - **~$106M status quo** = $51M quoting side + $51M hedging side + $4M rebalancing across ~8 unique hedging venues. This is a single significant MM providing liquidity across all 100 products on a tier 2 exchange.
>   - **~$9M with t+** = 25 non-DEX/uncertain assets need hedging capital (13 commodities/equity perps + 12 tokens without verified DEX pools), and that capital counts as t+ margin via cross-margining. Settlements eliminate quoting-side capital for DEX-accessible assets (MMs fill and settle atomically, never warehouse). No rebalancing.
>   - **The ~92% punchline:** composability doesn't just make existing MMs more efficient — it lowers the bar for who can provide liquidity across the full product set. A $9M MM on t+ can offer what a $100M+ MM struggles to offer on a traditional exchange.
>   - **Anticipated pushback:** "You're comparing an idealized t+ against a real exchange."
>     - Defense: the cost model is the same framework for both — venue capital + rebalancing. t+ eliminates venue capital for DEX-accessible assets (settlements are real, not hypothetical) and recognizes cross-margined capital (also real). The comparison is structural, not aspirational.
> - **Anticipated pushback (both parts):** "Accessing external liquidity isn't the same as having local liquidity — latency, trust assumptions, counterparty risk all differ."
>   - Defense: correct — composability doesn't make external liquidity identical to local. But it makes it *accessible*, which is what matters for execution. A fill routed through an external venue atomically is better than no fill at all. And for the user, the experience is indistinguishable from local liquidity.
> - **Transition:** "But composability doesn't just mitigate fragmentation. It creates value that can't exist without it."

---

# Slide 4: Composable Flow is Worth More

**Slide job:** Audience believes composable flow has superlinear value — each fill is worth more than its standalone value, and the gap widens with scale.

**Slide content:**

On a non-composable venue, each fill is isolated — fill, capture spread, hedge separately. The flow's value is just the spread.

On a composable venue, fills can be atomically bundled with other operations — other fills, external transactions and state. A fill's value isn't what it's worth alone. It's what it contributes to the best possible bundle.

**Non-composable flow:** valued in isolation. **Linear.**
**Composable flow:** valued as part of a bundle. **Superlinear.**

---

**[Example 1 — on load]**

**Flow substitutes for capital.**

[Diagram — two flows compared:]

*Non-composable:*
Client buy order → MM fills with own capital → MM warehouses → MM hedges separately later
*(MM needs capital. Client gets filled at spread + hedge cost.)*

*Composable:*
Client buy order + mispriced Uniswap pool → one atomic settlement: client's order routes through the pool, MM captures the mispricing, client gets filled.
*(MM needs zero capital. Flow IS the capital. Client gets a better price.)*

---

**[Example 2 — on click]**

**Wins winner-take-all.**

[Diagram — two block builders competing:]

Builder A: mempool txs + own capital → builds block.
Builder B: mempool txs + own capital + **composable private orderflow** → bundles flow with DEX arbs and liquidations → builds a strictly better block → **wins auction every time.**

*(Same capital, same speed. Composable flow is the tiebreaker — and it's not marginal, it's categorical.)*

---

**[Example 3 — on click]**

**Combinatorial discovery.**

[Diagram — three operations, each crossed out alone, then bundled:]

❌ MM short ETH position (cost center — need to close it)
❌ Uniswap pool 3bps below fair (too thin to arb standalone)
❌ Stale ETH/BTC bid (not worth the overhead)

↓ **Bundle atomically:**

✅ Close short through mispriced pool → capture 3bps → route via stale bid → capture spread. **Bundle is profitable. Remove any leg and it breaks.**

---

**For CFMM-based venues, this is provably optimal.** Multi-asset CFMM optimization is convex — the optimal bundle is guaranteed ≥ any decomposition into isolated trades. The principle extends directionally to non-CFMM venues: a larger feasible set cannot produce a worse optimum. *(Angeris, Boyd et al. 2021)*

**Result:** each fill on a composable venue is worth more → MMs quote tighter → users get better prices.

> **Speaker notes:**
> - Core thesis of the talk. Composability doesn't just mitigate fragmentation — it creates value that can't exist without it.
> - "Superlinear" — precise meaning: marginal value of an additional composable operation grows with existing composable operations. Each new operation multiplies possible bundles (combinatorial growth). N operations → O(2^N) possible subsets.
> - **Formal backing — Angeris, Agrawal, Evans, Chitra, Boyd (2021):**
>   - Paper: "Constant Function Market Makers: Multi-Asset Trades via Convex Optimization" (arXiv:2107.12484). Stephen Boyd co-author — serious credibility with quant audience.
>   - **Key result (§5):** the optimal multi-asset trade is a convex optimization problem. With 2 composable assets, it's a scalar choice. With n assets, it's an n-dimensional optimization. The optimal n-asset bundle is *guaranteed* ≥ the best decomposition into pairwise trades — because pairwise trades are feasible points in the larger optimization.
>   - **This is the formal proof that composable participants search a strictly larger solution space.** Adding a composable asset expands the feasible set, never shrinks it. The optimal solution can only improve or stay the same.
>   - **Convexity means it's tractable.** No local optima. Off-the-shelf solvers (CVXPY, MOSEK) solve these in seconds. This addresses "who will find these bundles?" — Ethereum searchers already do this in practice with single-chain bundles. The math is well-understood.
>   - **The no-trade cone (eq. 23):** a trader doesn't trade when prices fall within a cone defined by the trading function. Composability across more assets/venues *shrinks the no-trade cone* — mispricings that aren't worth exploiting pairwise become exploitable when you optimize over the full multi-asset space. Maps directly to the combinatorial discovery example.
>   - **Concavity of the forward exchange function (eq. 17):** each additional unit traded on a single pair gives diminishing returns (slippage). Composability avoids this by routing through multiple pairs/pools simultaneously — you find the path of least slippage across the full composable set rather than pushing through one pool.
> - **Flow substitutes for capital:**
>   - OTC desk sees ETH mispriced on Uniswap, 3bps below fair. Non-composable: desk buys with own capital, warehouses, separately fills client. Composable: client's buy order routes through mispriced pool atomically → better execution for client, zero balance sheet for desk. Flow itself provides the capital.
>   - Why non-composable venues can't do this: tradfi = T+1 settlement, capital turns over once/day/venue, can't compose across clearinghouses. CEXs = credit lines are capital-intensive composability. Cross-chain DeFi = scales badly (50 chains = capital nightmare).
>   - Pushback "this is just backrunning" — no, backrunning in a non-composable world requires capital. Composable = atomic, no front-running, no warehousing.
> - **Wins winner-take-all:**
>   - Ethereum block building: two builders, same mempool/capital/speed. One has composable private orderflow → constructs a strictly better block → wins auction every time. Other builder gets nothing. Not marginal — categorical.
>   - Builders pay enormous sums for exclusive composable orderflow — that's the market price of this structural advantage. The audience knows this.
>   - CoW Swap batch auctions: same dynamic. Solver with one extra composable liquidity source wins the whole batch.
>   - Tradfi parallel: RFQ competitions exist but dimensions are only capital + speed. Composability adds a dimension non-composable participants can't access.
>   - Pushback "exclusive flow isn't composability" — exclusive flow in non-composable = linear advantage (more volume). In composable = structural advantage (better solutions). Composability transforms the flow.
> - **Combinatorial discovery:**
>   - MM short ETH (cost center) + Uniswap pool 3bps below fair (too thin to arb) + stale ETH/BTC bid (not worth overhead). None worth doing alone. Composed: clear short through mispriced pool (capture 3bps), route via stale bid (capture spread). Bundle profitable because legs interact. Remove any leg and it breaks.
>   - Non-composable: each evaluated in isolation. 3bps not worth anyone's capital. All parties get worse outcomes.
>   - This is exactly the no-trade cone shrinking: each leg is inside the no-trade cone individually, but the composed bundle falls outside it.
>   - Ethereum searcher/solver ecosystem already demonstrates this single-chain. t+ extends to cross-venue.
>   - Pushback "search space too large" — Boyd et al. prove it's convex → solvable efficiently. Solvers already do this on Ethereum. Even finding a fraction of bundles > finding zero (the non-composable outcome).
> - **Anticipated pushback on "superlinear":** sounds like marketing. Defense: formal result — multi-asset optimization over a larger feasible set yields ≥ any decomposition into smaller optimizations. Boyd et al. 2021 proves this rigorously. Practical ceiling exists (search complexity) but the feasible space is always ⊇ non-composable, and convexity means solvers find the global optimum efficiently.
> - **Private mempools aside** (Q&A only): private mempools reduce flow value by removing txs from the composable set. Every hidden tx shrinks the combinatorial space — shrinks the feasible set for the convex optimization. Private mempools trade systemic flow value for individual MEV protection.
> - **Transition:** "That's why composability matters. Now let me show you how t+ implements it."

---

# Slide 5: How t+ Implements Full Composability

**Slide job:** Reset the audience — signal the shift from theory to implementation.

**Slide content:**

**How t+ Implements Full Composability**

Two problems, two mechanisms:
1. **Chains** (programmable) → Settlements
2. **Exchanges** (non-programmable) → Cross-Margining

> **Speaker notes:**
> - Brief beat — don't linger. Just orient the audience on what's coming.
> - Chains are programmable state machines (Ethereum, Solana, Arbitrum) — you can interact via smart contracts. Exchanges (Binance, Hyperliquid) are not — you interact via APIs. Different composability mechanisms for each.
> - **Transition:** "Let's start with chains."

---

# Slide 6: Settlements — Composing with Chains

**Slide job:** Audience understands how t+ accounts atomically interact with external protocols on any chain.

**Slide content:**

**t+ Settlements:** flash-loan style interactions using global deposit vault funds.

[Diagram: numbered flow]
1. User requests settlement → clearing engine validates safety
2. Pull funds from deposit vault
3. Execute arbitrary interaction (swap, LP, liquidation...)
4. Return funds to deposit vault

**Atomic.** If any step fails, everything reverts.

**Primary use:** MMs fill on t+ → clear exposure into external spot liquidity.

> **Speaker notes:**
> - Settlements let t+ accounts interact with any protocol on any chain where t+ has a deposit vault.
> - Detailed flow:
>   1. User requests settlement approval from t+ offchain system
>   2. Clearing engine validates the settlement flow of funds is safe (net inventory change acceptable)
>   3. CE passes approval
>   4. User executes onchain: pull funds from deposit vault → arbitrary interaction → return funds to vault
>   5. Atomicity guard ensures full interaction succeeds or reverts
> - **Main use case:** MMs fill trades on t+ and settle flow into external onchain spot liquidity. Example: MM gets short ETH from filling a buy order → settles by buying ETH on Uniswap through deposit vault. Exposure cleared, no warehousing.
> - **Sync making for long-tail assets:** for long-tail assets (memecoins), MMs can synchronously fill on t+ and clear exposure in the same settlement — never even realize the margin hit. Only allowed for long-tail assets. Synchronous making = quoting + clearing exposure in a single atomic settlement, so the MM never holds the position.
> - **Future expansion:** settlements aren't limited to token swaps. LP positions, lending protocols, any onchain interaction possible. Settlement = "do something onchain atomically using deposit vault funds."
> - **Anticipated pushback:** "Flash loans but with extra steps?"
>   - Defense: settlements cross chains (flash loans are single-chain), integrate with t+ margin engine, and the "borrower" is clearing real exchange positions — not running standalone arb loops. The economic function is different: flash loans are primarily arbitrage tools; settlements are trade settlement infrastructure.
> - Reuse pitch.html settlement flow diagram — the visual is already clean.
> - **Transition:** "Settlements interact with external chains where finality isn't instant. So what happens if a chain re-orgs?"

---

# Slide 7: Re-org Safety

**Slide job:** Audience believes t+ handles settlement finality without sacrificing trading speed — same problem CEXs already solve for deposits.

**Slide content:**

**Same finality risk every CEX has.** Binance credits your deposit before the chain finalizes. If there's a re-org, the deposit never happened.

**t+ uses optimistic execution** (kinda like optimistic rollups!)

Every user has two balances: **effective** (finalized + pending, used for trading) and **finalized** (confirmed on-chain only, used for withdrawals).

Settlements credit effective instantly — no waiting. As users trade on pending balances, **dependency trees** form:

[Multi-stage graphic — 3 panels:]

**Panel 1 — Finality base + pending trees form.**
Large solid base layer (finalized state — most of the system). On top, two separate dependency trees grow from pending settlements. Each tree has ~10 nodes: root = pending settlement tx, branches = users who traded on that pending balance, spreading outward as they trade with others. The two trees do NOT intersect. Most users on the exchange are in the finality base, not in either tree.

**Panel 2 — Re-org hits tx₁.**
tx₁ reverts. Walk tree 1: for each node, check — does this user's finalized balance alone cover their positions? If yes, cut the connection (safe). If no, roll back to finalized. Most nodes get cut. A few get rolled back. Tree 2 is completely untouched. The finality base is untouched.

**Panel 3 — After resolution.**
Everything is back in the finality base. A handful of users had positions adjusted. Everyone else never noticed.

**Result: the system is mostly finalized. Pending trees are small and isolated. Re-orgs only affect nodes that genuinely can't absorb the loss. Users never have their trading delayed and almost never notice a re-org.**

> **Speaker notes:**
> - **Frame as familiar.** CEX deposit finality + optimistic rollups — two concepts the audience knows. t+ applies both to settlements.
> - **Why it's harder than CEX deposits (if asked):** CEXs just edit their database and reverse the deposit. t+ can't — settlements create inter-user dependency trees. But the tree structure is also what makes it efficient to resolve.
> - **Why optimistic at all:** waiting for finality = minutes of delay on every settlement. Kills trading. Defeats composability.
> - **Dependency tree mechanics:** each trade between two users unions their dependency sets. Trade diffs tagged with the pending txs they depend on. Multiple settlements create overlapping trees. Pending aggregates are commutative diffs — an MM with 1000 trades during a finality window has a few aggregate entries, not 1000.
> - **Why proactive pruning works:** the highest-connectivity nodes (MMs) are also the most well-capitalized. They get pruned first. Pruning an MM prunes everyone downstream of them. So the nodes that propagate dependencies fastest are the ones that get cleaned fastest.
> - **Reactive pruning at re-org time:** same check — can finalized balance cover positions? If yes, prune and skip rollback. This catches anyone proactive pruning missed.
> - **Withdrawals:** only against finalized balance. Same as CEXs requiring N confirmations.
> - **Anticipated pushback — "What if a tree gets too big before pruning?":** configurable caps on dependency set size per user. Tiered finality windows by chain (faster chains = shorter windows = smaller trees). And the base case: MMs are well-capitalized and get pruned continuously.
> - **Transition:** "That covers composability with programmable chains. What about non-programmable venues — CEXs?"

---

# Slide 8: Cross-Margining — Composing with Exchanges

**Slide job:** Audience understands how t+ composes with non-programmable venues by recognizing external accounts as margin.

**Slide content:**

**External exchange accounts count as t+ margin.**

- Quote on t+ against CEX liquidity
- Hedge on the CEX
- Zero additional capital on the t+ side

**Result:** t+ ingests the liquidity and products of every cross-margined venue.

> **Speaker notes:**
> - Chains are programmable — settlements work via atomic onchain interactions. CEXs (Binance, Bybit, Hyperliquid) and custodians are not programmable — you interact via APIs, not smart contracts. Different composability mechanism needed.
> - Cross-margining: t+ recognizes a user's external exchange account as margin collateral. Positions on the external venue count toward t+ margin.
> - **How MMs use this:** quote on t+ against CEX liquidity. Get filled on t+, hedge on CEX. Both legs cross-margined → net exposure low → capital requirement on t+ side near zero for hedged positions.
> - **Product ingestion:** every product on a cross-margined CEX is effectively available through t+. MM quotes a CEX-listed asset on t+, hedges on CEX. User gets the asset on t+ without the CEX being involved from their perspective.
> - **Capital efficiency of basis trades:** cross-margined basis trades (long spot on t+, short perp on CEX) require ~half the margin — without cross-margining you're posting collateral on both venues independently; with it, the offset is recognized so you only need collateral on the cross-margined venue.
> - **OI scaling:** more capital-efficient basis trades → more participants willing to run them → more open interest scalable per unit of capital.
> - **Transition:** "Cross-margining requires t+ to trustlessly observe and control a user's external account. We call this account encumbrance."

---

# Slide 9: Account Encumbrance — TEE Integrity & Privacy

**Slide job:** Audience believes cross-margining can be trustless AND private — TEEs provide both properties, enabling permissionless encumbrance.

**Slide content:**

TEE-based adapters manage external account credentials.
Two properties make this work:

**Integrity:** code is attested — the adapter does exactly what it claims.
**Privacy:** data never leaves the enclave — t+ sees margin contributions, not positions.

**Account encumbrance spectrum:**

| Level | Mechanism | Adapter enforces | Trust required |
|---|---|---|---|
| **Observe** | Read-only API keys | Balance reporting | Credit limits |
| **Veto** | Multisig (user + adapter) | Block risky withdrawals | Credit limits |
| **Full** | Adapter holds signing majority | Force-liquidation | **None** |

Full encumbrance = **permissionless.** No KYB. No credit limits. No bad debt risk.

No market maker, custodian, or broker would participate without both properties.

*TEE trust model and attestation details covered in the Performance deep-dive.*

*Vision: Log in with your custodian or broker account. Commit capital to t+.*

> **Speaker notes:**
> - TEEs provide two properties, both required:
>   - **Integrity:** TEE attestation proves the code running inside the enclave. Neither t+ operators nor the user can tamper with the adapter's logic. If the margin model says "force-liquidate at threshold X," it will. No human override. This is what makes it trustless.
>   - **Privacy:** the adapter has full visibility into the external account — positions, balances, fee tiers — but this data never leaves the enclave. CE sees a margin contribution (a single number), not underlying positions. This is what makes participants willing to encumber.
>   - Integrity without privacy → no one participates. Privacy without integrity → no one trusts the liquidation path. You need both.
> - **Encumbrance levels in detail:**
>   - Observe-only (read-only API keys): t+ sees external balances, can't act. Requires credit limits because t+ can't force-liquidate. Liquidation path: delever on t+, escalate to margin call, worst case absorb as bad debt.
>   - Veto (multisig, user + adapter): t+ can block risky actions (e.g., block withdrawal during margin stress) but can't act unilaterally. Still requires credit limits. Hyperliquid: user gets agent wallet for free trading, withdrawals require adapter co-sign.
>   - Full control (adapter holds signing majority or write API keys): t+ can force-close positions and withdraw to t+ vault automatically. No credit limits. Fully permissionless — no KYB, no admin approval, no bad debt risk.
> - **Why full encumbrance matters:** it's what makes cross-margining scale to all users, not just known counterparties. Observe-only and veto are stepping stones — by slide 2's own taxonomy, they're partial composability (read-only). Full encumbrance is the target: atomic read AND write on non-programmable venues. Present all models as part of the architecture, not a roadmap.
> - **Privacy is a prerequisite, not a feature:**
>   - No MM would encumber their Binance account if t+ (or its users) could see their Binance positions. Trading death sentence.
>   - No custodian (Copper, Fireblocks) would allow client accounts to be cross-margined if client positions were public.
>   - No traditional broker would allow client portfolios to count as collateral if position data leaked.
> - **Adapter architecture (if audience asks):**
>   - One adapter per venue type. Runs in dstack CVM. Keys derived via dstack-kms bound to code measurement.
>   - Shared adapters (multi-user, default) or dedicated adapters (single user, custom operator).
>   - Connect to CE via ATLS, CE verifies TEE attestation on-chain.
>   - Heartbeat liveness monitoring — disconnect triggers state lock, extended downtime zeroes credit line.
> - **The vision:** adapter architecture generalizes to any venue with an API. Account encumbrance is essentially delegated access (similar to OAuth 3.0 — scoped, revocable, privacy-preserving). Crypto custodians and CEXs are the near-term path; traditional brokers are the long-term unlock.
> - **Frame as future vision, not current capability.** Traditional brokerage integration requires partnerships — the audience should understand this is where the architecture leads, not what ships day one.
> - **Vampire attack angle** (Q&A): TEEs let us encumber CEX traders' accounts and trustlessly verify their volume, fee tier, etc. Then offer more perks, assets, incentives than the CEX.
> - **Transition:** "Before we close — I know what you're thinking."

---

# Slide 10: "So You Built a Fancy Router?"

**Slide job:** Preempt the most likely audience objection. This isn't an aggregator — three structural features make composability on t+ fundamentally different from routing.

**Slide content:**

## "So you built a fancy router?"

**NO.**

1. **Internal CLOB + matching engine.** Native liquidity first — external routing only when it's cheaper. Enables coordinated multi-party fills.
2. **Leverage makes composability sing.** MBM gives the capital efficiency of perps with the fungibility of spot. Makers take large exposure and clear it into composable markets over time.
3. **TEEs make composability survivable.** Without privacy, composability is slower than direct execution. Exposed signals = death in adversarial markets.

> **Speaker notes:**
> - This is the "so what" slide. The audience will pattern-match t+ to 1inch, CoW Swap, or an OTC aggregator. This slide breaks that frame.
> - **Point 1 — Internal CLOB:**
>   - A router sends your order elsewhere. t+ has its own orderbook and matching engine — native liquidity that doesn't need to route anywhere.
>   - External composability is the fallback, not the primary path. Flow only leaves t+ when external liquidity is genuinely cheaper.
>   - **Coordinated multi-party fills:** a single order on t+ might be filled by three different participants simultaneously — 25% by a MM algo, 50% by a maker/taker hedging on a CEX via cross-margining, 25% by a searcher planning to backrun the exposure onchain. The matching engine coordinates this. A router can't do this — it picks one path.
>   - This is closer to a prime brokerage than a router. PBs coordinate counterparties around a central book. t+ does the same thing permissionlessly.
> - **Point 2 — Leverage (MBM):**
>   - Matched Book Margin gives makers leverage calibrated to their hedged exposure — capital efficiency of perps without losing spot fungibility.
>   - Why this matters for composability: a maker can enter a $100M short position on t+ with far less than $100M capital (MBM recognizes the hedge). Then they clear that exposure over time into composable markets — JIT LPing on Uniswap, selling into onchain demand, sandwiching onchain buys to exit at better prices.
>   - Without leverage, composable clearing is capital-constrained. MBM removes the constraint. The maker can warehouse more flow because they can clear it more efficiently.
>   - A router doesn't give you leverage. It doesn't let you warehouse and strategically exit.
> - **Point 3 — TEE privacy:**
>   - Composability without privacy is strictly worse than non-composable execution in adversarial markets.
>   - If your composable settlement is visible before it lands, searchers front-run it. The mispricing you're capturing gets arbed before your tx confirms. Net result: worse execution than just doing it non-composably on a CEX.
>   - TEEs hide the settlement intent. The composable bundle is assembled and executed inside the enclave. External observers see the result, not the plan.
>   - This is why "just use a DEX aggregator" doesn't work for serious size. Aggregator txs are visible in the mempool. t+ settlements are not.
> - **Anticipated pushback — "Isn't this just vertical integration?"**
>   - Yes, and that's the point. Routers are horizontal (connect existing venues). t+ is vertical (internal execution + composable clearing + leverage + privacy). The vertical stack is what makes composability actually work at scale.
> - **Close the talk here.** Composability is the PB-style feature set that CEXs approximate with credit lines — t+ makes it permissionless (integrity) and private (confidentiality).
