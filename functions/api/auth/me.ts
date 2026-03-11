// Get current user info from session
import type { Env } from '../types';
import { getSession, jsonResponse } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  // Get rate limit info (10 per hour)
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const rateLimitKey = `ratelimit:${session.user_id}:${hourBucket}`;
  const used = parseInt((await env.KV.get(rateLimitKey)) || '0', 10);

  return jsonResponse({
    user: {
      id: session.user_id,
      handle: session.handle,
      display_name: session.display_name,
      avatar_url: session.avatar_url,
    },
    remaining_submissions: Math.max(0, 10 - used),
  });
};
