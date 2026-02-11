# Deliverable 9 — Settlement & Clearing

## Purpose
Explains how trades settle onchain after offchain confirmation. Covers the settlement lifecycle, settlement types, netting/batching, signing flows, withdrawal mechanics, and SDK/contract execution.

## Audience
Developers building settlement integrations, ops teams monitoring settlement, and anyone who needs to understand the offchain→onchain bridge.

## Target Structure
1. Settlement lifecycle overview (confirmation → batching → signing → onchain execution)
2. Settlement types (standard, atomic/RFQ, forced)
3. Netting and batching logic
4. Signing flow (TEE role, co-signing)
5. SDK settlement functions
6. Contract settlement functions
7. Failure modes and retries

## Depth Level
Detailed mechanics: step-by-step flow for each settlement type, what triggers batching, signing protocol, and how failures are handled. Sequence diagrams are ideal.

## Exclusions (covered in other deliverables)
- API endpoint signatures → D2, D3
- Contract ABI details → D4
- SDK method signatures → D5
- Fee interaction → D6
- Margin/risk during settlement → D7
- Order matching (pre-settlement) → D8
- Liveness guarantees during settlement failure → D10

## Word Count Target
Under 1200 words. Use sequence diagrams or numbered step lists rather than prose paragraphs.
