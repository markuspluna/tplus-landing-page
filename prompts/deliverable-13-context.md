# Deliverable 13 — Rebalancing Mechanism (Deposit/Withdrawal Fees & Incentives)

## Purpose
Explains the multi-chain liquidity rebalancing mechanism — how deposit/withdrawal fees and incentives maintain target liquidity distribution across chains.

## Audience
Liquidity providers, market makers, and developers building deposit/withdrawal tooling who need to understand fee/reward dynamics.

## Target Structure
1. Problem statement (why rebalancing is needed - very brief)
2. Target liquidity distribution and vault weights
3. Fee/reward mechanism (over-target deposits penalized, under-target deposits rewarded)
5. Calculation formula for rebalancing fees/incentives
6. Examples with concrete numbers

## Depth Level
Detailed mechanics: exact formulas, worked examples with numbers, weight tables. This is a reference for people who need to predict their deposit/withdrawal costs.

## Exclusions (covered in other deliverables)
- Trading fees → D6
- API endpoints for deposits/withdrawals → D3
- Contract deposit/withdrawal functions → D4
- SDK deposit/withdrawal methods → D5
- Risk/margin concepts → D7
- Settlement mechanics → D9
- Interest rates → D14

## Word Count Target
Under 1000 words. Use formulas and worked examples; minimize narrative framing.
