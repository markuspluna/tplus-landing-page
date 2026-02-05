# Documentation Site Plan

## Overview

This document is the master plan for generating the t+ documentation site. It covers two things:

1. **Style & presentation rules** — how every docs page should look and feel
2. **Deliverable map** — the 14 pages to generate, their scope, and execution instructions

Each deliverable has a companion file (`docs-plan-deliverable-{N}.md`) containing the full spec a Claude instance needs to produce that page (N = 1-14). Instances run in parallel with no file conflicts.

---

## Part 1: Documentation Style Guide

### Design Philosophy

The landing site uses a retro/arcade aesthetic with heavy animation, 3D effects, and novelty fonts. **The docs site does not.** Technical documentation demands readability, scannability, and predictability above all else.

Keep the brand connection through color and subtle typographic choices, but strip everything else back to a clean, utilitarian layout. Think Stripe docs or Ethereum developer docs — not a game console.

**Core principles:**

- **Readability first.** Long-form text, code blocks, and tables must be effortless to scan.
- **No decoration.** No animations, no glow effects, no CRT scanlines, no 3D transforms. Zero.
- **Consistent structure.** Every page uses the same layout shell. Navigation is always in the same place.
- **Code is a first-class citizen.** API docs live and die by their code examples. Give them room.

---

### Color Palette

Derive from the brand but flatten for documentation use.

| Token | Value | Usage |
|---|---|---|
| `--docs-red` | `#ED1F24` | Links, active nav items, inline code accents, primary buttons |
| `--docs-red-hover` | `#c62828` | Link hover state, button hover |
| `--docs-red-light` | `#fff0f0` | Callout/admonition background (warning/important) |
| `--docs-black` | `#1a1a1a` | Body text, headings |
| `--docs-gray-dark` | `#333333` | Secondary text, table headers |
| `--docs-gray-mid` | `#6b7280` | Muted text, breadcrumbs, metadata |
| `--docs-gray-light` | `#e5e7eb` | Borders, horizontal rules, table row separators |
| `--docs-gray-bg` | `#f9fafb` | Code block background, sidebar background |
| `--docs-white` | `#ffffff` | Page background, card background |
| `--docs-code-bg` | `#f5f5f5` | Inline code background |
| `--docs-info-bg` | `#eff6ff` | Info callout background |
| `--docs-info-border` | `#3b82f6` | Info callout left border |
| `--docs-warn-bg` | `#fff0f0` | Warning callout background |
| `--docs-warn-border` | `#ED1F24` | Warning callout left border |

**Rules:**
- Body text is always `--docs-black` on `--docs-white`.
- Never use pure `#000000` for text — too harsh for long reading.
- Red is an accent only. Do not use red for body text, backgrounds, or large surfaces.
- Code blocks use `--docs-gray-bg` with `--docs-black` text. No syntax theme with red as the dominant color.

---

### Typography

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Body text | `Inter, -apple-system, system-ui, sans-serif` | 16px / 1rem | 400 | Line-height: 1.7 for readability |
| Headings (h1) | `Inter, sans-serif` | 30px / 1.875rem | 700 | Page title. One per page. |
| Headings (h2) | `Inter, sans-serif` | 24px / 1.5rem | 600 | Section headers. Used as anchor targets. |
| Headings (h3) | `Inter, sans-serif` | 20px / 1.25rem | 600 | Subsection headers. |
| Headings (h4) | `Inter, sans-serif` | 16px / 1rem | 600 | Inline section headers. Rarely used. |
| Code (inline) | `'JetBrains Mono', 'Fira Code', 'Courier New', monospace` | 14px / 0.875rem | 400 | Background: `--docs-code-bg`, padding: 2px 6px, border-radius: 4px |
| Code (block) | `'JetBrains Mono', 'Fira Code', 'Courier New', monospace` | 14px / 0.875rem | 400 | Background: `--docs-gray-bg`, padding: 16px 20px, border-radius: 6px, overflow-x: auto |
| Nav links | `Inter, sans-serif` | 14px / 0.875rem | 500 | Sidebar and breadcrumb text |
| Table text | `Inter, sans-serif` | 14px / 0.875rem | 400 | Compact for data density |

**Rules:**
- The landing site's `Press Start 2P` and `VT323` fonts do NOT appear anywhere in docs. They are illegible at body-text sizes.
- Monospace is for code only. Never use monospace for headings, nav, or body text.
- Heading hierarchy must be strict: h1 > h2 > h3 > h4. No skipping levels.
- Keep line lengths under ~75 characters (max-width on content area handles this).

