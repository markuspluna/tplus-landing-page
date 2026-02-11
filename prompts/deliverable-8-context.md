# Deliverable 8 — Trading Functionality

## Purpose
End-to-end trade execution reference. Covers products, order types, time-in-force options, order lifecycle, matching rules, leverage, and market microstructure.

## Audience
Traders and developers who need to understand how orders work, what order types are available, and how matching/execution happens.

## Target Structure
1. Order types (limit, market, stop, etc.)
2. Time-in-force options (GTC, IOC, FOK, etc.)
3. Order lifecycle and state transitions
4. Matching engine rules and priority
5. Leverage and position sizing
6. Market microstructure (tick sizes, lot sizes, price bands)
7. Prioritized maker path (if applicable)

## Depth Level
Detailed: explain each order type's behavior, matching priority rules, and state transitions. Diagrams or state tables are ideal for lifecycle. Include concrete examples.

## Exclusions (covered in other deliverables)
- API endpoints for placing/querying orders → D2
- SDK order functions → D5
- Fee calculation per trade → D6
- Margin requirements → D7
- Post-trade settlement → D9
- Quickstart tutorial → D11

## Word Count Target
Under 1500 words. Use state diagrams or tables for lifecycle; avoid lengthy prose for what tables convey better.
