// Submit a strategy for AI evaluation
import type { Env } from './types';
import { getSession, jsonResponse, randomId } from './types';
import { JUDGE_SYSTEM_PROMPT, JUDGE_TOOLS, SAYLOR_BENCHMARK, getToolResult } from './judge-prompt';

interface CostBreakdown {
  exchange_fees_usd: number;
  slippage_usd: number;
  opportunity_cost_usd: number;
  funding_carry_usd: number;
  other_usd: number;
}

interface AiResult {
  execution_cost_bps: number;
  exchange_fees_bps: number;
  slippage_bps: number;
  execution_cost_usd: number;
  annual_holding_cost_usd: number;
  cost_breakdown: CostBreakdown;
  effective_price_per_btc: number;
  confidence: number;
  feedback: string;
  strategy_summary: string;
  instruments: string[];
  penalties: string[];
}

interface AnthropicContent {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason: string;
}

const MAX_TOOL_ROUNDS = 5;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // Auth required
  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ error: 'Authentication required. Please log in with X.' }, 401);
  }

  // Rate limiting: 10 per hour (increment optimistically to prevent race condition)
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const rateLimitKey = `ratelimit:${session.user_id}:${hourBucket}`;
  const used = parseInt((await env.KV.get(rateLimitKey)) || '0', 10);
  if (used >= 10) {
    return jsonResponse({ error: 'Rate limit exceeded. 10 submissions per hour.', remaining_submissions: 0 }, 429);
  }

  // Increment counter before AI call to close the TOCTOU race window
  await env.KV.put(rateLimitKey, String(used + 1), { expirationTtl: 3600 });

  // Parse input
  let body: { strategy?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const strategy = (body.strategy || '').trim();
  if (!strategy || strategy.length === 0) {
    return jsonResponse({ error: 'Strategy text is required' }, 400);
  }
  if (strategy.length > 500) {
    return jsonResponse({ error: 'Strategy must be 500 characters or less' }, 400);
  }

  // Call Anthropic API with tool-use loop
  let aiResult: AiResult | null = null;

  try {
    const messages: Array<{ role: string; content: string | AnthropicContent[] }> = [
      {
        role: 'user',
        content: `Evaluate this Bitcoin execution strategy:\n\n${strategy}`,
      },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: JUDGE_SYSTEM_PROMPT,
          tools: JUDGE_TOOLS,
          messages,
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error('Anthropic API error:', anthropicRes.status, errText);
        return jsonResponse({ error: 'AI evaluation failed. Please try again.' }, 502);
      }

      const data = (await anthropicRes.json()) as AnthropicResponse;

      // Check for submit_evaluation tool call — this is the final result
      const submitCall = data.content.find((b) => b.type === 'tool_use' && b.name === 'submit_evaluation');
      if (submitCall?.input) {
        aiResult = submitCall.input as unknown as AiResult;
        break;
      }

      // Collect data-retrieval tool uses
      const toolUses = data.content.filter((b) => b.type === 'tool_use');

      // If no tool calls at all, the model didn't use submit_evaluation — error
      if (toolUses.length === 0) {
        console.error('AI returned no tool calls and no submit_evaluation');
        break;
      }

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: data.content });

      // Add tool results
      const toolResults: AnthropicContent[] = toolUses.map((tu) => ({
        type: 'tool_result',
        tool_use_id: tu.id!,
        content: getToolResult(tu.name!),
      } as unknown as AnthropicContent));

      messages.push({ role: 'user', content: toolResults });
    }

    if (!aiResult) {
      // Decrement rate limit counter — don't penalize user for AI failure
      const current = parseInt((await env.KV.get(rateLimitKey)) || '0', 10);
      if (current > 0) {
        await env.KV.put(rateLimitKey, String(current - 1), { expirationTtl: 3600 });
      }
      return jsonResponse({ error: 'AI evaluation produced no result. Please try again.' }, 502);
    }
  } catch (e) {
    console.error('AI error:', e);
    // Decrement rate limit counter on failure (best-effort)
    const current = parseInt((await env.KV.get(rateLimitKey)) || '0', 10);
    if (current > 0) {
      await env.KV.put(rateLimitKey, String(current - 1), { expirationTtl: 3600 });
    }
    return jsonResponse({ error: 'AI evaluation failed. Please try again.' }, 502);
  }

  // Sanity check the score
  let effectivePrice = aiResult.effective_price_per_btc;
  if (effectivePrice < 60000 || effectivePrice > 120000) {
    effectivePrice = Math.max(60000, Math.min(120000, effectivePrice));
  }

  const scoreVsSaylor = effectivePrice - SAYLOR_BENCHMARK;
  const submissionId = randomId(24);
  const now = Date.now();

  // Store in D1 — retry once on failure before giving up
  let rank = 1;
  let dbSaved = false;
  for (let attempt = 0; attempt < 2 && !dbSaved; attempt++) {
    try {
      await env.DB.prepare(
        `INSERT INTO submissions (id, user_id, strategy_text, execution_cost_bps, execution_cost_usd,
         annual_holding_cost_usd, effective_price, confidence, feedback, strategy_summary,
         instruments, penalties, raw_ai_response, created_at, score_vs_saylor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          attempt === 0 ? submissionId : randomId(24),
          session.user_id,
          strategy,
          aiResult.execution_cost_bps,
          aiResult.execution_cost_usd,
          aiResult.annual_holding_cost_usd,
          effectivePrice,
          aiResult.confidence,
          aiResult.feedback,
          aiResult.strategy_summary,
          JSON.stringify(aiResult.instruments),
          JSON.stringify(aiResult.penalties),
          JSON.stringify(aiResult),
          now,
          scoreVsSaylor
        )
        .run();

      const currentBest = await env.DB.prepare('SELECT best_score FROM users WHERE id = ?')
        .bind(session.user_id)
        .first<{ best_score: number | null }>();

      if (!currentBest?.best_score || effectivePrice < currentBest.best_score) {
        await env.DB.prepare('UPDATE users SET best_score = ? WHERE id = ?')
          .bind(effectivePrice, session.user_id)
          .run();
      }

      const userBest = Math.min(effectivePrice, currentBest?.best_score ?? Infinity);
      const rankResult = await env.DB.prepare(
        'SELECT COUNT(*) as rank FROM users WHERE best_score IS NOT NULL AND best_score < ?'
      )
        .bind(userBest)
        .first<{ rank: number }>();
      rank = (rankResult?.rank ?? 0) + 1;
      dbSaved = true;
    } catch (dbErr) {
      console.error(`D1 write attempt ${attempt + 1} failed:`, dbErr);
    }
  }

  if (!dbSaved) {
    // Return the result but warn the user their score wasn't saved
    return jsonResponse({
      id: submissionId,
      effective_price: effectivePrice,
      score_vs_saylor: scoreVsSaylor,
      rank: null,
      remaining_submissions: Math.max(0, 10 - (used + 1)),
      feedback: aiResult.feedback,
      strategy_summary: aiResult.strategy_summary,
      penalties: aiResult.penalties,
      instruments: aiResult.instruments,
      execution_cost_bps: aiResult.execution_cost_bps,
      exchange_fees_bps: aiResult.exchange_fees_bps ?? null,
      slippage_bps: aiResult.slippage_bps ?? null,
      cost_breakdown: aiResult.cost_breakdown ?? null,
      db_error: 'Your score was evaluated but could not be saved to the leaderboard. Please try submitting again.',
    });
  }

  return jsonResponse({
    id: submissionId,
    effective_price: effectivePrice,
    score_vs_saylor: scoreVsSaylor,
    rank,
    remaining_submissions: Math.max(0, 10 - (used + 1)),
    feedback: aiResult.feedback,
    strategy_summary: aiResult.strategy_summary,
    penalties: aiResult.penalties,
    instruments: aiResult.instruments,
    execution_cost_bps: aiResult.execution_cost_bps,
    exchange_fees_bps: aiResult.exchange_fees_bps ?? null,
    slippage_bps: aiResult.slippage_bps ?? null,
    cost_breakdown: aiResult.cost_breakdown ?? null,
  });
};
