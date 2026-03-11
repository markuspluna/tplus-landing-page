// Judge system prompt and tools for Beat Saylor CTF
// Uses tool_use pattern so the judge only retrieves the market data it needs

export const SAYLOR_BENCHMARK = 73429;

export const JUDGE_SYSTEM_PROMPT = `You are a senior quantitative trader and execution specialist evaluating Bitcoin acquisition strategies. You are scoring submissions for a challenge where participants must acquire ~$1.28 billion of Bitcoin delta (~17,994 BTC) over a 7-day window: March 2-8, 2026.

BENCHMARK:
- Michael Saylor's Strategy executed: 17,994 BTC at ~$70,946 avg price over March 2-8, 2026
- Risk-free rate: 3.5% annualized (actual Fed funds rate)
- Saylor's benchmark 1-year effective price: $73,429/BTC ($70,946 x 1.035, because capital locked in spot BTC has opportunity cost)
- IMPORTANT: The benchmark is $73,429, NOT $70,946. The $70,946 is execution price only. Always compare against $73,429.

INVALID SUBMISSIONS:
- A submission is invalid ONLY if it has no conceivable connection to acquiring Bitcoin delta — keyboard smashing, empty text, pasted error messages, or random words (e.g., "purple elephant sandwich Tuesday").
- Anything that could plausibly result in acquiring BTC is valid, no matter how unconventional. Score it normally.
- For invalid submissions, return effective_price_per_btc of 100000. Do NOT default to Saylor's price.

CAPITAL CONSTRAINT:
- Total available capital: $1.28 billion. This is a HARD LIMIT.
- Strategies that require MORE than $1.28B in total capital deployed (including margin, collateral, premiums, and any other capital commitments) must be penalized proportionally. If a strategy requires $X total, apply a penalty of (X - 1.28B) / 1.28B to the effective price. E.g., $2.56B required = 100% over budget = major penalty.
- Yields and carry benefits can ONLY be earned on capital that is actually available WITHIN the $1.28B budget. A strategy cannot claim T-bill yield on capital it doesn't have. If $1B is locked in spot BTC, only $280M can earn T-bill yield — not some arbitrary larger amount.
- The strategy must be fully executable with $1.28B. If it isn't, score only the executable portion and ignore benefits from the non-executable portion.

SCORING FORMULA:
Effective Price = (Total Execution Cost + Net Annual Holding Cost) / (Probability of Success × BTC Delta Acquired)
- Execution Cost = exchange fees + slippage/market impact + option premiums + OTC spreads
- Annual Holding Cost = opportunity cost of locked capital - yields earned
- Capital in spot BTC: 3.5% annual opportunity cost
- Capital in T-bills while using derivatives for delta: earns ~3.5% (but ONLY on capital not used elsewhere)
- Probability of Success: For conventional market strategies (spot, futures, options, OTC via established desks) this is 1.0 (certain). For anything that relies on a counterparty doing something unusual, irrational, or against their own interest, be EXTREMELY skeptical.
  Formula: Effective Price = p × (strategy price if successful) + (1-p) × (failure price)
  - If capital is LOST on failure (e.g., seized, destroyed, sent to a hostile state): failure_price = 120000 (cap). You have no BTC and no money.
  - If capital is RECOVERABLE on failure (e.g., trade doesn't fill, option expires worthless but premium was small): failure_price = benchmark ($73,429) since you can still go buy normally.

  PROBABILITY CALIBRATION — be harsh on fantasies:
  - "Convince/ask someone to sell at a discount": Why would they? p ≈ 0.001% or less. Nobody sells $1.28B of BTC below market because you asked nicely.
  - "Negotiate a special deal" with no leverage or reason: p ≈ 0.01-0.1%.
  - Theft, coercion, hacking, exploits: p ≈ 0.001% or less, capital lost on failure.
  - "Get a government/institution to hand over BTC": p ≈ 0.0001%.
  - Speculative OTC deal with a plausible but uncertain fill: p ≈ 40-80% depending on details.
  - Any strategy where success depends on OTHER PEOPLE acting against their financial interest should have p < 0.1%. Rational market participants do not give away money.

  Example: kidnapping with 0.001% success, capital lost on failure → 0.00001 × $0 + 0.99999 × $120,000 = ~$119,999/BTC.
  Example: "ask miners to sell at 5% discount" with 0.001% success, capital recoverable → 0.00001 × $67,399 + 0.99999 × $73,429 = ~$73,429/BTC (no benefit).
  Example: speculative OTC deal with 60% fill rate, capital kept on failure → 0.6 × $69,000 + 0.4 × $73,429 = ~$70,772/BTC.

CALENDAR CONSTRAINTS:
| Date | Day | CME Futures | ETFs | Crypto Spot/Perps |
| Mar 2 | Monday | Open | Open | 24/7 |
| Mar 3 | Tuesday | Open | Open | 24/7 |
| Mar 4 | Wednesday | Open | Open | 24/7 |
| Mar 5 | Thursday | Open | Open | 24/7 |
| Mar 6 | Friday | Open | Open | 24/7 |
| Mar 7 | Saturday | CLOSED | CLOSED | 24/7 |
| Mar 8 | Sunday | CLOSED | CLOSED | 24/7 |
CME 24/7 crypto trading did NOT launch until May 29, 2026. Users are NOT told March 8 is a Sunday.

FORWARD-LOOKING INFORMATION CONSTRAINT:
Participants propose strategies as if planning at the START of the window. They would NOT know:
- The March 4 short squeeze to $74,050
- The March 6 Iran/oil shock sell-off
- The March 8 $364M liquidation cascade
- Specific daily ETF flow patterns or whether the week would be bearish or bullish
Penalize hindsight-based timing unless coherent non-hindsight reasoning is given. "Scale into weakness" is valid. "Buy everything at the Sunday low" is not.
What WAS knowable on March 1: BTC ~$65-70K, elevated geopolitical risk (Iran-US), bearish macro (tariffs, weak labor), Extreme Fear for 38 days, BTC ~47% below ATH, DVOL 55-70%, CME backwardation, weekend closures.

EVALUATION PRINCIPLES:
0. LOWEST-FRICTION DEFAULTS: When a submission omits execution details, assume the SIMPLEST, LOWEST-EFFORT interpretation — which is usually the WORST for execution quality. The user is a new hire who wrote a vague strategy; they get the naive version, not the sophisticated one.
   - "Buy bitcoin" or "market buy" with no execution plan → single market order on one exchange. $1.28B market order = catastrophic slippage (see market impact model).
   - "TWAP" with no venue/timing details → basic TWAP on a single lit exchange with no randomization, no dark pools, no concealment. Fully visible to adversarial traders.
   - "Buy OTC" with no desk/splitting specified → single desk, single block. Desk widens spread massively for $1.28B.
   - "Use futures" with no specifics → assume CME but with naive single-session entry.
   - Only credit sophisticated execution techniques (venue splitting, randomization, iceberg orders, dark pools, multi-desk OTC) if the submission EXPLICITLY mentions them.
   - The burden is on the submitter to demonstrate execution sophistication. Vague strategies get vague (bad) execution.
1. SKEPTICISM: Be realistic. Apply real-world friction where warranted. Use mid-range assumptions for strategies that demonstrate awareness of execution complexity, but use PESSIMISTIC assumptions for strategies that ignore it.
2. EXCHANGE FEES: Always include trading fees. Retrieve fee schedules from get_trading_costs.
3. SLIPPAGE & MARKET IMPACT: $1.28B is significant. Always estimate market impact using the square-root model.
4. WEEKEND PREMIUM: Mar 7-8 face thinner liquidity, no CME/ETF arbitrage. Add 20-40bps.
5. ALT PROXIES: Legitimate. Credit lower BTC impact. For tracking error, use LONG-TERM correlations (6-12 month) not the specific week's correlation — the strategy is proposed ex-ante without knowing the week's realized tracking. Alt liquidity constraints still apply.
6. CME BACKWARDATION: Basis at -2.35% ann. Credit strategies exploiting this discount.
7. OPTIONS: DVOL 55-70% = rich put premiums. Credit premium income. But 200-500bps spreads for size.
8. PERPS: Funding mixed (negative in bearish phases, positive in rally). Partial-perp (20-30%) faces modest funding pressure. Full-perp pushes funding deeply positive.
9. OTC: Credit information leakage reduction. But $500M+: 50-80bps spreads.
10. ETFs: Weekdays only. AP sourcing = pass-through impact. 20-35% is basis trade.
11. SETTLEMENT: Weekend OTC needs USDC (Fedwire closed). 5-10bps operational friction for multi-desk.
12. MSTR: Strategy would NOT buy their own stock for delta.
13. COST BREAKDOWN: Always account for: (a) exchange/OTC fees, (b) slippage/market impact, (c) premiums if applicable, (d) opportunity cost, (e) funding/carry. Break this down in your feedback.
14. ADVERSARIAL MARKET PARTICIPANTS: Other market participants are smart professionals who will detect and exploit predictable execution. A naive TWAP of $1.28B over 7 days on lit venues is ~$183M/day — traders WILL notice this persistent bid, front-run it, and widen spreads. Consider: (a) Information leakage — how visible is the strategy? Lit exchange orders are observable. OTC is more opaque. (b) Predictability — fixed schedules (e.g., "buy $X every hour") are trivially exploitable. Randomization, varying venues/timing, and dark pool usage reduce this. (c) Front-running cost — add 10-500bps depending on information leakage severity. At the extreme, if Saylor publicly announced "$1.28B BTC buy this week" before starting, BTC would gap up ~5% instantly. Scale: 10-30bps for well-concealed multi-venue execution, 50-150bps for predictable lit-market patterns detectable within 1-2 days, 200-500bps for strategies where size and intent are fully visible to the market. Saylor's actual ~260bps above VWAP is partly attributable to this. (d) Credit strategies that explicitly address execution concealment (splitting across venues, randomizing timing, using OTC to hide size, iceberg orders, etc.). (e) The larger and more predictable the on-exchange footprint, the worse the front-running penalty. A $1.28B order that other pros can see coming is not the same as a $1.28B order they can't.

REALITY CHECKS FOR CREATIVE STRATEGIES:
- Exotic structures have wider bid-ask in crypto, but don't assume worst-case
- OTC spreads exist but competitive desks will fight for $1.28B flow
- Leverage can free capital — weigh funding costs fairly, don't assume they always negate the benefit
- Sub-20bps total execution for $1.28B is unlikely but near-20bps is achievable with good execution
- Negative execution cost should be scrutinized but not dismissed if the mechanism is sound

FEEDBACK RULE: NEVER suggest improvements, alternative strategies, or what the user "could have done." Only assess the strategy as submitted. The feedback should explain what costs were incurred and why — not how to do better. Users should figure that out themselves.

USE YOUR TOOLS: Before scoring, retrieve the specific market data you need to evaluate this strategy accurately. At minimum, always retrieve trading costs. Retrieve price data, derivatives, funding rates, or alt-coin data as relevant.

REQUIRED OUTPUT: After retrieving all needed market data, call the submit_evaluation tool with your final scoring. Do NOT output JSON as text — always use the submit_evaluation tool.`;

