#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# run-docs-refinement.sh
#
# Orchestrates parallel Claude Code instances to refine the 14
# documentation deliverable files. Each file goes through 3
# phase-differentiated passes with per-deliverable context.
#
# Pass 1 — Structure & Scope
# Pass 2 — Accuracy
# Pass 3 — Prose & Conciseness
# ─────────────────────────────────────────────────────────────

# ── Configuration ────────────────────────────────────────────

MAX_CONCURRENT=14          # Max parallel Claude instances
TOTAL_DELIVERABLES=14     # Number of deliverable files
PASSES_PER_FILE=3         # Sequential refinement passes per file
SPAWN_DELAY=5             # Seconds between launching new instances
MAX_RETRIES=3             # Max retries per pass on failure
INITIAL_BACKOFF=5         # Initial retry backoff in seconds
LOG_DIR="docs-refinement-logs"
GIT_LOCK_DIR="/tmp/docs-refinement-git.lock"
PROMPTS_DIR="prompts"

# ── Setup ────────────────────────────────────────────────────

mkdir -p "$LOG_DIR"
rm -rf "$GIT_LOCK_DIR"  # Clean up stale lock from prior runs

FAILED_DELIVERABLES=()

# ── Logging ──────────────────────────────────────────────────

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] $*"
}

log_file() {
  local deliverable=$1
  local pass=$2
  echo "${LOG_DIR}/deliverable-${deliverable}-pass-${pass}.log"
}

# ── Cross-deliverable scope summary ──────────────────────────

SCOPE_SUMMARY="$(cat <<'SCOPE'
## Cross-Deliverable Scope Map
Each deliverable owns a specific domain. Do NOT add content that belongs in another deliverable.

- D1  Architecture Overview — high-level conceptual entry point
- D2  OMS Endpoints — REST/WS API reference for order management, market data, account queries
- D3  Clearing Engine Endpoints — API reference for settlement, deposits, withdrawals, vault balances, rates
- D4  Smart Contract Endpoints — on-chain ABI reference (deposit, withdraw, settle, RFQ)
- D5  tpluspy Python SDK — SDK installation, auth, usage guides, code examples
- D6  Fees — fee schedule, maker/taker model, tiers, discounts, calculation
- D7  Risk Mechanisms — margin, haircuts, cross-margining, liquidation, insurance fund
- D8  Trading Functionality — products, order types, TIF, matching, leverage, microstructure
- D9  Settlement & Clearing — settlement lifecycle, netting, signing, withdrawal flow
- D10 Liveness & Trust — TEE attestation, escape hatches, failure modes, trust assumptions
- D11 Getting Started — quickstart tutorial, happy path onboarding
- D12 Glossary & Reference — term definitions, endpoint/method quick-reference tables
- D13 Rebalancing — multi-chain liquidity rebalancing fees and incentives
- D14 Interest Rates — borrow rates, funding rates, formulas, accrual mechanics
SCOPE
)"

# ── Per-deliverable context loader ───────────────────────────

load_deliverable_context() {
  local deliverable=$1
  local context_file="${PROMPTS_DIR}/deliverable-${deliverable}-context.md"

  if [[ -f "$context_file" ]]; then
    cat "$context_file"
  else
    echo "(No context file found at ${context_file})"
  fi
}

# ── Phase-differentiated prompt builder ──────────────────────

build_prompt() {
  local file=$1
  local pass=$2
  local deliverable=$3

  local context
  context=$(load_deliverable_context "$deliverable")

  local phase_instructions
  case $pass in
    1)
      phase_instructions="$(cat <<'PHASE1'
## Phase 1 — Structure & Content Generation

Your job is to GENERATE or REORGANIZE the Content section of this document using source material. Full rewrites are allowed.

**MANDATORY SOURCE READING — You MUST complete steps 1–3 before making ANY edits:**

1. Read the deliverable context below carefully. Understand what this document should cover and what it should NOT cover.
2. Read the document itself. Check whether the Content section is empty/cleared or already populated.
3. Use the Read tool to read EVERY file listed in the Source Material section. Do this one by one — no exceptions. For each file:
   - If the file exists, read it fully and use it as authoritative source material.
   - If the file does not exist or errors on read, note it and move on. Do NOT invent content to fill the gap — mark it with **[NEEDS SOURCE]**.
   - Do NOT use your training data as a substitute for source files. Only write claims you can trace to a source you actually read in this session.

