// Retry saving a cached submission to D1
import type { Env } from './types';
import { getSession, jsonResponse, randomId } from './types';
import { SAYLOR_BENCHMARK } from './judge-prompt';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ error: 'Authentication required.' }, 401);
  }

  let body: { retry_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const retryId = body.retry_id;
  if (!retryId) {
    return jsonResponse({ error: 'Missing retry_id' }, 400);
  }

  // Fetch cached result from KV
  const pendingKey = `pending:${session.user_id}:${retryId}`;
  const cached = await env.KV.get(pendingKey);
  if (!cached) {
    return jsonResponse({ error: 'No cached result found. It may have expired — please resubmit.' }, 404);
  }

  const data = JSON.parse(cached) as {
    submissionId: string;
    userId: string;
    strategy: string;
    aiResult: {
      execution_cost_bps: number;
      execution_cost_usd: number;
      annual_holding_cost_usd: number;
      effective_price_per_btc: number;
      confidence: number;
      feedback: string;
      strategy_summary: string;
      instruments: string[];
      penalties: string[];
    };
    effectivePrice: number;
    scoreVsSaylor: number;
    now: number;
  };

  // Verify the cached result belongs to this user
  if (data.userId !== session.user_id) {
    return jsonResponse({ error: 'Unauthorized' }, 403);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO submissions (id, user_id, strategy_text, execution_cost_bps, execution_cost_usd,
       annual_holding_cost_usd, effective_price, confidence, feedback, strategy_summary,
       instruments, penalties, raw_ai_response, created_at, score_vs_saylor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        randomId(24),
        data.userId,
        data.strategy,
        data.aiResult.execution_cost_bps,
        data.aiResult.execution_cost_usd,
        data.aiResult.annual_holding_cost_usd,
        data.effectivePrice,
        data.aiResult.confidence,
        data.aiResult.feedback,
        data.aiResult.strategy_summary,
        JSON.stringify(data.aiResult.instruments),
        JSON.stringify(data.aiResult.penalties),
        JSON.stringify(data.aiResult),
        data.now,
        data.scoreVsSaylor
      )
      .run();

    const currentBest = await env.DB.prepare('SELECT best_score FROM users WHERE id = ?')
      .bind(data.userId)
      .first<{ best_score: number | null }>();

    if (!currentBest?.best_score || data.effectivePrice < currentBest.best_score) {
      await env.DB.prepare('UPDATE users SET best_score = ? WHERE id = ?')
        .bind(data.effectivePrice, data.userId)
        .run();
    }

    const userBest = Math.min(data.effectivePrice, currentBest?.best_score ?? Infinity);
    const rankResult = await env.DB.prepare(
      'SELECT COUNT(*) as rank FROM users WHERE best_score IS NOT NULL AND best_score < ?'
    )
      .bind(userBest)
      .first<{ rank: number }>();
    const rank = (rankResult?.rank ?? 0) + 1;

    // Clean up the KV cache
    await env.KV.delete(pendingKey);

    return jsonResponse({ success: true, rank });
  } catch (dbErr) {
    console.error('Retry save failed:', dbErr);
    return jsonResponse({ error: 'Save failed again. Please try once more.' }, 502);
  }
};
