# Slide 1: Title
## DeFi Needs a CEX?!?
### why we're here
# Slide 2: Orderflow Execution Demo
Video showing the following:
1. Sell INTC on schwab
2. Onramp to coinbase
3. Buy some ETH (for gas)
4. Buy some SOL (for gas)
5. Withdraw ETH to arbitrum
6. Withdraw SOL to solana
7. Withdraw USDC to arbitrum 
8. Withdraw USDC to solana
9. Deposit USDC to hyperliquid
10. Deposit USDC to Solana
11. Buy popcat on solana via jup ag
12. Buy popcat perps on hyperliquid (max leverage)

# Slide 3: Recap of why that sucked
- time cost
- markout on execution

# Slide 4: This isn't a UX problem it's a markets problem
Liquidity fragmentation is the root issue here, it exists in all markets (only 30% of trades of NASDAQ listed equities occur on the NASDAQ). It just looks more like a UX problem in crypto because we're a younger industry and permissionless finance allows anyone to go and execute in the places their broker would normally execute. 

Liquidity fragmentation will just become a larger problem as finance becomes more permissionless allowing anyone to participate or launch a liquidity venue. Look at the number of equity issuers and liquidity venues that exist just in the crypto space.

Bottom line - Optimal trade execution is HARD - and the solution isn't just "use a sophisticated broker or OTC provider" as different sophisticated parties specialize in different execution strategies. Some might have token deals that make them really good at certain assets. Some might have partnerships on exchanges which mke them uniquiely well suited to execute against liquidity on that exchange. Some might control 30% of Solana stake making them the best at executing against solana liquidity. Some might have Private Orderflow on Ethereum which gives them an advantage at executing and inclusion on ethereum. Some might sell vol cheap because they're buying covered calls otc from foundations

The bottom line is people will ALWAYS specialize in different venues - and you will ALWAYS want to be able to efficiently execute against all of these venues

The solution here is creating a marketplace for execution monopolies - where specialists can trade against against you and each other, all while having access to their preferred venues - ensuring that the optimal prices are always surfaced.

# Slide 5: So how do you achieve such a marketplace?

- First you need an EXCELLENT quoting (and trading) environment
    - FAST - the faster you are the quicker your market participants can react to and execute on new information.https://x.com/burckmeister/status/1994186227314983299 <- screenshot of this tweet
    - Low cost-to-quote
        - prioritized cancels - lowers cost from toxic flow
        - pre-trade privacy - avoids frontrunning (MM last look issue especially relevant here given cancel prioritization)
        - non-rotating - one fast box in one place until it actually needs to move
        - decentralized and permissionless - otherwise you end up excluding market participants and that just makes liquidity worse
- Next you need FULL composability with external venues
    - liquidity won't concentrate to one venue in permissionless finance (or even permissioned finance without a geopolitical financial center)
    - ditto with asset issuance
    - there can't be capital cost for executing against an external venue (note can maybe cut this)
    - you want access to everyone's liquidity and products
- Finally you need EXTREME capital efficiency
    - the more capital efficient you are the more liquidity and volume you drive as it becomes cheaper to trade with you
# Slide 5: So where does decentralized CEX come in?
CEX's actually have a lot of these properties
- Good quoting environment
    - fast and non-rotating
    - Low cost to quote
        - No cost to quote (gas etc)
        - Prioritized cancels (sometimes)
        - No margin check on quotes (sometimes)
    - private (if you actually trust that the operator isn't surfacing your positions and flow internally) (arthur hayes lambo tweet)
- Composability
    - Cross margin and custodian/broker support
    - Large lines of credit to allow market makers to execute in different domains
- Capital efficient
    - Plethora of leverage options as well as the forementioned lines of credit
They also have a lot of problems (mainly they're a centralized custodian that can do whatever the heck they want)
# Slide 6: So why call t+ a Decentralized CEX
t+ does these things, but better than CEXs, and while being noncustodial and permissionless

t+ is the first Prime Exchange 
(which CEX's were a precursor to)
# Slide 7: What the heck is a Prime Exchange?
Well it's an exchange that offers Prime Broker style features
T+ Offers:
- An optimal trading environment with a CLOB in a TEE
    - high-performance and non-rotating
    - low cost-to-quote
        - prioritized cancels
        - no margin requirement to quote (for MMs)
        - no cost-to-quote (gas)
    - private (order and position privacy - L2 book data is reported)
    - permissionless and trustless and decentralized (we'll get more into this later as TEE does not necessarily mean this)
Next - the PB style features
- FULL composability
    - your t+ account can interact with external protocols on any chain where we have a deposit vault atomically and using deposit vault funds (kinda like a flashloan)
        - clear leverage exposure with onchain spot liquidity
    - Cross margin with your favorite source exchange (hyperliquid, binnance, etc)
    - we ingest products and liquidity from everyone else
- Capital Efficiency
    - t+ offers matched book margin
        - match cross-side leverage positions against each other to allow them to be auto-delevered
        - scales via skewing exposure rather than creating premiums or discounts on a synthetic asset (skew based funding rates)
        - You end up getting the capital efficiency of perps but don't lose fungibility with underlying spot markets, create premiums, or make funding rates more volatile
# Slide 8: What does the future hold?
Permissionless finance will lead to a continued fragmentation of liquidity and more and more source and flow venues appearing. Source venues are where people go to hedge and attract liquidity - flow venues attract taker flow and remarket source venue liquidity

t+ is actually a Prime Exchange Network which serves as a platform for all these flow venues as they transition into becoming Prime exchanges themselves (as is inevitable). Our composability and margin layer creates a unified capital base and state machine that just accepts mutations from orderbooks or auctions which t+'s clob in a TEE is just one of. This allows each "proposer" to enforce their own AML and KYC regimes or whatever other features they want while benifiting from our unified capital pool. Natural fit for OTC desks, T2 CEXs, the list goes on.

Diagram displaying a t+ layer (perfect markets bar?) with prime exchanges (incl t+) on top as stems and source exchanges on bottom as roots




