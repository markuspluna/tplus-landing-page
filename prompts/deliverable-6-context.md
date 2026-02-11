# Deliverable 6 — Fees

## Purpose
Fee schedule and computation reference. Explains the maker/taker model, fee tiers, volume discounts, rebates, and how fees interact with settlement. Must note that trading fees are currently unimplemented.

## Audience
Traders evaluating costs, developers building fee estimation into tools, ops teams reconciling fees.

## Target Structure
1. Current status (trading fees unimplemented — state this prominently)
2. Planned fee model: maker/taker structure
3. Fee tiers and volume-based discounts
4. Rebate programs
5. Per-trade fee calculation (formula or pseudocode)
6. Fee interaction with settlement
7. Gas/network fees (if applicable)

## Depth Level
Reference-grade: exact fee rates (or "TBD" where unset), formulas, tier thresholds. Tables preferred over prose.

## Exclusions (covered in other deliverables)
- API endpoints that return fee info → D2, D3
- Risk/margin mechanics → D7
- Settlement mechanics → D9
- Rebalancing fees/incentives → D13
- Interest rates → D14

## Word Count Target
Under 800 words. Fee schedules should be mostly tables, not paragraphs.
