# Slide 1: Title

**Slide job:** Orient the audience — this is the capital efficiency deep-dive, and it challenges the assumption that perps are the endgame for leveraged trading.

**Slide content:**
## Matched Book Margin
### Arthur Hayes Didn't Oneshot Leverage Trading in 2016 - Improving on Perps

**Speaker notes:**
- Third and final deep-dive. Framing talk established three pillars: quoting, composability, capital efficiency. This talk covers (3).
- Structure: why capital efficiency matters → what perps get right → what perps get wrong → how MBM works → why it's better → why nobody else has done this.
- **Transition:** "Let's start with a question I get a lot."

---

# Slide 2: Why Capital Efficiency Matters

**Slide job:** Preempt the moral framing around leverage — reframe it as a liquidity mechanism.

**Slide content:**
**"Isn't leverage evil?"**

**No — capital efficiency means more liquidity.**

[spot-vs-per-vol.png] Binance BTC/USDT: perps consistently trade 3-5x spot volume, spiking to 10x+ during volatility.

**Speaker notes:**
- Deflection slide. Some audience members have a reflexive anti-leverage stance. Kill it early.
- The chart should make one thing visceral: leveraged markets attract dramatically more volume than spot-only markets.
- Why this matters structurally: leverage lets participants express views with less capital locked up → more participants active simultaneously → tighter spreads and deeper books. Positive-sum liquidity cycle.
- Steelman anti-leverage: "Leverage amplifies losses and creates systemic liquidation cascades" — true, but that's a risk management problem, not a leverage problem. The question is whether you can get the liquidity benefits while managing the risk better.
- **Transition:** "So leverage is good for liquidity. Perps are the current king of leveraged trading. Let's understand why."

---

# Slide 3: Why Perps Are So Capital Efficient

**Slide job:** Give perps full credit for what they get right — the audience must believe you understand the mechanism before you critique it.

**Slide content:**
**Purely synthetic — no underlying needed.**
- Leverage isn't constrained by lender supply
- Just need a counterparty

**Liquidation without market impact.**
- Closing an unsafe position = unwinding a contract
- ADL: force-close against existing counterparties — zero new liquidity needed

**Speaker notes:**
- This slide must be generous to perps. Credibility on their strengths makes the critique on the next slide land harder.
- Purely synthetic: a perp long doesn't require anyone to lend you the underlying. You and a counterparty agree on a contract that tracks the underlying's price. This is why perps can offer 100x+ leverage — the constraint is counterparty availability, not asset supply.
- Contrast with spot margin: to go 5x long ETH on spot margin, someone needs to lend you 4 ETH worth of USDC. That lending supply is finite and has its own cost. Perps bypass this entirely.
- Liquidation without market impact: on spot margin, liquidating a long means selling the underlying into the order book — market impact, slippage, potential cascade. On perps, "liquidation" is just unwinding the contract. ADL goes further: the exchange picks a profitable counterparty and force-closes both sides. No market order, no book impact, no new liquidity sourced.
- **Transition:** "So perps are great at capital efficiency. But they have structural downsides that can't be engineered away."

---

# Slide 4: What Perps Get Wrong

**Slide job:** Establish that perps have two fundamental, structural problems — properties of the instrument itself, not implementation bugs.

**Slide content:**
**Scaling is adversarial.**
- Flow imbalances → premiums/discounts
- Funding rates = unpredictable carry costs
- Punishes hedgers and long-term holders

**Structurally non-fungible with spot.**
- Every position is a bilateral contract
- Can't settle, deliver, or move one side without dissolving the other
- The only way to make leveraged trading fungible with spot is to trade spot on margin

