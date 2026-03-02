# MBM (Margin-Based Matching) Animation Flow — Draft

## Overview
This animation illustrates how the Composite Leverage Network manages exposure inside a TEE (Intel TDX VM). It consists of three sequential panels/steps showing: opening leverage, matching/netting exposure, and clearing unmatched leverage.

---

## Layout

### Container
A large outer box labeled **"Composite Leverage Network"** with a sub-label **"Intel TDX VM"** in the top-right corner.

### Inside the Container
- **`risk-engine.rs`** — a box in the upper area representing the risk engine running inside the TEE
 -  Tplus' Matched Book Margin engine offsets counterside leverage positions against each other - allowing them to be auto-delevered
- **Exposure Bars** — two vertical bars side by side:
  - **Long bar** (left) — represents aggregate long exposure
  - **Short bar** (right) — represents aggregate short exposure
  - These bars grow/shrink dynamically to visualize exposure changes

### Ball Types
- **t+ face ball** (red circle with t+ logo) — represents a matched trade / leverage unit

---

## Step 1 — "New match opens leverage (long)"

**Description:** A new match arrives and increases the long side of the composite leverage.

- t+ face ball enters from the **left edge of the screen**, slides right into the Composite Leverage Network container
- Ball moves into the **long exposure bar**, which **grows taller** as the ball is absorbed (the ball dissapears)
- `risk-engine.rs` glows briefly to indicate processing
- Short exposure bar remains unchanged
- Terminal title: *"New match increases long leverage exposure"*
- Terminal subline: *"This reduces the current skew to short exposure - decreasing risk and underlying deposit draws"*

---

## Step 2 — "Matched exposure can be netted"

**Description:** When opposing long and short positions exist, they can be matched and netted against each other, reducing overall exposure.

- Long and short exposure bars **glow** to indicate matching is occurring
- `risk-engine.rs` glows
- The matching pair of long/short boxes **merge** — visually, a portion of the long bar and an equal portion of the short bar shrink simultaneously
- Only the **remaining unmatched short exposure** is left — the short bar **falls/shrinks to its residual size**
- Long bar is now reduced or eliminated
- Terminal title: *"Matched exposure is auto-delevered"*
- Terminal subline: *"De-levering via ADL is safer and more efficient than clearing positions by liquidation - allowing Tplus to offer higher leverage"*

---

## Step 3 — "Non-matched leverage must be cleared"

**Description:** Any remaining unmatched leverage must be cleared via new matching or external liquidity.

- The remaining unmatched exposure bar **glows** to indicate it needs resolution
- `risk-engine.rs` glows
- The unmatched exposure **transforms into a t+ face ball** (the bar shrinks as the ball spawns)
- The t+ face ball **exits the Composite Leverage Network** container, moving to the **left edge of the screen** (sent offscreen to be routed elsewhere — new match or external liquidity)
- Short exposure bar in the container is now empty/gone
- Terminal text: *"Non-matched leverage must be cleared via new or external liquidity"*
- Terminal subline: *"This is a standard liquidation - more expensive and less efficient than ADL"*


---

## Timing
Follow the same 2x-slowed convention as the settlement animation. Typical movement durations: 1.2–2.4s, pauses: 1.6–4s.

## Looping
After Step 3 completes and the ball exits, pause briefly, then loop back to Step 1 with a new t+ ball entering from the left.

---

## Open Questions
- Should the exposure bars have numeric labels (e.g., notional values) that update as they grow/shrink?
- Should there be a visual distinction between "cleared via new match" vs "cleared via external liquidity" in Step 3?
- Does the animation live on its own page/section, or is it a view within the existing settlement animation (like Views 1–3)?
- Are there view indicator dots for these steps, or does it play as a continuous loop?