**If Content is empty or cleared for regeneration:**
4. GENERATE all content from scratch using ONLY what you read from source files in step 3 and the deliverable context structure.
5. Follow the target structure from the deliverable context. Create every section heading listed there.
6. Write substantive, detailed technical content for each section based on the source files. Be concise — this is technical documentation for professionals.
7. For any section where you lack source material, write the section heading and add **[NEEDS SOURCE]** with a note about which source file would likely contain this information.

**If Content already exists:**
4. REMOVE any content that belongs in another deliverable (see the scope map). If removing something substantial, add a one-line note: "See D{N} for {topic}."
5. REORGANIZE sections to match the target structure in the deliverable context. Add missing section headings. Merge or split sections as needed.
6. Fix section flow — each section should logically lead to the next.
7. Fill in empty sections with substantive content from source material you read in step 3. If you did not read a source that covers a section, use **[NEEDS SOURCE]** instead of guessing.

**Always:**
8. Move any debug/test/admin-only/internal-only items to a "## Flagged for Review" section.
9. Do NOT modify the Scope or Source Material sections. Those are fixed.
10. Append a changelog entry: `Pass 1 (Structure & Scope): <one-line summary>`
PHASE1
)"
      ;;
    2)
      phase_instructions="$(cat <<'PHASE2'
## Phase 2 — Accuracy

Your job is to VERIFY and CORRECT every claim in this document against source material. Do not reorganize — the structure is set.

**MANDATORY SOURCE READING — You MUST complete steps 1–2 before making ANY edits:**

1. Read the document itself.
2. Use the Read tool to read EVERY file listed in the Source Material section. Do this one by one — no exceptions. For each file:
   - If the file exists, read it fully and use it as the authoritative source of truth.
   - If the file does not exist or errors on read, note which files were inaccessible.
   - Do NOT use your training data as a substitute for source files you could not read.
3. Go through the document section by section. For every factual claim, parameter name, parameter type, parameter value, endpoint path, HTTP method, endpoint signature, formula, enum variant, struct field, and behavioral description:
   - Find the corresponding source material you read in step 2.
   - If the claim matches the source, leave it.
   - If the claim contradicts the source, FIX it to match what the source actually says.
   - If the claim cannot be verified because no source covers it, add **[NEEDS SOURCE]** inline.
   - If the source contains relevant information not yet in the document (and it belongs in scope), ADD it.
4. Pay special attention to: endpoint paths and methods, parameter names and types (check exact spelling and casing from source code), enum variants, struct field names, formula correctness, and numeric values.
5. Do NOT add content that belongs in other deliverables. Do NOT expand beyond scope.
6. Do NOT rewrite prose style — that is pass 3's job. Only change wording if it is factually incorrect.
7. Do NOT add new source material entries. Only use the sources already listed in the document. Do NOT treat HTML files in this repo as source material — the source material lives in the sibling `notion-managment` repo or is explicitly listed in the document.
8. Do NOT modify the Scope or Source Material sections. Those are fixed.
9. Append a changelog entry: `Pass 2 (Accuracy): <one-line summary of what was verified and what was changed>`
PHASE2
)"
      ;;
    3)
      phase_instructions="$(cat <<'PHASE3'
## Phase 3 — Prose & Conciseness

Your job is to TIGHTEN the language and hit the word target. Do not add content or change facts.

1. Read the deliverable context for the word count target.
2. CUT redundancy — if something is said twice, keep the better version.
3. TIGHTEN prose — prefer sentence fragments and bullet points over full paragraphs where clarity is not lost.
4. Remove filler words, hedging language, and unnecessary qualifiers.
5. Remove pitchy, salesy, or promotional language. This is technical documentation.
6. Ensure consistent terminology (use the glossary terms from D12 where applicable).
7. Do NOT add new content. Do NOT change factual claims. Only improve how existing content is expressed.
8. If the document exceeds its word target, cut the least essential content or move excessive detail to a "## Additional Detail" section at the bottom.
9. Do NOT modify the Scope or Source Material sections. Those are fixed.
10. Append a changelog entry: `Pass 3 (Prose & Conciseness): <one-line summary>`
PHASE3
)"
      ;;
  esac

  cat <<PROMPT
You are refining a documentation plan deliverable for t+, a decentralized exchange.

**Your file:** ${file}
**Pass:** ${pass} of ${PASSES_PER_FILE}

${phase_instructions}

---

## Deliverable Context

${context}

---

${SCOPE_SUMMARY}

---