---

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Top bar: Logo (left) · Search (center) · GitHub (right) │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │  Content area                               │
│  nav       │                                             │
│            │  Breadcrumb: Docs > Section > Page          │
│  - Section │                                             │
│    - Page  │  # Page Title                               │
│    - Page  │                                             │
│  - Section │  Body text, code blocks, tables...          │
│    - Page  │                                             │
│            │                                             │
│            ├─────────────────────────────────────────────┤
│            │  Prev / Next page navigation                │
├────────────┴─────────────────────────────────────────────┤
│  Footer: Copyright · Links                               │
└──────────────────────────────────────────────────────────┘
```

**Dimensions:**
- Sidebar: 260px fixed width, sticky on scroll
- Content area: max-width 760px, centered within remaining space
- Top bar: 56px height, fixed/sticky
- Page padding: 32px horizontal, 40px vertical on content area
- On mobile (<768px): sidebar collapses to hamburger menu, content goes full-width with 16px padding

**Sidebar navigation:**
- Sections are collapsible groups
- Active page highlighted with `--docs-red` left border (3px) and light red background
- Nested pages indented 16px per level
- Section headers are uppercase, 12px, `--docs-gray-mid`, letter-spacing: 0.5px

---

### Component Patterns

#### Code Blocks

```
┌─────────────────────────────────────────┐
│ python                          [Copy]  │
├─────────────────────────────────────────┤
│                                         │
│  from tplus.client import OrderBook...  │
│                                         │
└─────────────────────────────────────────┘
```

- Language label top-left, copy button top-right
- Background: `--docs-gray-bg`
- Border: 1px solid `--docs-gray-light`
- Border-radius: 6px
- Syntax highlighting: use a neutral theme (e.g., GitHub Light or similar). No dark-mode code blocks on a light page.
- Horizontal scroll on overflow. Never wrap code lines.

#### Tables

- Full-width within content area
- Header row: `--docs-gray-bg` background, `--docs-gray-dark` text, font-weight 600
- Body rows: alternating white / `#fafafa` (subtle zebra striping)
- Cell padding: 12px 16px
- Border: 1px solid `--docs-gray-light` on all cells
- Left-align text columns, right-align numeric columns

#### API Endpoint Blocks

For each endpoint, use this structure:

```
┌─────────────────────────────────────────┐
│  POST  /v1/orders                       │
├─────────────────────────────────────────┤
│                                         │
│  Description text.                      │
│                                         │
│  Parameters                             │
│  ┌────────┬────────┬──────┬───────────┐ │
│  │ Name   │ Type   │ Req  │ Desc      │ │
│  ├────────┼────────┼──────┼───────────┤ │
│  │ symbol │ string │ Yes  │ Market... │ │
│  └────────┴────────┴──────┴───────────┘ │
│                                         │
│  Request Example                        │
│  ┌─────────────────────────────────────┐│
│  │ { "symbol": "BTC-USD", ... }       ││
│  └─────────────────────────────────────┘│
│                                         │
│  Response Example                       │
│  ┌─────────────────────────────────────┐│
│  │ { "orderId": "abc123", ... }       ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

- HTTP method shown as a colored badge: GET = green, POST = blue, PUT = orange, DELETE = red
- Endpoint path in monospace, bold
- Parameter tables include: name, type, required (yes/no), description
- Request and response examples are code blocks with copy buttons

#### Callout / Admonition Boxes

Four types only:

| Type | Left border | Background | Icon |
|---|---|---|---|
| **Note** | `#3b82f6` (blue) | `#eff6ff` | `i` circle |
| **Tip** | `#10b981` (green) | `#ecfdf5` | lightbulb |
| **Warning** | `#f59e0b` (amber) | `#fffbeb` | triangle `!` |
| **Danger** | `#ED1F24` (red) | `#fff0f0` | octagon `!` |

- 4px left border, 16px padding, border-radius: 4px
- No icons if they add implementation complexity. The border color is sufficient.
- Use sparingly. A page full of callouts is noisy.

#### Navigation (Prev / Next)

- Bottom of every page
- Two-column layout: previous page (left-aligned), next page (right-aligned)
- Show section name (small, muted) and page title (bold)
- Arrow indicators: `<-` and `->`

---

### General Content Rules

