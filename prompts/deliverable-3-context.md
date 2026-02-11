# Deliverable 3 — Clearing Engine Endpoints

## Purpose
Full HTTP API reference for the Clearing Engine (CE) — all non-OMS public-facing endpoints exposed by tplus-core. Settlement initiation and status, deposits, withdrawals, vault queries, asset registry, decimal precision, transfers, and interest rate streaming.

## Audience
Developers integrating directly with the CE HTTP API — settlement integrations, collateral management, vault operations, position transfers.

## Target Structure
1. Settlement endpoints (init, update, signatures WS, settlers)
2. Withdrawal endpoints (init, cancel, queue, signatures, update)
3. Deposit endpoints (update)
4. Vault endpoints (get, update, balance update)
5. Asset registry endpoints (assets, risk parameters, registry address)
6. Decimal precision endpoints (get, update)
7. Transfer endpoints (close position, sub-account transfer)
8. Interest Engine endpoints (WS /rates, GET /health)
9. System endpoints (GET /status)
10. Error handling and authentication

## Depth Level
Full API reference: HTTP method, route path, request body schemas (Rust struct definitions with field types), response schemas, error conditions. Document the actual HTTP endpoints — not SDK wrappers (those are D5).

## Source Priority
Primary sources are the Rust route handlers and request type definitions:
- `tplus-core/bin/clearing-engine/src/permissionless/` — route definitions
- `tplus-core/messages/orderbook_messages/src/user_requests.rs` — request types
- `tplus-core/bin/clearing-engine/src/inventory/` — internal request types
- `tplus-core/bin/interest-engine/src/http_api.rs` — IE endpoints

tpluspy (`tpluspy/tplus/client/clearingengine/`) may be used as a cross-reference to verify endpoint mapping, but should NOT be documented as the primary content. SDK wrappers are covered in D5.

## Exclusions (covered in other deliverables)
- OMS order/market data endpoints → D2
- Smart contract deposit/withdraw interfaces → D4
- SDK wrappers (tpluspy) → D5
- Fee computation logic → D6
- Risk/margin mechanics → D7
- Settlement lifecycle concepts → D9
- Interest rate formulas and theory → D14

## Word Count Target
No hard cap — completeness over brevity for API reference. Use tables and structured lists.