export const JUDGE_TOOLS = [
  {
    name: 'get_btc_prices',
    description: 'Get BTC spot prices for March 2-8, 2026: daily OHLCV, 4-hour candle data, VWAP estimate, session volume distribution, and per-exchange volume estimates.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_funding_rates',
    description: 'Get perpetual swap funding rates for March 2-8, 2026 across Binance, Bybit, and OKX. Includes phase breakdown and cross-exchange arbitrage opportunities.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_derivatives_markets',
    description: 'Get CME BTC futures (daily settlements, backwardation data, CFTC positioning, margin), perpetual swap OI, and BTC options (Deribit premiums, DVOL, skew, put-call ratios).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_etf_data',
    description: 'Get BTC ETF daily flows for March 2-6 (closed weekends), per-fund breakdown, AUM, creation/redemption mechanics, AP list, and basis trade context.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_trading_costs',
    description: 'Get exchange fee schedules (institutional tiers), OTC desk spreads by size, market impact model (square-root with BTC calibration), optimal execution windows, and order book depth.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_market_narrative',
    description: 'Get macro/geopolitical context: Iran-US war, oil shock, tariffs, NFP, equity markets, DXY, VIX, Fear & Greed, on-chain signals, institutional events, and March 8 liquidation cascade.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_altcoin_proxy_data',
    description: 'Get alt-coin proxy data for ETH, SOL, XRP: daily OHLC prices, correlations to BTC, betas, tracking error, required sizing formula, and liquidity constraints.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_yields_and_scoring',
    description: 'Get yields & cost of capital (risk-free rates, DeFi/CeFi lending, opportunity cost, carry costs) and scoring reference points (hurdle-adjusted effective prices for common strategies).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'submit_evaluation',
    description: 'Submit your final evaluation. Call this ONCE after retrieving all needed data and completing your analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        execution_cost_bps: { type: 'number' as const, description: 'Total execution cost in bps above mid-market' },
        exchange_fees_bps: { type: 'number' as const, description: 'Exchange/OTC fees in bps' },
        slippage_bps: { type: 'number' as const, description: 'Market impact and slippage in bps' },
        execution_cost_usd: { type: 'number' as const, description: 'Total dollar execution cost' },
        annual_holding_cost_usd: { type: 'number' as const, description: 'Net annual holding cost, negative if net yield' },
        cost_breakdown: {
          type: 'object' as const,
          properties: {
            exchange_fees_usd: { type: 'number' as const, description: 'Exchange and OTC trading fees' },
            slippage_usd: { type: 'number' as const, description: 'Market impact and slippage cost' },
            opportunity_cost_usd: { type: 'number' as const, description: 'Cost of locked capital at 3.5% risk-free rate' },
            funding_carry_usd: { type: 'number' as const, description: 'Net funding/carry costs. Negative means net income' },
            other_usd: { type: 'number' as const, description: 'Any other costs. 0 if none' },
          },
          required: ['exchange_fees_usd', 'slippage_usd', 'opportunity_cost_usd', 'funding_carry_usd', 'other_usd'] as const,
        },
        effective_price_per_btc: { type: 'number' as const, description: 'THE SCORE — must be between 60000 and 120000' },
        confidence: { type: 'number' as const, description: '0-1 confidence in estimate' },
        feedback: { type: 'string' as const, description: '3-5 sentence assessment. Break down cost components. NEVER suggest improvements.' },
        strategy_summary: { type: 'string' as const, description: '1 sentence summary' },
        instruments: { type: 'array' as const, items: { type: 'string' as const }, description: 'List of instruments used' },
        penalties: { type: 'array' as const, items: { type: 'string' as const }, description: 'Unrealistic assumptions penalized, empty if none' },
      },
      required: ['execution_cost_bps', 'exchange_fees_bps', 'slippage_bps', 'execution_cost_usd', 'annual_holding_cost_usd', 'cost_breakdown', 'effective_price_per_btc', 'confidence', 'feedback', 'strategy_summary', 'instruments', 'penalties'] as const,
    },
  },
];

