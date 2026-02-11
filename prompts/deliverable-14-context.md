# Deliverable 14 — Interest Rates (Borrow & Funding Rates)

## Purpose
Explains the interest rate system — utilization-based borrow rates, skew-based funding rates, rate computation formulas, hourly accrual, rate caps, and payment distribution.

## Audience
Traders managing funding exposure, market makers modeling costs, developers building rate-aware tools.

## Target Structure
1. Borrow rate model (utilization-based)
2. Borrow rate formula and parameters
3. Funding rate model (skew-based)
4. Funding rate formula and parameters
5. Hourly accrual mechanics
6. Rate caps and bounds
7. Payment distribution (who pays whom)
8. Rate query endpoints will be exposed via ims in the future

## Depth Level
Detailed mechanics: exact formulas with variable definitions, parameter tables, worked examples. This is a reference for people modeling costs.

## Exclusions (covered in other deliverables)
- API endpoints for rate queries → D3
- Trading fees → D6
- Margin requirements → D7
- Settlement mechanics → D9
- Rebalancing fees → D13

## Word Count Target
Under 1000 words. Formulas and parameter tables are the core — minimize prose around them.
