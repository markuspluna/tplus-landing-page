# Slide 1: Title
## DeFi Needs a CEX?!?
### T+ Product Day 2026

---

# Slide 2: Orderflow Execution Demo
[Video — full screen, no overlay text]

> **Speaker notes:**
> - This is me trying to buy popcat delta
> - Sped up with a real time timer so we don't waste everyones time 
> - Steps shown: sell INTC on Schwab → onramp to Coinbase → buy ETH + SOL for gas → withdraw ETH to Arbitrum, SOL to Solana → withdraw USDC to Arbitrum + Solana → deposit USDC to Hyperliquid + Solana venue → buy POPCAT spot on Jupiter → buy POPCAT perps on Hyperliquid (max leverage)
> - 12 steps, 5 platforms, 3 chains, 2 asset classes — just to get POPCAT delta

---

# Slide 3: The Cost
- **Time to Execute:** [X minutes]
- **Execution markout:** [X bps]

> **Speaker notes:**
> - **Markout definition:** difference between the price you got and where an optimal execution would have filled you — how execution quality is evaluated in tradfi
> - Markout here reflects fragmented liquidity sources + unsophisticated execution - a solana searcher could have executed the solana leg quite well - a HL HFT player could have executed the HL leg well - someone specializing in both could have done both legs well. That's still not optimal, there are 10-12 source liquidity venues for POPCAT
> - In addition, if our trade was larger executing across multiple different lit venues throughout different time periods would leak intention causing frontrunning. As is, non-synchronized 
> - **Time = opportunity cost:** you decided to execute at a specific price; by the time you finish 12 steps that price is gone
> - **Transition:** "That sucked. You might think this is a UX problem. It's not."

---

# Slide 4: This Isn't *just* a UX issue — It's Market Structure issue