$(if [[ "$pass" -le 2 ]]; then
cat <<'FINAL_INSTR'
IMPORTANT: You MUST use the Read tool on the deliverable file first, then use the Read tool on EVERY source material file listed in it BEFORE writing or editing anything. Do not skip any source files. Do not substitute your training knowledge for source files — only write what you can verify from files you read in this session. Then apply the phase instructions above.
FINAL_INSTR
else
cat <<'FINAL_INSTR'
Read the deliverable file, then apply the phase instructions above. You do NOT need to read source material files for this pass — focus only on prose quality.
FINAL_INSTR
fi)
PROMPT
}

# ── Git commit (serialized via mkdir lock) ───────────────────

git_commit_pass() {
  local deliverable=$1
  local pass=$2
  local file="docs-plan-deliverable-${deliverable}.md"

  local pass_labels=("" "structure-scope" "accuracy" "prose-conciseness")
  local label="${pass_labels[$pass]}"

  # Acquire lock using mkdir (atomic on all platforms)
  while ! mkdir "$GIT_LOCK_DIR" 2>/dev/null; do
    sleep 1
  done

  if git diff --quiet "$file" 2>/dev/null && git diff --cached --quiet "$file" 2>/dev/null; then
    log "Deliverable ${deliverable}, pass ${pass}: no changes to commit."
  else
    git add "$file"
    git commit -m "docs(deliverable-${deliverable}): pass ${pass}/${PASSES_PER_FILE} ${label}"
  fi

  # Release lock
  rmdir "$GIT_LOCK_DIR"
}

# ── Snapshot & restore locked sections ───────────────────────
#
# Models ignore "do not modify" instructions, so we snapshot
# the Scope and Source Material sections before each pass and
# restore them after. Locked region: from line 1 through the
# "## Content" heading (exclusive).

snapshot_locked_sections() {
  local file=$1
  local snapshot_file=$2
  # Everything from the start of the file up to (but not including) "## Content"
  awk '/^## Content$/{exit} {print}' "$file" > "$snapshot_file"
}

restore_locked_sections() {
  local file=$1
  local snapshot_file=$2
  local tmp_file="${file}.tmp"

  # Get the content section onward (from "## Content" to EOF)
  awk '/^## Content$/,0 {print}' "$file" > "$tmp_file"

  # Reassemble: snapshot header + content section
  cat "$snapshot_file" "$tmp_file" > "$file"
  rm -f "$tmp_file"
}

# ── Run a single pass ───────────────────────────────────────

run_pass() {
  local deliverable=$1
  local pass=$2
  local file="docs-plan-deliverable-${deliverable}.md"
  local logfile
  logfile=$(log_file "$deliverable" "$pass")
  local attempt=0
  local backoff=$INITIAL_BACKOFF
  local snapshot_file="${LOG_DIR}/.snapshot-${deliverable}.md"

  # Snapshot locked sections before the pass
  snapshot_locked_sections "$file" "$snapshot_file"

  while (( attempt < MAX_RETRIES )); do
    attempt=$((attempt + 1))
    log "Deliverable ${deliverable}, pass ${pass}/${PASSES_PER_FILE} (attempt ${attempt}/${MAX_RETRIES})"

    local prompt
    prompt=$(build_prompt "$file" "$pass" "$deliverable")

    # Run Claude Code in non-interactive mode
    if echo "$prompt" | claude --print \
        --allowedTools "Read,Edit,Write,Glob,Grep" \
        > "$logfile" 2>&1; then
      log "Deliverable ${deliverable}, pass ${pass} completed successfully."

      # Restore locked sections in case the model modified them
      restore_locked_sections "$file" "$snapshot_file"

      git_commit_pass "$deliverable" "$pass"
      rm -f "$snapshot_file"
      return 0
    else
      local exit_code=$?
      log "Deliverable ${deliverable}, pass ${pass} failed (exit ${exit_code}, attempt ${attempt}/${MAX_RETRIES})."
      if (( attempt < MAX_RETRIES )); then
        log "Retrying in ${backoff}s..."
        sleep "$backoff"
        backoff=$((backoff * 2))
      fi
    fi
  done

  rm -f "$snapshot_file"
  log "ERROR: Deliverable ${deliverable}, pass ${pass} failed after ${MAX_RETRIES} attempts."
  return 1
}

# ── Run all passes for one deliverable (sequential) ─────────

run_deliverable() {
  local deliverable=$1

  for pass in $(seq 1 $PASSES_PER_FILE); do
    if ! run_pass "$deliverable" "$pass"; then
      log "ABORT: Deliverable ${deliverable} failed at pass ${pass}. Stopping further passes."
      return 1
    fi
    # Small delay between passes for the same file to avoid burst
    if (( pass < PASSES_PER_FILE )); then
      sleep 2
    fi
  done

  log "Deliverable ${deliverable}: all ${PASSES_PER_FILE} passes complete."
  return 0
}

