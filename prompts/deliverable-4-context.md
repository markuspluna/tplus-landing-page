# Deliverable 4 — Smart Contract Endpoints (tplus-contracts)

## Purpose
On-chain contract interface reference. ABI documentation for the smart contracts that handle deposits, withdrawals, settlement, and RFQ/atomic-settlement.

## Audience
Developers interacting directly with t+ smart contracts — writing settlement scripts, building on-chain integrations, or auditing contract interfaces.

## Target Structure
1. Contract overview and deployment addresses (or how to find them)
2. Deposit functions and events
3. Withdrawal functions and events
4. Settlement functions and events
5. RFQ / atomic-settlement mechanics
6. ABI reference (function signatures, parameters, return values)
7. Event definitions and indexed parameters
8. Transaction flow diagrams (deposit, withdrawal, settlement)

## Depth Level
Full ABI reference: function signatures, parameter types, return types, event definitions. Include transaction flow descriptions showing the sequence of calls.

## Exclusions (covered in other deliverables)
- REST/WebSocket API endpoints → D2, D3
- SDK wrappers for contract calls → D5
- Fee logic → D6
- Risk/margin concepts → D7
- Settlement lifecycle concepts → D9
- Escape hatch / liveness details → D10
- All admin or risk admin functions

## Word Count Target
No hard cap — completeness matters. Use code blocks for ABI signatures and tables for parameter descriptions.