[Graphic: fragmentation visual — venues/chains proliferating - maybe just a sankey diagram barter style for ETH]
[on click new graphic with sankey for something like HYPE which isn't available on many CEXs or DEXs]

Liquidity fragmentation isn't isolated to crypto
**Only ~15% of NASDAQ-listed securities' volume trades on the NASDAQ.**

Optimal (even reasonable) trade execution is HARD

> **Speaker notes:**
> - Execution surfaces are severely fragmented in crypto - majors have dozens of different private liquidity sources with different requirements to execute on each of them
> - Not every venue has access to every asset or product
> - **The stat:** NASDAQ matched market share in own listed securities ≈ 15% (14.88% Feb 2026, nasdaqtrader.com/Trader.aspx?id=MarketShare)
> - 85% trades elsewhere — other lit exchanges, dark pools, internalizers, ECNs
> - Double-check number close to presentation date (shifts monthly, structural range 14-17%)
> - **Key point:** fragmentation is a fundamental property of markets, not crypto-specific
> - In tradfi, your broker hides it — Schwab's smart order router handles NASDAQ vs NYSE Arca vs IEX vs dark pools vs internalization
> - RegNMS, MiFID, consolidated tape, best-execution obligations — entire infrastructure layer between you and fragmentation
> - **But tradfi mitigations are partial — they don't solve fragmentation:**
>   - NBBO only guarantees best *displayed* quote at displayed size — behind it, dozens of venues with different depth, hidden orders, fee structures, queue priorities
>   - DTCC consolidates settlement but not execution
>   - If you're executing anything of size you're still routing across every venue because each has different liquidity at different price levels — this is why SOR and execution algos are entire industries
>   - The NASDAQ stat proves it: if NBBO/regulation solved fragmentation, 85% of volume wouldn't leak elsewhere
> - **Crypto adds settlement fragmentation on top** — not just different execution venues but different chains, gas tokens, bridging. Makes it strictly worse, not just different.
> - In crypto, no mandatory broker layer — permissionless finance lets you execute directly at venues
> - You ARE the broker. And you're bad at it — not because you're dumb, because it's genuinely hard
> - Graphic should make fragmentation feel visceral — chains/DEXs/venues proliferating

---

# Slide 5: Fragmentation Will Not Solve Itself

[Graphic: graph of cumulative number of liquid venues over time]

Brokers/OTC desks don't solve this either as no single party is good at executing everywhere

This problem will increase in tradfi

**You need a marketplace for execution monopolies.**

> **Speaker notes:**
> - **Why permanent:** permissionless finance = zero barrier to launch a venue or issue an asset
> - No regulatory body consolidating liquidity (compare RegNMS, MiFID)
> - No geographic financial center creating natural concentration
> - Fragmentation is the steady state — it only grows
> - Note that this problem is just going to increase in tradfi with the proliferation of RWA tokenization and derivatives
> - **Execution monopolies** — use the word deliberately, it's provocative:
>   - Token deal allocations → monopoly on primary market access
>   - Exchange partnerships (co-lo, fee tiers, API priority) → monopoly on best execution at that venue
>   - 30% of Solana stake → near-monopoly on block inclusion/MEV
>   - Private Ethereum orderflow → monopoly on that flow's routing
>   - Vol desk selling cheap options → monopoly on that pricing
> - These are structural, durable advantages — not temporary
> - **Key insight:** don't eliminate monopolies — make them compete
> - The marketplace is what makes monopolies competitive rather than extractive
> - If someone pushes back on "monopolies" in Q&A — good, means the framing stuck
> - Defense: these are local monopolies (specific edges on specific venues)

---

# Slide 6: What That Marketplace Needs

[Animation — "MISSION:" style block, similar to pitch.html terminal/alert style]

On load, three mission headers appear:

**MISSION 1: Optimal Quoting Environment**
**MISSION 2: Full Composability**
**MISSION 3: Extreme Capital Efficiency**

On click, sub-requirements populate below each mission:

**MISSION 1: Optimal Quoting Environment**
- Consistently FAST
(screenshot of burckmeister tweet: https://x.com/burckmeister/status/1994186227314983299)
- No cost-to-quote (prioritized cancels, no gas, no margin check)
- Order and Position Privacy
- Permissionless and Trustless

**MISSION 2: Full Composability**
- Can access external liquidity and products WITHOUT additional capital cost

**MISSION 3: Extreme Capital Efficiency**
- High leverage and flexible margining

> **Speaker notes:**
> - **Quoting:**
>   - FAST — the faster you are the quicker participants can react to and execute on new information. No rotation allowed as it makes latency inconsistent 
>   - Prioritized cancels — lowers cost from toxic flow
>   - No cost-to-quote — gas costs, failed txn costs, margin checks on quotes all widen spreads or kill participation
>   - Pre-trade privacy — avoids frontrunning. MM last look issue especially relevant given cancel prioritization
>   - Permissionless and trustless — excluding participants = excluding liquidity, makes everything worse by definition
> - **Composability:**
>   - Liquidity and products won't concentrate to one venue in permissionless finance (or even permissioned finance without a geopolitical financial center)
>   - Can't be a capital cost for executing against an external venue — if MMs must pre-fund N venues, need N× capital, less liquidity per venue
>   - You want access to everyone's liquidity and products
> - **Capital efficiency:**
>   - More capital efficient → cheaper to trade → more liquidity and volume
>   - Virtuous cycle: whoever wins on capital efficiency attracts most capital

---

# Slide 7: CEXs Are The Closest

[Same mission block layout as slide 6 — reuses the structure, but each sub-requirement now has a status emoji]

**MISSION 1: Excellent Quoting Environment**
- ✅ Fast — centralized matching engine, dedicated hardware
- ⚠️ Low cost-to-quote — no gas, sometimes no margin check on quote
- ⚠️ Prioritized cancels — sometimes
- ❓ Pre-trade privacy — "if you trust the operator"
    - arthur hayes image of running the stops
- ❌ Permissionless and trustless — KYC and jurisdiction restricted. Centralized custody.

**MISSION 2: Full Composability**
- ⚠️ Liquidity composability — credit lines for MMs (permissioned, relationship-based)
- ❌ Product composability — limited to what the CEX lists

**MISSION 3: Extreme Capital Efficiency**
- ✅ High leverage and flexible margining — 100x+ leverage and credit lines

> **Speaker notes:**
> - CEXs were a reasonable first pass at the marketplace problem → justifies "DeFi Needs a CEX" title
> - **Quoting:**
>   - Fast and non-rotating — centralized matching engine, dedicated hardware, no consensus overhead
>   - No cost to quote (no gas etc)
>   - Prioritized cancels (sometimes) — implementations vary
>   - No margin check on quotes (sometimes)
>   - Private — IF you actually trust the operator isn't surfacing your positions and flow internally
> - **Composability:**
>   - Cross margin and custodian/broker support
>   - Large lines of credit to allow MMs to execute in different domains
>   - But all permissioned, relationship-based, finite — composability for the privileged few
> - **Capital efficiency:**
>   - Plethora of leverage options + the aforementioned lines of credit
>   - Can be aggressive because they're the custodian — instant liquidation since they hold funds
> - **The tradeoff:** they're a centralized custodian that can do whatever the heck they want

---

# Slide 8: t+ — The First Prime Exchange

We built a Prime Exchange to finish what CEX's started.

[Same mission block layout — all checkmarks]

**MISSION 1: Optimal Quoting Environment**
- ✅ Consistently FAST — one fast CLOB in a non-rotating TEE
- ✅ Prioritized Cancels
- ✅ No cost-to-quote — no gas, no margin req to quote (for MMs)
- ✅ Order and Position Privacy — only L2 book data makes it out of the TEE
- ✅ Permissionless and Trustless - it's in a TEE (and other stuff)

**MISSION 2: Full Composability**
- ✅ Access external liquidity and products WITHOUT additional capital cost
    - t+ accounts can atomically interact with external protocols using global deposits
    - t+ accounts can cross-margin with external exchanges

**MISSION 3: Extreme Capital Efficiency**
- ✅ High leverage and flexible margining — Matched Book Margin


> **Speaker notes:**

> - **Why "Prime Exchange":** an exchange that offers Prime Broker style features. CEXs were a precursor to this.
>   - Tradfi PBs (Goldman, MS) provide: unified capital base, leverage, cross-venue execution, settlement
>   - CEXs bundled exchange + PB into one centralized entity — t+ unbundles it without centralized custody
> - **Quoting:** optimal trading environment with a CLOB in a TEE
>   - High-performance and non-rotating
>   - Prioritized cancels
>   - No margin requirement to quote (for MMs)
>   - No cost-to-quote (no gas)
>   - Private — order and position privacy, L2 book data is reported
>   - Permissionless, trustless, decentralized — TEE does not necessarily mean this, performance talk goes deeper
> - **Composability:** the PB-style features — this is the biggest upgrade over CEXs
>   - t+ account can interact with external protocols on any chain where we have a deposit vault, atomically, using deposit vault funds (kinda like a flashloan)
>   - Clear leverage exposure with onchain spot liquidity
>   - Cross margin with your favorite source exchange (Hyperliquid, Binance, etc.)
>   - We ingest products and liquidity from everyone else
>   - Composability talk goes deep
> - **Capital efficiency — Matched Book Margin:**
>   - Match cross-side leverage positions against each other to allow them to be auto-deleveraged
>   - Scales via skewing exposure rather than creating premiums or discounts on a synthetic asset (skew-based funding rates)
>   - You get the capital efficiency of perps but don't lose fungibility with underlying spot markets, create premiums, or make funding rates more volatile
>   - MBM talk goes deep — just plant the seed here
> - **Punchline: "Noncustodial. Permissionless."** — mirror of CEX punchline, inverted.

---

# Slide 9: The Prime Exchange Network
There are Source Exchanges and Flow Exchanges. Every Flow Exchange is going to become a Prime Exchange.
t+ is actually a network for them
- Unified capital base + state machine
- Anyone can build an orderbook or auction that can propose mutations
- Each proposer enforces own rules (AML, KYC, features)
- Natural fit: OTC desks, T2 CEXs, new flow venues

[Diagram: t+ unified capital/state layer in the middle. Prime Exchanges (including t+ CLOB) on top as stems. Source exchanges on bottom as roots.]


> **Speaker notes:**
> - Vision close — zoom out from product to ecosystem
> - **Proposer model:** any system that proposes state mutations to the t+ state machine
>   - t+'s CLOB is just one proposer
>   - OTC desk = proposer (matches bilaterally, submits to t+ for settlement/margining)
>   - T2 CEX = proposer (own matching engine, uses t+ capital pool + composability)
>   - Batch auctions, intent systems, dark pools = all potential proposers
>   - Each enforces own AML/KYC, fees, products, UX
>   - All share same capital pool, margin engine, composability with external venues
> - **Why it matters:** permissionless finance keeps producing flow venues — all face cold-start problem (need liquidity, margin infra, composability)
>   - Today: each builds from scratch or goes without
>   - As proposer: immediate access to full t+ capital pool + cross-margin + external composability
>   - Cold-start problem disappears
> - **Diagram:** roots = source exchanges (Hyperliquid, Binance, onchain venues), trunk = t+ unified infra, branches = Prime Exchanges serving different users/use cases
> - **Handoff:** tease three follow-up presentations — performance, composability, capital efficiency deep dives