**Speaker notes:**
- Two problems. Both are structural — they follow from what a perp IS.
- Scaling is adversarial: when more people want to go long than short, the perp price rises above spot (premium). Funding rate goes positive to incentivize shorts. But this is adversarial: every new long makes the instrument worse for existing longs. The perp works against its own users as it scales directionally.
- For hedgers: funding rate is unpredictable and can spike during exactly the moments you need the hedge most (high volatility = high directional flow = high funding). Makes perps a poor hedging instrument despite being the most liquid derivative.
- Structurally non-fungible: a perp long is not a spot long. It's a bilateral contract — your long exists because someone else is short. You can't take delivery. You can't move the position to another venue. You can't use it as collateral in a protocol that expects spot.
- "No amount of exchange engineering changes this" — the bilateral structure is definitional. A perp is a contract-for-difference. The only way to make leveraged trading fungible with spot is to trade actual spot on margin.
- Steelman: "Perps are non-fungible but that's fine — they're the most liquid instrument in crypto. Fungibility with spot doesn't matter when perp liquidity dwarfs spot." Defense: perp liquidity is deep but isolated. It can't interact with the broader spot ecosystem. As DeFi composability grows, being locked out of spot liquidity becomes increasingly costly.
- **Transition:** "Can you get the capital efficiency of perps without the structural downsides? That's what Matched Book Margin does."

---

# Slide 5: How Matched Book Margin Works

**Slide job:** Audience understands the three-layer MBM mechanism — default is spot margin, matched positions are an optimization, skew is the remainder.

**Slide content:**
**1. Non-synthetic leverage (default)**
All leverage = spot margin. Borrow, buy the underlying, hold it.
One book for spot and leveraged flow — not a perp book and a spot book.

**2. Matched positions (optimization)**
Opposite-side leveraged positions offset — neither borrow needed.
Treated as synthetic. ADL-able against each other.

**3. Skew (remainder)**
Unmatched leverage stays as spot margin.
Actually borrowed, actually delivered.

**Speaker notes:**
- This is the key slide. The mechanism must be crystal clear.
- Layer 1 — Non-synthetic by default: every leveraged position is, by default, a spot margin position. You want to go 5x long ETH? You borrow USDC, you buy ETH on the spot book, you hold actual ETH. Like Aave leverage but integrated into the exchange. This is why there's one order book — leveraged orders and spot orders are both trading the same underlying asset.
- Layer 2 — Matched = synthetic: when there are leveraged longs AND leveraged shorts, the borrows offset. If Alice is 5x long ETH (borrowed USDC to buy ETH) and Bob is 5x short ETH (borrowed ETH to sell for USDC), neither borrow actually needs to happen — they're each other's counterparty. The system recognizes this and treats matched positions as synthetic: no borrow consumed, ADL-able against each other.
- Critical framing: this is an optimization, not the default. The default is spot margin. Matching is what happens when conditions allow it. The opposite of perps, where synthetic is the default and there's no spot fallback.
- Layer 3 — Skew: whatever leveraged flow doesn't find a match stays as real spot margin. The borrow actually happens. Skew = the net directional imbalance in leveraged positions. $100M in leveraged longs and $60M in leveraged shorts → $60M matched (synthetic), $40M skew (spot margin, real borrows).
- **Transition:** "Matched positions are safe and cheap. Skew is where the cost lives. How does the system manage skew?"

---

# Slide 6: Skew-Based Funding

**Slide job:** Audience understands that MBM funding exists to manage skew (a real economic cost), not to tether price to an external reference.

**Slide content:**

| Book state | Who pays | Why |
|---|---|---|
| Skewed long | Longs pay shorts | Incentivize new shorts |
| Skewed short | Shorts pay longs | Incentivize new longs |
| Balanced | No funding | Matched positions are self-sustaining |

**Perp funding:** tethers synthetic price to spot.
**MBM funding:** reflects the venue's actual cost of carrying skew.

Premiums only manifest under stress (deposit scarcity) — not during normal flow imbalances.