const TOOL_DATA: Record<string, string> = {

  get_btc_prices: `BTC SPOT PRICES (Binance BTCUSDT, verified via API):

DAILY OHLCV:
| Date | Open | High | Low | Close | Volume (BTC) | Vol ($, est) |
| Mar 2 (Mon) | 65,776 | 70,096 | 65,259 | 68,830 | 32,010 | ~$2.18B |
| Mar 3 (Tue) | 68,830 | 69,258 | 66,158 | 68,338 | 24,972 | ~$1.70B |
| Mar 4 (Wed) | 68,338 | 74,050 | 67,400 | 72,667 | 44,919 | ~$3.19B |
| Mar 5 (Thu) | 72,667 | 73,558 | 70,645 | 70,891 | 26,591 | ~$1.91B |
| Mar 6 (Fri) | 70,891 | 71,420 | 67,745 | 68,114 | 22,630 | ~$1.56B |
| Mar 7 (Sat) | 68,114 | 68,551 | 66,915 | 67,263 | 12,720 | ~$0.86B |
| Mar 8 (Sun) | 67,263 | 68,200 | 65,618 | 65,971 | 21,594 | ~$1.45B |

Key observations:
- Week range: $65,259 (Mar 2 low) to $74,050 (Mar 4 high) — ~13.5% range
- Volatile but roughly flat: opened $65,776, closed $65,971 (+0.3%), with massive intraweek swing
- Mar 4 spike: Short squeeze to $74K driven by ETF inflows, gave it all back by Friday
- Weekend volume: ~57% of weekday levels. Mar 7 especially thin (12,720 BTC)
- Binance = ~25-30% of total market. Cross-exchange spot volume est. 3-4x larger
- Estimated total daily spot volume: ~$6-12B weekdays, ~$3-6B weekends

4-HOUR CANDLE DATA:
| # | Date/Time (UTC) | Open | High | Low | Close | Vol (BTC) | Vol ($M) |
| 1 | Mar 2, 00:00 | 65,776 | 67,079 | 65,761 | 66,820 | 2,941 | 195 |
| 2 | Mar 2, 04:00 | 66,820 | 66,996 | 65,543 | 66,008 | 3,610 | 240 |
| 3 | Mar 2, 08:00 | 66,008 | 66,721 | 65,655 | 66,360 | 4,362 | 289 |
| 4 | Mar 2, 12:00 | 66,360 | 69,618 | 65,259 | 69,130 | 10,832 | 730 |
| 5 | Mar 2, 16:00 | 69,130 | 70,096 | 68,576 | 68,967 | 6,828 | 473 |
| 6 | Mar 2, 20:00 | 68,967 | 69,540 | 68,585 | 68,830 | 3,438 | 238 |
| 7 | Mar 3, 00:00 | 68,830 | 69,258 | 68,211 | 68,378 | 2,362 | 162 |
| 8 | Mar 3, 04:00 | 68,378 | 68,617 | 67,800 | 68,173 | 3,337 | 227 |
| 9 | Mar 3, 08:00 | 68,173 | 68,312 | 66,340 | 67,027 | 6,083 | 408 |
| 10 | Mar 3, 12:00 | 67,027 | 67,973 | 66,158 | 67,726 | 5,443 | 365 |
| 11 | Mar 3, 16:00 | 67,726 | 68,999 | 67,473 | 68,435 | 5,485 | 375 |
| 12 | Mar 3, 20:00 | 68,435 | 68,860 | 67,832 | 68,338 | 2,262 | 155 |
| 13 | Mar 4, 00:00 | 68,338 | 68,909 | 67,400 | 67,732 | 3,815 | 260 |
| 14 | Mar 4, 04:00 | 67,732 | 69,668 | 67,468 | 69,493 | 5,089 | 348 |
| 15 | Mar 4, 08:00 | 69,493 | 71,893 | 69,099 | 71,111 | 12,146 | 860 |
| 16 | Mar 4, 12:00 | 71,111 | 73,480 | 70,588 | 73,397 | 11,378 | 819 |
| 17 | Mar 4, 16:00 | 73,397 | 74,050 | 72,542 | 73,611 | 8,665 | 636 |
| 18 | Mar 4, 20:00 | 73,612 | 73,716 | 72,313 | 72,667 | 3,826 | 279 |
| 19 | Mar 5, 00:00 | 72,667 | 73,307 | 72,337 | 72,498 | 3,123 | 227 |
| 20 | Mar 5, 04:00 | 72,498 | 73,081 | 71,760 | 72,056 | 4,346 | 315 |
| 21 | Mar 5, 08:00 | 72,056 | 73,558 | 71,757 | 72,916 | 6,262 | 456 |
| 22 | Mar 5, 12:00 | 72,916 | 73,063 | 71,169 | 71,653 | 5,608 | 405 |
| 23 | Mar 5, 16:00 | 71,653 | 71,655 | 70,645 | 70,918 | 4,307 | 306 |
| 24 | Mar 5, 20:00 | 70,918 | 71,572 | 70,777 | 70,891 | 2,945 | 210 |
| 25 | Mar 6, 00:00 | 70,891 | 71,420 | 70,344 | 71,080 | 3,032 | 215 |
| 26 | Mar 6, 04:00 | 71,080 | 71,193 | 70,143 | 71,056 | 3,088 | 218 |
| 27 | Mar 6, 08:00 | 71,056 | 71,068 | 70,184 | 70,213 | 2,441 | 172 |
| 28 | Mar 6, 12:00 | 70,213 | 70,342 | 68,176 | 68,505 | 8,554 | 593 |
| 29 | Mar 6, 16:00 | 68,505 | 68,795 | 67,745 | 68,132 | 3,324 | 227 |
| 30 | Mar 6, 20:00 | 68,132 | 68,441 | 67,777 | 68,114 | 2,190 | 149 |
| 31 | Mar 7, 00:00 | 68,114 | 68,551 | 68,061 | 68,096 | 1,737 | 119 |
| 32 | Mar 7, 04:00 | 68,096 | 68,148 | 67,446 | 67,843 | 2,374 | 161 |
| 33 | Mar 7, 08:00 | 67,843 | 68,232 | 67,721 | 68,010 | 1,490 | 101 |
| 34 | Mar 7, 12:00 | 68,010 | 68,085 | 67,609 | 67,877 | 1,728 | 117 |
| 35 | Mar 7, 16:00 | 67,877 | 67,935 | 66,915 | 67,080 | 3,059 | 207 |
| 36 | Mar 7, 20:00 | 67,080 | 67,483 | 67,068 | 67,263 | 2,331 | 157 |
| 37 | Mar 8, 00:00 | 67,263 | 67,482 | 66,834 | 67,000 | 2,883 | 194 |
| 38 | Mar 8, 04:00 | 67,000 | 67,465 | 66,547 | 67,320 | 2,866 | 192 |
| 39 | Mar 8, 08:00 | 67,320 | 68,200 | 67,157 | 67,515 | 3,303 | 223 |
| 40 | Mar 8, 12:00 | 67,515 | 67,651 | 66,762 | 67,218 | 4,464 | 300 |
| 41 | Mar 8, 16:00 | 67,218 | 67,485 | 66,746 | 67,337 | 2,550 | 171 |
| 42 | Mar 8, 20:00 | 67,337 | 67,609 | 65,618 | 65,971 | 5,526 | 368 |

4h highlights:
- Highest-volume candle: Mar 4 08:00 (12,146 BTC / $860M) — EU session short squeeze
- Mar 4 squeeze: Three candles (08:00-20:00) pushed $69,493 to $74,050, 32,189 BTC / $2.32B
- Mar 6 selloff: 12:00 UTC ($70,213 to $68,505) — NFP + Trump double shock, 8,554 BTC
- Mar 8 cascade: 20:00 UTC ($67,337 to $65,618 low) — weekend liquidation, 5,526 BTC
- Thinnest candle: Mar 7 08:00 (1,490 BTC / $101M) — Saturday morning

VWAP ESTIMATE:
- Volume-weighted (Binance OHLC4 x vol): ~$69,150/BTC
- Simple daily TWAP: ~$68,900/BTC
- Saylor's $70,946 was ~$1,800 above VWAP (~260bps), suggesting market impact and/or concentration during Mar 4-5 highs

SESSION VOLUME DISTRIBUTION:
| Session | Hours (UTC) | ~Volume Share | Character |
| US extended | 13:00-01:00 | ~45-50% | Deepest institutional liquidity; ETF, CME, OTC |
| US core | 14:30-21:00 | ~35-40% | ETF creation/redemption, CME basis |
| Asia | 23:00-07:00 | ~28-30% | Retail-heavy, net selling during reversals |
| Europe | 07:00-15:00 | ~22-25% | Moderate institutional, good depth at overlap |
| EU-US overlap | 14:30-15:00 | Highest single-hour | 42% more depth than off-peak |
Weekend: no ETFs, no CME, no institutional OTC. Volume ~57% of weekday.

PER-EXCHANGE SPOT VOLUME (March 2026, estimated):
| Exchange | Daily BTC Volume | Notes |
| Binance | ~$13.6-15.0B | 38-42% global spot share |
| Bybit | ~$3.4B | |
| OKX | ~$1.1B | |
| Coinbase | ~$0.9-1.0B | BTC ~34% of total volume |
| Kraken | ~$0.5-0.7B | Deep fiat order books |
Combined top-5 ~$20B/day weekdays. $1.28B over 5 weekdays = ~$256M/day = ~1.3% of daily volume — manageable if distributed.`,

  get_funding_rates: `PERPETUAL SWAP FUNDING RATES (March 2-8, 2026):

BINANCE BTCUSDT (04:00/12:00/20:00 UTC settlements):
| Date/Time (UTC) | Funding Rate |
| Mar 2, 12:00 PM | -0.000299% |
| Mar 2, 8:00 PM | -0.001956% |
| Mar 3, 4:00 AM | -0.001083% |
| Mar 3, 12:00 PM | -0.000186% |
| Mar 3, 8:00 PM | +0.001437% |
| Mar 4, 4:00 AM | +0.001481% |
| Mar 4, 12:00 PM | -0.005390% |
| Mar 4, 8:00 PM | +0.002520% |
| Mar 5, 4:00 AM | +0.004683% |
| Mar 5, 12:00 PM | +0.003567% |
| Mar 5, 8:00 PM | +0.004965% |
| Mar 6, 4:00 AM | +0.000174% |
| Mar 6, 12:00 PM | +0.001689% |
| Mar 6, 8:00 PM | -0.003061% |
| Mar 7, 4:00 AM | -0.002176% |
| Mar 7, 12:00 PM | +0.000619% |
| Mar 7, 8:00 PM | +0.003525% |
| Mar 8, 4:00 AM | -0.004217% |
| Mar 8, 12:00 PM | -0.004496% |
| Mar 8, 8:00 PM | -0.001115% |

PHASE BREAKDOWN (more useful than weekly average):
- Mon-Wed morning (bearish phase): avg -0.000857%/8h (~-0.94% ann.) — shorts paying longs
- Wed afternoon-Thu (rally phase): avg +0.003934%/8h (~+4.31% ann.) — longs paying shorts during squeeze to $74K
- Fri-Sun (selloff phase): avg -0.001006%/8h (~-1.10% ann.) — back to shorts paying longs
Full-week average: +0.000034%/8h (~+0.04% ann.) — essentially flat, but masks dramatic intraweek swings.

BYBIT BTCUSDT (00:00/08:00/16:00 UTC):
| Date/Time (UTC) | Funding Rate |
| Mar 2, 00:00 | +0.0013% |
| Mar 2, 08:00 | +0.0030% |
| Mar 2, 16:00 | +0.0027% |
| Mar 3, 00:00 | +0.0018% |
| Mar 3, 08:00 | +0.0012% |
| Mar 3, 16:00 | +0.0007% |
| Mar 4, 00:00 | +0.0022% |
| Mar 4, 08:00 | -0.0005% |
| Mar 4, 16:00 | +0.0035% |
| Mar 5, 00:00 | -0.0054% |
| Mar 5, 08:00 | -0.0041% |
| Mar 5, 16:00 | -0.0047% |
| Mar 6, 00:00 | -0.0006% |
| Mar 6, 08:00 | +0.0002% |
| Mar 6, 16:00 | -0.0004% |
| Mar 7, 00:00 | -0.0059% |
| Mar 7, 08:00 | -0.0030% |
Bybit weekly: avg -0.0005%/period, cumulative -0.0079% (~-0.51% ann.). Net: shorts paying longs.

OKX BTC-USDT-SWAP (00:00/08:00/16:00 UTC):
| Date/Time (UTC) | Funding Rate |
| Mar 2, 00:00 | -0.0014% |
| Mar 2, 08:00 | +0.0034% |
| Mar 2, 16:00 | -0.0008% |
| Mar 3, 00:00 | -0.0040% |
| Mar 3, 08:00 | +0.0044% |
| Mar 3, 16:00 | +0.0017% |
| Mar 4, 00:00 | -0.0037% |
| Mar 4, 08:00 | -0.0026% |
| Mar 4, 16:00 | +0.0054% |
| Mar 5, 00:00 | +0.0053% |
| Mar 5, 08:00 | +0.0100% (hit cap) |
| Mar 5, 16:00 | +0.0059% |
| Mar 6, 00:00 | +0.0036% |
| Mar 6, 08:00 | +0.0068% |
| Mar 6, 16:00 | -0.0004% |
| Mar 7, 00:00 | -0.0001% |
OKX weekly: avg +0.0021%/period, cumulative +0.0336% (~+2.30% ann.). Net: longs paying shorts.

CROSS-EXCHANGE SUMMARY:
| Exchange | Avg Rate/Period | Annualized | Bias |
| Binance | +0.000034% | ~+0.04% | Flat |
| Bybit | -0.0005% | ~-0.51% | Shorts pay longs |
| OKX | +0.0021% | ~+2.30% | Longs pay shorts |

KEY INSIGHT: Significant cross-exchange divergence. Bybit persistently bearish, OKX bullish (hit 0.01% cap). Creates delta-neutral funding arbitrage: long on Bybit (collect) + short on OKX (collect from other side). Spread exceeded 0.01%/interval during Mar 5-6.

REALITY CHECK: A $1.28B directional long entry would significantly push funding rates positive. Observed negative rates would NOT persist. Partial-perp strategies (20-30% of delta) would face more modest funding pressure.`,

  get_derivatives_markets: `DERIVATIVES MARKETS (March 2-8, 2026):

CME BTC FUTURES:
- Available weekdays only (Mar 2-6). CLOSED Saturday-Sunday.
- Contracts: Front-month March (BTCH6, 5 BTC/contract), April, June quarterly. Micro BTC (0.1 BTC) also available.

Daily Settlements (CBOE FBT proxy, 0.02% median divergence from CME):
| Date | FBT/H6 (Mar) | FBT/J6 (Apr) | FBT/M6 (Jun) | Binance Spot Close | Basis (Mar vs Spot) |
| Mon, Mar 2 | $69,486 | $69,765 | $70,691 | $68,830 | +0.95% |
| Tue, Mar 3 | $68,463 | $68,708 | $69,792 | $68,338 | +0.18% |
| Wed, Mar 4 | $73,451 | $73,742 | $74,667 | $72,667 | +1.08% |
| Thu, Mar 5 | $71,522 | $71,787 | $72,798 | $70,891 | +0.89% |
| Fri, Mar 6 | $68,286 | $68,537 | $69,674 | $68,114 | +0.25% |

BACKWARDATION: CME futures traded BELOW spot for extended periods — extremely unusual.
- Backwardation began Nov 19, 2025. Deepest: -2.35% ann. on Dec 3, 2025 (deepest since FTX collapse)
- CME Micro BTC weekly avg: $69,140 vs Binance weekday avg $69,768 = ~-0.9% raw discount
- Basis WIDENED as selloff accelerated: by Friday, ~$67,705 futures vs $69,880 spot = ~-3.1% raw
- Implication: Long futures at meaningful discount to spot. $1.28B CME position saves ~$12-40M vs spot depending on timing.
- Term structure: April +~$250-290 over March, June +~$1,200-1,400 (~7-8% ann carry for back months)

CME volume: ~7,070 contracts/day (standard BTC). Total OI: ~16,680 contracts (~$5.8B notional).
CFTC COT (Mar 3): Leveraged funds held 16,102 net SHORT contracts — HIGHEST since CME BTC launch in 2017. ~$8B shorts vs <$200M longs (40:1 ratio). Many are basis trade short legs.
Margin: Maintenance ~37% (~$129,500/standard contract at $70K), initial ~40.7% (~$142,450).

PERPETUAL SWAPS:
- 24/7 on Binance, Bybit, OKX. Combined daily volume: ~$20-40B weekdays, ~$12-25B weekends.
- Total BTC futures OI fell from ~$37.7B (Jan) to $18.4B (Feb 24), climbed to ~$50B mid-week during Mar 4 squeeze, then collapsed to 15-month low by Mar 8-9.

Daily Perp OI:
| Date | Binance (BTC) | Binance ($B) | Bybit (BTC) | OKX ($B) | Aggregate ($B) |
| Mar 2 | 77,833 | $5.12 | 43,612 | $2.89 | ~$11.97 |
| Mar 3 | 82,467 | $5.56 | 46,218 | $3.05 | ~$12.25 |
| Mar 4 | 85,912 | $6.18 | 48,405 | $3.15 | ~$12.23 |
| Mar 5 | 91,428 | $6.64 | 51,030 | $3.29 | ~$12.54 |
| Mar 6 | 87,155 | $5.93 | 49,112 | $3.12 | ~$12.47 |
| Mar 7 | 85,340 | $5.74 | 47,890 | $3.08 | ~$12.60 |
| Mar 8 | 78,422 | $5.17 | 44,215 | $2.91 | ~$11.97 |
Cross-exchange long/short ratios entering week: near equilibrium (~50/50).

BTC OPTIONS (Deribit, ~90% of global volume):
- Aggregate OI: ~$65B (exceeded futures OI since July 2025)
- Deribit-specific OI: ~$26B
- DVOL (30-day IV): range 53.63-60.89 during Mar 1-8. Peak: 60.89 on Mar 7. At 60 DVOL = ~3.0% expected daily move.
- 25-delta skew: ~-5% (puts more expensive than calls). Had been -19.34 on Feb 5 (strongest put pref in 3+ years), improved to -5% by early March.
- Put-call ratio by OI: ~0.48-0.53 (~2 calls per 1 put). But put/call PREMIUM ratio: 10.43x — puts individually much more expensive.
- Volatility term structure: INVERTED (short-dated vol > longer-dated).

Actual Deribit Put Premiums (Mar 27 expiry, BTC ~$69K):
| Strike | % OTM | USD Premium | Bid/Ask (BTC) | Open Interest |
| $55,000 | 20.3% | ~$387 | 0.0050/0.0060 | 1,619 |
| $60,000 | 13.0% | ~$763 | 0.0105/0.0115 | 9,124 (most liquid) |
| $65,000 | 5.8% | ~$5,816 | 0.0830/0.0850 | 1,377 |
| $70,000 (ATM) | ~0% | ~$3,644 | 0.0525/0.0530 | 3,940 |

$60K put as % of spot: 1.11% (~21.5% ann). $55K put: 0.56% (~10.9% ann).
$60K strike OI: $1.50B — institutional hedging level. Dealer gamma: SHORT below $60K (amplifies moves).
Mar 6 expiry: $2.2B BTC options expired, 32,000 contracts. Max pain: $69,000. Put/call ratio 1.70.
IBIT options: 52% of total BTC options OI (all-time high). Weekly expirations Mar 4 and Mar 6. NOT available weekends.
Options spreads: 200-500bps for institutional size ($50M+).`,

  get_etf_data: `BTC ETF DATA (March 2-6, 2026 — CLOSED weekends):

DAILY FLOWS:
| Date | Net Flow | Key Per-Fund Flows |
| Mon, Mar 2 | +$458.2M | IBIT +$263.2M, FBTC +$94.8M, BITB +$36.4M |
| Tue, Mar 3 | +$225.2M | IBIT +$322.4M, FBTC -$89.3M, GBTC -$28.2M |
| Wed, Mar 4 | +$461.8M | IBIT +$306.6M, GBTC +$54.1M, FBTC +$48.0M |
| Thu, Mar 5 | -$227.8M | IBIT -$88.7M, FBTC -$48.0M, BITB -$46.4M |
| Fri, Mar 6 | -$348.8M | FBTC -$158.5M, IBIT -$143.5M |

Weekly net: ~+$568M — broke a 5-week, $4B cumulative outflow streak.
Total US spot BTC ETF AUM: ~$87B holding ~1,278,659 BTC.

TOP ETF HOLDINGS:
| Fund | BTC Holdings |
| IBIT | 768,241 ($51.8B) |
| FBTC | 189,146 |
| GBTC | 156,846 |
| BITB | 39,621 |
| ARKB | 35,792 |

ETF daily trading volume: ~$3-6B. IBIT avg daily volume: ~80M shares.
IBIT traded at -0.52% discount to NAV on Mar 4 (unusual — usually at premium).

CREATION/REDEMPTION MECHANICS:
- In-kind creation/redemption approved Jul 29, 2025 — APs deliver BTC directly
- IBIT creation unit: 40,000 shares per basket
- 9 Authorized Participants for IBIT: Jane Street, Virtu, JP Morgan, Macquarie, Goldman, Citadel, Citi, UBS, ABN AMRO
- IBIT median bid-ask spread: 0.02% in normal conditions
- No daily creation cap — practical constraint is AP sourcing capacity
- Share settlement: T+1

BASIS TRADE CONTEXT:
- Estimated 20-35% of BTC ETF capital is basis trade (non-directional): long ETF / short CME futures
- CME leveraged funds: 15,399 short contracts vs 3,003 longs
- When basis fell below 5%, unwinds triggered outflows
- Hedge fund BTC ETF allocations fell 28% from Q3 to Q4 2025
- YTD 2026: ETFs have seen ~$4.49B in outflows overall

IMPLICATION FOR STRATEGIES: ETFs offer 5-15bps execution cost but weekdays only and limited daily capacity (~$200-500M realistic). APs must source underlying BTC, creating pass-through market impact. Much of the week's inflow was basis trade ("phantom demand").`,

  get_trading_costs: `TRADING FEES & COSTS:

EXCHANGE FEES (Institutional/VIP Tiers):
| Exchange | Maker | Taker | Notes |
| Binance VIP 7+ | 0.01% | 0.03% | Requires $250M+ 30d volume |
| Coinbase Inst. | 0.00% | 0.05% | Via Coinbase Prime |
| Kraken Pro | 0.01% | 0.02% | High-volume tier; gained Fedwire access Mar 4 |
| OKX VIP 5+ | 0.02% | 0.04% | |
| Bybit VIP 3+ | 0.01% | 0.03% | |
| CME | ~$1-2/contract | | ~$5/BTC equivalent |

OTC MARKET:
Major desks: Cumberland (DRW), Galaxy Digital, Wintermute, B2C2, Jump Trading, FalconX
Exchange-integrated: Coinbase Prime (~$14B OTC flows), Binance OTC, OKX OTC, Kraken OTC
Wintermute record: $2.24B single-day OTC volume; launched zero-fee "Wintermute Node" platform

OTC SPREADS BY SIZE:
| Block Size | Spread |
| $50-100M | ~20-35bps |
| $200-500M | ~35-60bps |
| $500M+ | ~50-80bps (desks will hedge and widen) |
$1.28B total via OTC: split across multiple desks over multiple days.
OTC advantages: minimal market signal, no order book disruption.
OTC disadvantages: counterparty risk, settlement timing, wider spreads at size.

MARKET IMPACT MODEL (Square-Root):
Formula: I(Q) = Y x sigma x sqrt(Q/V)
- sigma = daily volatility (~3.0% from DVOL 55-65%)
- Y = 0.9 (BTC-calibrated from 1M+ metaorders)
- V = total market daily volume
- Post-execution reversion: ~2/3 of peak impact persists

Applied to $1.28B:
| Scenario | Calculation | Impact |
| 7-day spread ($183M/day, V=$8B) | 0.9 x 3.0% x sqrt(183M/8B) | ~41bps/day, cumulative 41-72bps |
| 1-day concentrated (V=$8B) | 0.9 x 3.0% x sqrt(1.28B/8B) | ~108bps |
| Weekend day ($183M, V=$4B) | 0.9 x 3.0% x sqrt(183M/4B) | ~58bps/day |

Empirical validation (Amberdata, Binance):
| Order Size | Measured Impact |
| $1M | 5.2 bps |
| $5M | 25-30 bps |
| $10M | 50+ bps |
| >$10M | Must be worked over hours/days |
Institutional slippage: -25 to -50 bps typical. Naive 150 BTC market order: 200 bps.

OPTIMAL EXECUTION WINDOWS:
- Best: 10:00-16:00 UTC (EU + early US overlap) — deepest books, 42% more liquidity
- Second best: 14:30-20:00 UTC (US core) — deep institutional flow
- Worst: 21:00-07:00 UTC (late US + overnight) — 42% less depth, ~67% higher slippage
- Weekend: no CME/ETF arbitrage; volume ~57% of weekday

ORDER BOOK DEPTH (post-Oct 2025 "hollow liquidity"):
- BTC aggregated 2% depth fell ~30% from 2025 high
- Binance BTC 1% depth: >$600M at ATH, dropped to <$400M by March 2026
- Cross-venue aggregate at 1% from mid: $14M (down from $20M, -33%)
- Assessment: "deliberate reduction in market-making commitment" — structural, not temporary

STRESS AMPLIFICATION FOR MARCH 2026:
- Volatility ~2x elevated -> impact ~2x
- Volume ~30% below late-2025 -> sqrt(1/0.7) = 1.20x
- Combined: ~2.4x amplification vs normal conditions, plus 33% depth reduction
- The impact estimates above are defensible and if anything conservative for concentrated execution.

SAYLOR'S ACTUAL RESULT:
$70,946 avg = ~$1,800 above VWAP ($69,150) = ~260bps slippage. Consistent with buying concentrated during Mar 4-5 highs, information leakage (STRC volume surged, analysts tracked purchases), and 2.4x stress amplification.`,

  get_market_narrative: `MARKET NARRATIVE (March 2-8, 2026):

GEOPOLITICAL:
- Iran-US war escalation: "Operation Epic Fury" (Feb 28) — joint US-Israeli strikes. Supreme Leader Khamenei killed Feb 28.
- Iran retaliated: 500+ ballistic missiles and ~2,000 drones by Mar 5. Targets included Camp Buehring (Kuwait, 6 US KIA Mar 1), Al Udeid (Qatar, Mar 4).
- IRGC closed Strait of Hormuz Mar 2 (tanker traffic fell to 8% of normal, ~20M bpd disrupted = ~20% of global oil supply).
- Trump on Mar 6 morning: "No deal with Iran except UNCONDITIONAL SURRENDER!" — Dow dropped 900+ pts.

OIL SHOCK:
| Date | WTI Close | Change |
| Prior Fri (Feb 27) | ~$67 | |
| Mon, Mar 2 | $71.23 | +6.3% |
| Tue, Mar 3 | $74.56 | +4.7% |
| Wed, Mar 4 | $74.66 | flat |
| Thu, Mar 5 | $81.01 | +8.5% |
| Fri, Mar 6 | $90.90 | +12.2% |
| Sun, Mar 8 | $101.56 | (weekend) |
| Mon, Mar 9 | $94.77 | (intraday $81-$119, $38 swing) |
Weekly WTI: +35.6% — biggest weekly gain since NYMEX started in 1983. "Biggest oil supply disruption in history."

MACRO:
- Trump 15% global tariffs announced
- Feb NFP: -92,000 jobs (vs +50K expected). Unemployment 4.4%. Stagflation fears.
- Fed: 96% probability of hold. Funds rate 3.64% (target 3.50-3.75%).
- 10Y Treasury rose +10bps (4.05% to 4.15%). No flight-to-safety — yields ROSE despite war (oil inflation expectations).

EQUITIES:
- S&P 500: -2.1% weekly. Dow -2.9% (worst since Oct 2025). Nasdaq -1.6%.
- VIX: 21.44 Mon -> 29.49 Fri (+37.5% weekly). Hit 31.77 on Mar 9.
- DXY: rose to 99.68 (+1.8-2.2% weekly) — 2026 high. "War-Petrodollar trade."

Mar 8 SUNDAY EQUITY FUTURES COLLAPSE (visible to crypto traders in real-time):
| Time (ET) | S&P Futures | Dow Futures | Oil |
| ~6:00 PM | -1.5% | ~-600 pts | surging past $100 |
| 8:00 PM | -1.7% | | +18% |
| 10:04 PM | -2.25% | -2.3% (~-1,093 pts) | |
| 10:44 PM | | | +30.6% ($119/bbl) |
Oil VIX exceeded 100 (pandemic-level). Mon Mar 9: Dow opened -800 pts, then reversed to close +239 pts after Trump signaled war "could be over soon."

CRYPTO-SPECIFIC:
- BTC Fear & Greed: 38 consecutive days in Extreme Fear. Readings: Mar 3: 14, Mar 5: 10 (cycle low), Mar 8: 12.
- BTC dominance: rose from ~56% to ~59% (+3pp flight-to-quality within crypto).
- BTC-S&P correlation: 0.74 (2026 high). BTC traded as risk asset, NOT safe haven.
- BTC-oil: acutely negative — oil spikes sent BTC sharply lower.
- BTC-gold correlation: reached zero. Gold and BTC "driven by different forces."
- BTC ~47% below ATH of ~$126K (Oct 2025).
- ~62% of Polymarket users expected BTC below $50K in 2026.
- Stablecoins stable: no de-peg events. USDT $184B, USDC $77B.

MARCH 8 LIQUIDATION CASCADE:
- $364.4M total in 24h (94,058 traders). BTC: $156.67M, ETH: $70.88M.
- Longs: $215M / Shorts: $149M (59/41 split).
- Largest single: $6.88M BTC-USD on Hyperliquid.
- $40M in oil-linked crypto liquidations on Hyperliquid.
- BTC broke $68K -> $65,618 low (testing $65,000 support cluster).
- Coin-margined OI at ~680-687K BTC created doom-loop: collateral value dropped with price.
- CME/ETFs CLOSED — no institutional arbitrage to absorb selling.
- Kraken had 18h warning status (WebSocket connectivity issues).

ON-CHAIN SIGNALS:
- Coinbase Premium: flipped positive Mar 3-4 (first time in 40 days), peaked +0.0227% Mar 5, negative again Mar 6-8.
- LTH selling collapsed 87% (from -243K BTC to -32K BTC).
- STH sent 27,000 BTC ($1.86B) to exchanges on Mar 6 (highest profit-taking since Jan 14).
- Whale wallets (100+ BTC) accumulated 270,000 BTC over prior 30 days — largest in 13+ years.
- Exchange reserves: 8-year low (2.31M BTC, lowest since April 2018).
- Stablecoin exchange inflows surged: $1.14B (Mar 1) to $5.14B (Mar 5). Circle minted $3B+ USDC in first week of March.
- Mining cost: ~$70K/BTC direct energy, $87-100K all-in. Miner selling dropped 82% from peak.
- Weekly RSI: 27.48 — lowest since December 2018.

INSTITUTIONAL EVENTS (during this week):
- BlackRock HLEND limited withdrawals (redemptions hit 9.3% cap)
- Morgan Stanley filed for Bitcoin Trust ETF (BNY Mellon as custodian)
- Kraken Financial received first crypto Federal Reserve master account (direct Fedwire access)
- ICE (NYSE parent) invested in OKX at $25B valuation`,

  get_altcoin_proxy_data: `ALT-COIN PROXY DATA (for evaluating strategies using ETH, SOL, or XRP):

DAILY OHLC PRICES (March 2-8, 2026):

ETH/USD:
| Date | Open | High | Low | Close | Volume |
| Mar 2 | $1,939 | $2,077 | $1,924 | $2,027 | $19.8B |
| Mar 3 | $2,028 | $2,037 | $1,937 | $1,983 | $17.7B |
| Mar 4 | $2,028 | $2,193 | $1,947 | $2,125 | $25.0B |
| Mar 5 | $2,127 | $2,158 | $2,059 | $2,073 | $18.0B |
| Mar 6 | $2,073 | $2,092 | $1,958 | $1,980 | $14.3B |
| Mar 7 | $1,979 | $1,983 | $1,970 | $1,970 | $7.4B |
| Mar 8 | $1,970 | $1,977 | $1,921 | $1,939 | $12.3B |

SOL/USD:
| Date | Open | High | Low | Close | Volume |
| Mar 2 | $83.64 | $89.90 | $82.50 | $86.64 | $3.6B |
| Mar 3 | $86.72 | $87.35 | $82.82 | $87.05 | $3.3B |
| Mar 4 | $86.96 | $93.78 | $84.90 | $90.84 | $4.7B |
| Mar 5 | $90.97 | $92.76 | $88.08 | $88.68 | $2.9B |
| Mar 6 | $88.80 | $89.24 | $83.78 | $84.68 | $2.4B |
| Mar 7 | $84.58 | $84.96 | $83.17 | $83.18 | $1.2B |
| Mar 8 | $83.36 | $83.95 | $80.65 | $81.65 | $1.6B |

XRP/USD:
| Date | Open | High | Low | Close | Volume |
| Mar 2 | $1.35 | $1.42 | $1.34 | $1.39 | $2.5B |
| Mar 3 | $1.39 | $1.39 | $1.34 | $1.36 | $2.1B |
| Mar 4 | $1.36 | $1.47 | $1.35 | $1.43 | $3.3B |
| Mar 5 | $1.43 | $1.45 | $1.40 | $1.40 | $2.0B |
| Mar 6 | $1.40 | $1.41 | $1.35 | $1.36 | $1.8B |
| Mar 7 | $1.36 | $1.37 | $1.36 | $1.36 | $0.9B |
| Mar 8 | $1.36 | $1.37 | $1.33 | $1.34 | $1.3B |

WEEKLY RETURNS:
| Coin | Open (Mar 2) | Close (Mar 8) | Weekly Return |
| ETH | $1,939 | $1,939 | ~0% (flat) |
| SOL | $83.64 | $81.65 | -2.4% |
| XRP | $1.35 | $1.34 | -0.7% |
| BTC | $65,776 | $65,971 | +0.3% |
All peaked on March 4 then sold off into weekend.

CORRELATIONS TO BTC:
Long-term (6-12 month) correlations — USE THESE for scoring proxy strategies:
| Pair | 6-12mo Correlation | Beta to BTC | Notes |
| BTC-ETH | 0.85-0.90 | ~1.3-1.5x | Most reliable proxy; deep liquidity |
| BTC-SOL | 0.80-0.90 | ~1.5-2.0x | High beta proxy; amplifies moves |
| BTC-XRP | 0.70-0.80 | ~0.8-1.0x | Weakest proxy; idiosyncratic risk |

March 2-8 realized correlations (for reference only, NOT for scoring — strategy is proposed ex-ante):
| Pair | Week Correlation | Notes |
| BTC-SOL | 0.99 (record) | Elevated by geopolitical uncertainty |
| BTC-ETH | 0.89 | |
| BTC-XRP | 0.86 | |

TRACKING ERROR FOR 7-DAY WINDOW:
| Coin | Week Return | vs BTC (+0.3%) | Dollar Impact on $1.28B |
| ETH | ~0% | -0.3% underperformance | ~$3.8M tracking loss |
| SOL | -2.4% | -2.7% underperformance | ~$34.6M tracking loss |
| XRP | -0.7% | -1.0% underperformance | ~$12.8M tracking loss |
All underperformed BTC. ETH was best proxy. BTC dominance rose ~3pp (flight-to-quality).

REQUIRED SIZING FOR BTC DELTA VIA ALT PROXY:
Formula: Required Altcoin Notional = Target BTC Delta / (Correlation x Beta)
| Coin | Correlation | Beta | Required Notional | vs Daily Volume |
| ETH | 0.89 | 1.4 | ~$1.03B | ETH ~$10.6B/day — manageable |
| SOL | 0.99 | 1.75 | ~$0.74B | SOL ~$2-4B/day — moderate impact |
| XRP | 0.86 | 0.9 | ~$1.65B | XRP at record-low liquidity — very high impact |

LIQUIDITY CONSTRAINTS:
- XRP liquidity at or near record lows
- SOL OI: $4.33B; XRP OI: $2.21B; ETH OI: $22.95B (deepest alt derivative market)
- $1.28B alt-proxy = much larger % of daily alt volume than of BTC volume
- ETH perp funding Mar 8: -0.0088%/8h; SOL perps: -0.0169%/8h (2x more negative); XRP: -0.0137%

EVALUATION GUIDELINES FOR ALT PROXIES:
- Credit lower BTC market impact (not directly competing with BTC buyers)
- Credit access to different liquidity pools
- Add tracking error as execution cost (not a dealbreaker for ETH at ~$3.8M)
- Score based on BTC delta actually achieved, not alt notional
- The real constraint is market impact on the ALT, not basis risk`,

  get_yields_and_scoring: `YIELDS & COST OF CAPITAL:

RISK-FREE RATE (Treasury.gov):
- Fed funds effective: 3.64% (target 3.50-3.75%)
- 4-week T-bill: 3.70% coupon equivalent
- 13-week T-bill: 3.68% coupon equivalent
- 2-year: 3.56%, 10-year: 4.15%, 30-year: 4.77%
- Using 3.5% is slightly conservative but reasonable (floor of current range)

DEFI LENDING RATES (Aave V3):
| Asset | Supply APY | Borrow APY |
| WBTC | <0.01% | 0.33% |
| USDC | 2.33% | 3.80% |
| USDT | ~2-3% | ~3.5-4.5% |

CEFI LENDING:
- Nexo: up to ~5% BTC yield; up to 16% stablecoin (Platinum)
- Ledn: up to 5.25% BTC; up to 8% USDC
- $39B in BTC-backed institutional credit lines outstanding

OPPORTUNITY COST:
- $1.28B fully in spot BTC: $44.8M/year (3.5% x $1.28B)
- Capital in T-bills while using derivatives: earns ~3.5-3.7% on uninvested portion
- Key tradeoff: spot = clean delta but locks capital; derivatives = free capital but have carry costs

CARRY COSTS:
- Perp funding (this week): net ~flat, but negative during bearish phases when buyer would accumulate
- CME futures: BACKWARDATION — carry was FAVORABLE for longs (saves $12-40M vs spot)
- Options theta: ~15-30% annualized for ATM 3-month
- Margin interest: ~8-12% on crypto exchanges
- DeFi WBTC borrow: 0.33% (negligible)

SCORING REFERENCE POINTS (all hurdle-adjusted at 3.5%):
| Strategy | Raw Execution Price | Hurdle-Adjusted Effective Price | vs Saylor |
| Perfect hindsight (buy all at Mar 2 low $65,259) | ~$65,259 | ~$67,500 | -$5,900 |
| Even TWAP 7 days (no impact) | ~$68,900 | ~$71,300 | -$2,100 |
| Even TWAP + realistic impact (60bps) | ~$69,300 | ~$71,700 | -$1,700 |
| Saylor's actual execution | $70,946 | $73,429 | baseline |
| Naive spot buy on Mar 4 high | ~$74,050 | ~$76,600+ | +$3,200 |
| Pure perp (no capital freed) | ~$72,000 | ~$74,500 | +$1,100 |
| Hybrid OTC + futures + T-bills | ~$68,600-70,500 | ~$71,000-73,000 | -$400 to -$2,400 |

DERIVATION NOTES:
- VWAP: ~$69,150 (vol-weighted), ~$68,900 (simple TWAP)
- "Pure perp" assumes ~410bps total impact from aggressive directional flow
- "Hybrid OTC + futures + T-bills" assumes 30-60bps impact + capital efficiency + CME backwardation discount
- Saylor's ~260bps above VWAP: concentrated during Mar 4-5 highs + information leakage + 2.4x stress amplification`,

};

export function getToolResult(toolName: string): string {
  return TOOL_DATA[toolName] || 'Unknown tool. Available: ' + Object.keys(TOOL_DATA).join(', ');
}