# ── Main orchestrator ────────────────────────────────────────

main() {
  log "Starting documentation refinement pipeline"
  log "  Deliverables: ${TOTAL_DELIVERABLES}"
  log "  Passes per file: ${PASSES_PER_FILE} (structure-scope → accuracy → prose-conciseness)"
  log "  Max concurrent: ${MAX_CONCURRENT}"
  log "  Logs: ${LOG_DIR}/"
  echo ""

  # Verify all deliverable files exist
  local missing=0
  for i in $(seq 1 $TOTAL_DELIVERABLES); do
    if [[ ! -f "docs-plan-deliverable-${i}.md" ]]; then
      log "WARNING: docs-plan-deliverable-${i}.md does not exist."
      missing=$((missing + 1))
    fi
  done

  if (( missing > 0 )); then
    log "ERROR: ${missing} deliverable file(s) missing. Run step 1 first to create them."
    exit 1
  fi

  # Verify all context files exist
  local missing_ctx=0
  for i in $(seq 1 $TOTAL_DELIVERABLES); do
    if [[ ! -f "${PROMPTS_DIR}/deliverable-${i}-context.md" ]]; then
      log "WARNING: ${PROMPTS_DIR}/deliverable-${i}-context.md does not exist."
      missing_ctx=$((missing_ctx + 1))
    fi
  done

  if (( missing_ctx > 0 )); then
    log "ERROR: ${missing_ctx} context file(s) missing in ${PROMPTS_DIR}/."
    exit 1
  fi

  # Check that claude CLI is available
  if ! command -v claude &>/dev/null; then
    log "ERROR: 'claude' CLI not found in PATH."
    exit 1
  fi

  local pids=()
  local pid_to_deliverable=()
  local next_deliverable=1
  local active=0
  local total_success=0
  local total_fail=0

  # Launch initial batch
  while (( next_deliverable <= TOTAL_DELIVERABLES && active < MAX_CONCURRENT )); do
    log "Launching deliverable ${next_deliverable} in background..."
    run_deliverable "$next_deliverable" &
    local pid=$!
    pids+=("$pid")
    pid_to_deliverable[$pid]=$next_deliverable
    active=$((active + 1))
    next_deliverable=$((next_deliverable + 1))

    # Stagger launches to avoid rate limit bursts
    if (( next_deliverable <= TOTAL_DELIVERABLES && active < MAX_CONCURRENT )); then
      sleep "$SPAWN_DELAY"
    fi
  done

  # Wait for jobs to complete and backfill the pool
  while (( ${#pids[@]} > 0 )); do
    local new_pids=()
    local still_running=false

    for pid in "${pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        # Still running
        new_pids+=("$pid")
        still_running=true
      else
        # Process finished — check exit status
        if wait "$pid"; then
          local d=${pid_to_deliverable[$pid]}
          log "Deliverable ${d} finished successfully."
          total_success=$((total_success + 1))
        else
          local d=${pid_to_deliverable[$pid]}
          log "Deliverable ${d} finished with errors."
          FAILED_DELIVERABLES+=("$d")
          total_fail=$((total_fail + 1))
        fi
        active=$((active - 1))

        # Backfill: launch next deliverable if any remain
        if (( next_deliverable <= TOTAL_DELIVERABLES )); then
          sleep "$SPAWN_DELAY"
          log "Launching deliverable ${next_deliverable} in background..."
          run_deliverable "$next_deliverable" &
          local new_pid=$!
          new_pids+=("$new_pid")
          pid_to_deliverable[$new_pid]=$next_deliverable
          active=$((active + 1))
          next_deliverable=$((next_deliverable + 1))
        fi
      fi
    done

    pids=("${new_pids[@]+"${new_pids[@]}"}")

    # Avoid tight-looping — poll every 5 seconds
    if [[ "$still_running" == true ]]; then
      sleep 5
    fi
  done

  # ── Summary ──────────────────────────────────────────────

  echo ""
  log "═══════════════════════════════════════════"
  log "  Refinement pipeline complete"
  log "  Succeeded: ${total_success} / ${TOTAL_DELIVERABLES}"
  log "  Failed:    ${total_fail} / ${TOTAL_DELIVERABLES}"
  if (( ${#FAILED_DELIVERABLES[@]} > 0 )); then
    log "  Failed deliverables: ${FAILED_DELIVERABLES[*]}"
  fi
  log "  Logs:      ${LOG_DIR}/"
  log "═══════════════════════════════════════════"

  if (( total_fail > 0 )); then
    exit 1
  fi
}

main "$@"