**Speaker notes:**
- Why the venue wants matched positions: matched positions can be ADL'd against each other (safe) and don't draw on underlying deposits (no capital consumed). Skewed positions require actual borrows from deposit pool — consumes liquidity, creates risk. So the venue uses funding to push the book toward balance.
- Mechanism: identical to perp funding in form (longs pay shorts or vice versa) but different in economic meaning. Perp funding fires even when the exchange is operating normally, because any flow imbalance creates a premium. MBM funding exists because skew creates a real cost (borrows from deposit pool). When the book is balanced, there IS no cost, so there's no funding.
- Premium component: MBM funding also has a premium component, but it only manifests under stress — when the venue runs short of underlying deposits to fund skew. On perps, premiums appear during normal flow imbalances. On MBM, normal flow imbalances just create skew funded by deposits.
- Steelman: "Perp funding rates are well-understood and create arb opportunities (basis trading). Your funding mechanism is novel — who's going to arb it?" Defense: MBM funding creates the same arb opportunity — when skew is high and funding is positive, basis traders short on t+ and long elsewhere. The arb is identical in structure. The rate reflects real borrow costs, not synthetic price deviation, so it's more predictable under normal conditions.
- **Transition:** "So MBM gives you leverage with spot margin as the default and synthetic matching as an optimization. Why is this better than just using perps?"

---

# Slide 7: Why This Is Better Than Perps

**Slide job:** Audience believes MBM is structurally superior across four dimensions.

**Slide content:**

| | Perps | MBM |
|---|---|---|
| **Liquidity** | Separate spot + perp books | One unified book |
| **Scaling** | Flow imbalance → premiums | Flow imbalance → spot margin (no premium) |
| **Fungibility** | Bilateral contracts | Real spot — settleable, routable, composable |
| **Hedge cost** | Funding rate (volatile, unpredictable) | Borrow rate (transparent, market-driven) |

**Speaker notes:**
- Each row should feel inevitable given what the audience just learned.
- Unified liquidity: perps fragment liquidity — spot traders on one book, perp traders on another. MMs must provide liquidity to both. MBM: one book. All liquidity concentrates into one price. Deeper book for everyone.
- Scaling without premiums: on perps, excess long demand → perp price rises above spot → premium. On MBM, excess long demand → those longs are real spot margin. The price doesn't deviate from spot because it IS spot. The cost of imbalance is the borrow rate, not a price premium. Caveat: stress conditions CAN create premiums on MBM if the venue runs short of deposits — but this requires genuine deposit scarcity, not just flow imbalance.
- Fungible with spot — four consequences:
  - (a) Settlement enables composability: the venue can settle positions into external spot liquidity (AMMs) to fund skew. This is what makes MBM viable without a massive balance sheet.
  - (b) Captures spot flow: aggregators can route through the book because it's real spot. The venue is a spot venue that happens to offer leverage. Flywheel: more spot flow → deeper book → more leverage flow → deeper book.
  - (c) Better hedging: hedge cost = borrow rate, transparent and market-driven, no basis risk.
  - (d) Prop-AMM: the settlement mechanism allows resting book liquidity to be re-marketed as an AMM to external spot flow. Perps can't do this — you can't route a spot aggregator through a bilateral contract book. This is a big AHA for the audience: fungibility unlocks an entire class of use cases that perps are structurally locked out of.
- Steelman: "Perps are 10x more liquid. Even if MBM is theoretically better, perps will always win on liquidity." Defense: perps are more liquid because they're more capital efficient — which is exactly what MBM matches via matched-position optimization. The additional advantages (fungibility, no premiums, unified book) are structural. And fungibility grows in value with DeFi composability — every new AMM is liquidity MBM can access and perps can't.
- **Transition:** "The most common pushback I get: 'AMM liquidity is tiny compared to perps — fungibility with spot is irrelevant.' Let me show you the data."

---

# Slide 8: Composable Spot Liquidity Can Absorb Matched-Book Skew

**Slide job:** Kill the "AMM liquidity is too small" objection with data.

**Slide content:**
**"But perps are so much more liquid — fungible spot makes no difference."**

Most perp volume is round-trips. What matters is net directional skew — and MBM only routes the residual after cross-side matching.

**HL ETH net taker flow vs AMM throughput (Mar 12-18, 2026):**

| Metric | Value |
|--------|------:|
| HL daily gross taker volume (mean) | $1,165M |
| HL daily net taker skew (mean) | $38.4M |
| AMM daily throughput (mean) | $1,049M |
| **AMM throughput / skew ratio (mean)** | **27x** |
| **Same-day worst ratio (Mar 14)** | **7.5x** |

