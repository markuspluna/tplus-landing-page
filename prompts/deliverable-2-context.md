# Deliverable 2 — OMS Endpoints (tplus-core)

## Purpose
Complete API reference for the Order Management System. Every endpoint a trader or integrator would call through tplus-core for order management, market data, and account queries.

## Audience
Developers integrating with the t+ OMS API — building trading bots, dashboards, or bridging to other systems.

## Target Structure
1. Authentication (API keys, signing, session management)
2. Order endpoints (create, cancel, modify, query)
3. Order types and lifecycle states
4. Market data endpoints (orderbook, trades, ticker)
5. Account and position queries
6. WebSocket streams (subscriptions, message formats)
7. Error codes and rate limits

## Depth Level
Full API reference: endpoint signatures, request/response schemas, parameter descriptions, example payloads. Every endpoint needs method, path, parameters, and response shape.

## Exclusions (covered in other deliverables)
- Settlement/withdrawal/deposit endpoints → D3
- Smart contract interfaces → D4
- SDK wrappers around these endpoints → D5
- Fee calculation logic → D6
- Margin requirements → D7
- Trading concepts (matching, TIF) → D8
- Settlement lifecycle → D9

## Word Count Target
No hard cap — completeness matters more than brevity for an API reference. But avoid narrative filler; use tables and structured lists.
