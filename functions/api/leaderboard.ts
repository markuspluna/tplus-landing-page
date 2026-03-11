// Get leaderboard - top scores
import type { Env } from './types';
import { jsonResponse } from './types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const results = await env.DB.prepare(
    `SELECT
       u.handle,
       u.avatar_url,
       u.best_score,
       COUNT(s.id) as submission_count
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id
     WHERE u.best_score IS NOT NULL
     GROUP BY u.id
     ORDER BY u.best_score ASC
     LIMIT 100`
  ).all();

  const entries = (results.results || []).map((row: Record<string, unknown>) => ({
    handle: row.handle as string,
    avatar_url: row.avatar_url as string,
    best_score: row.best_score as number,
    submission_count: row.submission_count as number,
  }));

  return jsonResponse({ entries });
};