Highest skew day (Mar 16, $82.5M) had one of the highest AMM volume days ($1,430M) — **17x**. Liquidity showed up when skew spiked.

**Speaker notes:**
- The reframe is the entire point. The naive comparison (AMM spot volume is ~2-3% of perp volume) makes AMMs look irrelevant. The correct comparison is AMM throughput vs net directional skew, because MBM only needs to absorb the unmatched remainder.
- Source: Hyperliquid via Allium (taker flow), GeckoTerminal (AMM volume). Raw data in `data/`.
- Why HL as the proxy: most liquid onchain perp venue. Using its skew as the benchmark is conservative — MBM's matched positions would absorb some of what would be directional flow on a perp venue.
- Why AMM throughput, not TVL: TVL is a stock, throughput is a flow. What matters is "how much can AMMs process per day." AMM volume being majority arb actually strengthens the metric — arb volume exists because someone took the other side of a price deviation. That's real liquidity that corrected a price, exactly what you'd need when absorbing skew.
- The Mar 16 data point is gold: highest skew day correlates with highest AMM volume day. Volatility drives both directional flow and AMM volume. The liquidity you need to absorb skew is most available when skew is highest.
- Steelman: "AMM throughput includes MEV/arb — real available liquidity is less." Defense: ratios are so large (7.5x at worst) that even heavy discounting leaves headroom. And t+ settlements are atomic and can be MEV-aware.
- **Transition:** "So the liquidity is there. Why hasn't anyone built this before?"

---

# Slide 9: Why Doesn't Everyone Do This?

**Slide job:** Audience understands that MBM requires composability as a prerequisite — and composability requires MBM. The interplay is the moat.

**Slide content:**
**MBM requires composability. Composability requires MBM.**

**MBM needs composability:**
- Settlement into AMMs — fund skew, unwind liquidations
- Cross-margin with external exchanges — keep skew dynamics stable

**Composability needs MBM:**
- Without leverage, composable clearing can't scale efficiently
- (Covered in the composability talk)

Both depend on the architecture. (Covered in the performance talk.)

**Speaker notes:**
- MBM needs composability — two mechanisms:
  - (a) Composable spot liquidity (settlements): skew requires real borrows from deposits. Settlements let the venue clear skew into external AMMs atomically — viable without Binance-scale deposits. Liquidations are the acute case: when a skewed position is liquidated, the underlying needs to go somewhere. Settlements route liquidation flow into external liquidity.
  - (b) Composable derivative liquidity (cross-margining): keeps skew dynamics stable.
  - Worked example:
    1. Leveraged long filled by a solver using composable chain liquidity → book skews long, draws down USDC deposits, creates excess ETH
    2. Skew elevates funding rate
    3. Basis trader longs ETH on Hyperliquid, shorts on t+ to capture the funding arb
    4. Short filled by the same solver → draws on ETH deposits, returns USDC → eliminates the drawdown
  - Cross-margin composability is what lets step 3 happen frictionlessly. Without it, the basis trader can't efficiently arb the funding rate and skew just builds.
- Composability needs MBM: covered in the composability talk — leverage makes composability sing. MBM gives makers the capital efficiency to warehouse exposure and clear it into composable markets.
- Both depend on the architecture: TEE provides performance, privacy, and integrity. Without all three, neither MBM nor composability works. Don't re-explain here — reference the performance talk.
- Steelman: "This sounds circular." Defense: it's co-dependent, not circular. Each provides value independently. But the combination is superlinear — each makes the other dramatically more effective. The co-dependency is the moat.
- **Transition / Close:** leads into slide 10.

---

# Slide 10: Close

**Slide job:** Land the arc — perps were right for their era, MBM is right for this one.

**Slide content:**

**2016:** BitMEX invents perps.
Synthetic leverage for a world without composable liquidity.

**2026:** t+ ships Matched Book Margin.
Spot-fungible leverage for a world with it.