1. **Headings are link anchors.** Every h2 and h3 gets a URL-friendly `id` attribute and a hover-visible `#` link icon.
2. **No "click here" links.** Link text must describe the destination: "See the [OMS endpoint reference](#)" not "See [here](#)."
3. **Code examples are complete and runnable.** No pseudo-code, no `...` elisions in examples the user is expected to copy. If an example must be truncated, say so explicitly.
4. **One topic per page.** If a page covers two unrelated things, split it.
5. **Cross-references use relative links** between deliverable pages, not absolute URLs.
6. **No marketing language.** This is not the pitch deck. Do not say "revolutionary," "blazing fast," or "cutting-edge." State what the system does, factually.
7. **API parameters always include types and required/optional status.**
8. **All code examples include the language identifier** for syntax highlighting (```python, ```rust, ```json, etc.).
9. **Include Rust code examples where possible.** The core system (tplus-core) is written in Rust. Wherever a concept, endpoint, or data structure can be illustrated with a Rust example — in addition to or instead of Python — include one. This is especially relevant for sections covering tplus-core internals (architecture, matching engine, margin, settlement signing), data type definitions, and any place where showing the Rust struct/enum/trait definition clarifies the API contract. Use idiomatic Rust with proper type annotations.
10. **Keep paragraphs short.** 3-4 sentences max. Use lists and tables to break up dense information. Total time to read a page should be as low as possible
11. **Use second person ("you") for instructions**, third person ("the system") for describing behavior.

---

## Part 2: Deliverable Map

Each row maps to a `docs-plan-deliverable-{N}.md` file that contains the full execution spec for that page.

| # | Page Title | Scope (one line) | Output Format | Nav Section |
|---|---|---|---|---|
| 1 | Architecture Overview | High-level system design: TEE orderbook, onchain settlement, component relationships, data flow | Conceptual guide with diagram descriptions | Overview |
| 2 | OMS Endpoints | Full API reference for order placement, cancellation, modification, lifecycle, auth, WebSocket setup | Endpoint reference | API Reference |
| 3 | Other tplus-core Endpoints | Non-OMS endpoints: accounts, positions, balances, margin, market data, rate query endpoints, instruments | Endpoint reference | API Reference |
| 4 | Smart Contract Endpoints | On-chain interfaces: deposit, withdrawal, settlement, collateral, ABI reference, event definitions | Endpoint reference | API Reference |
| 5 | Python SDK (tpluspy) | Installation, auth, client init, workflow guides with code examples for every major operation | SDK guide with code samples | SDK |
| 6 | Fees | Fee schedule, maker/taker model, tiers, discounts, computation, settlement interaction | Reference table + explanation | Trading |
| 7 | Risk Mechanisms | Margin model, haircuts, cross-margining, liquidation, insurance fund, deposit caps | Conceptual guide + parameter tables | Trading |
| 8 | Trading Functionality | Products, order types, time-in-force, matching rules, leverage, market microstructure | Conceptual guide + reference tables | Trading |
| 9 | Settlement & Clearing | Trade-to-settlement lifecycle, delayed settlement, atomic flows, cross-chain, netting | Conceptual guide with flow descriptions | Protocol |
| 10 | Liveness & Trust | Trust model, failure modes, escape hatches, attestation, operator obligations, comparison to alternatives | Conceptual guide | Protocol |
| 11 | Getting Started | Onboarding tutorial: connect, deposit, trade, read results. Self-contained with links to deeper docs | Step-by-step tutorial | Getting Started |
| 12 | Glossary & Reference | Term definitions, endpoint quick-reference table, contract method table, type reference | Lookup reference | Reference |
| 13 | Rebalancing Mechanism | Multi-chain liquidity rebalancing: deposit/withdrawal fees (up to 2.5%), rewards for restoring balance, weight system, self-funding guarantee | Conceptual guide + reference tables | Trading |
| 14 | Interest Rates | Borrow rates (utilization-based kink curves) and funding rates (skew + premium additive formula), rate engine architecture, hourly application, fee tiers | Conceptual guide + reference tables | Trading |

---

### Sidebar Navigation Structure

The docs site sidebar should use this hierarchy:

```
Getting Started
  Quickstart                      (deliverable 11)

Overview
  Architecture                    (deliverable 1)

API Reference
  OMS Endpoints                   (deliverable 2)
  Other Endpoints                 (deliverable 3)
  Smart Contracts                 (deliverable 4)

SDK
  Python SDK (tpluspy)            (deliverable 5)

Trading
  Trading Functionality           (deliverable 8)
  Fees                            (deliverable 6)
  Rebalancing Mechanism           (deliverable 13)
  Interest Rates                  (deliverable 14)
  Risk Mechanisms                 (deliverable 7)

Protocol
  Settlement & Clearing           (deliverable 9)
  Liveness & Trust                (deliverable 10)

Reference
  Glossary                        (deliverable 12)
```

"Getting Started" is the default landing page for `/docs`.

---

### Cross-Reference Map

This table shows which deliverables must link to each other. Each deliverable spec file should include these as explicit cross-references.

| From | Links to | Reason |
|---|---|---|
| 1 (Architecture) | 2, 3, 4, 5, 9, 10 | Overview references all subsystems |
| 2 (OMS) | 3, 5, 8, 11 | Auth shared with other endpoints; SDK wraps these; trading context; quickstart uses these |
| 3 (Other Endpoints) | 2, 5, 7, 9, 14 | Shared auth; SDK wraps these; margin data feeds risk; clearing feeds settlement; funding rate query endpoints |
| 4 (Contracts) | 5, 9, 10 | SDK has EVM module; settlement calls contracts; trust model covers contract guarantees |
| 5 (SDK) | 2, 3, 4, 11 | SDK wraps all API surfaces; quickstart uses SDK |
| 6 (Fees) | 2, 7, 8, 9, 13, 14 | Fees on orders; fee interaction with margin; fee by product type; fee settlement timing; rebalancing fees are separate; interest rates are fee-adjacent |
| 7 (Risk) | 3, 6, 8, 10, 14 | Margin endpoints; fee interaction; product-level risk; trust model for risk enforcement; risk caps constrain interest rates |
| 8 (Trading) | 2, 6, 7 | Order API for placing trades; fee schedule; risk constraints on trading |
| 9 (Settlement) | 1, 4, 10, 13 | Architecture context; on-chain execution; liveness guarantees for settlement; rebalancing fees on settlement token_in/out |
| 10 (Trust) | 1, 4, 9 | Architecture context; contract escape hatches; settlement finality guarantees |
| 11 (Quickstart) | 2, 3, 5, 13 | Uses OMS endpoints, account endpoints, and SDK; depositing may incur rebalancing fees |
| 12 (Glossary) | All | Terms defined from all sections; endpoint/method tables reference API sections |
| 13 (Rebalancing) | 4, 6, 7, 9, 11 | Contract config for weights; distinct from trading fees; risk parameter (buffer); settlement triggers fees; new users need to understand deposit fees |
| 14 (Interest Rates) | 3, 6, 7, 8 | Rate query endpoints in other endpoints; interest is fee-adjacent; risk caps constrain rates; funding rates tied to perp positions |

---

### Execution Instructions

**For each deliverable, the companion `docs-plan-deliverable-{N}.md` file must contain:**

1. **Scope** — What this page covers and where its boundaries are with adjacent pages.
2. **Source material** — Exact file paths and document references to read.
3. **Content** — The substance: facts, explanations, parameter values, code examples that must appear.
4. **Outline** — Ordered list of sections and subsections.
5. **Output format** — Whether this is an endpoint reference, conceptual guide, tutorial, or lookup table.
6. **Cross-references** — Which other deliverable pages to link to (from the map above).
7. **Style adherence** — Reminder to follow Part 1 of this document for all visual and content formatting.

**Execution rules for Claude instances:**

- Each instance receives ONE deliverable spec file plus this docs-plan.md (for style rules).
- Output is a single HTML page following the layout and component patterns in Part 1.
- Do not invent information. If the source material does not cover something, note it as "TBD" with a visible callout.
- Do not expose proprietary implementation details. The architecture overview should be high-level and user-focused. API docs expose the public interface only.
- Use the exact CSS token names from Part 1 so all pages share a single stylesheet.
- Every code example must specify the language and be syntactically valid.
- Include Rust code examples wherever the source material comes from tplus-core. Show Rust struct/enum/trait definitions when they clarify the API contract or data model. Pair Rust examples with Python examples where both are relevant.
- Every API endpoint must include: method, path, description, parameters table, request example, response example.

---

### Resolved Questions

- ~~Do we have OpenAPI / Swagger specs in tplus-core that can be ingested directly?~~ **No.** Endpoint docs must be authored from source code.
- ~~Is there a separate WebSocket API or is it part of the core REST surface?~~ **Unsure.** Investigate during deliverable execution — check OMS binary and ws-stream-handler for whether WebSocket is a distinct API surface or integrated into the REST server.
- ~~Are there any private/internal endpoints that should be excluded from public docs?~~ **Yes**, but these are handled in a separate process. The deliverable specs should document the public interface only; internal/debug endpoint exclusion is managed outside this docs plan.
- ~~Should docs cover demo-algos (market making examples) as a separate section or fold examples into the SDK page?~~ **No.** Do not cover demo-algos as a separate section.
