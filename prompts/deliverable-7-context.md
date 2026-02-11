# Deliverable 7 — Risk Mechanisms

## Purpose
Margin and risk management reference. Explains how t+ computes margin requirements, applies haircuts, handles liquidations, and manages the insurance fund.

## Audience
Traders managing positions, risk engineers evaluating the system, developers building margin-aware tools.

## Target Structure
1. Initial vs maintenance margin
2. Haircut methodology and collateral valuation
3. Cross-margining model
4. Collateral eligibility and asset weights
5. Liquidation process and triggers
6. Insurance fund mechanics
7. Deposit caps and position limits
8. Risk parameter tables

## Depth Level
Detailed mechanics: formulas for margin calculation, haircut tables, liquidation trigger conditions. Include worked examples where formulas are non-trivial.

## Exclusions (covered in other deliverables)
- API endpoints for querying margin/positions → D2, D3
- Smart contract settlement mechanics → D4
- Fee impact on margin → D6
- Order types / matching → D8
- Settlement lifecycle → D9
- Escape hatches → D10
- Interest rate impact on positions → D14

## Word Count Target
Under 1500 words. Use tables for parameter values; use formulas inline. Avoid restating concepts from D1.
