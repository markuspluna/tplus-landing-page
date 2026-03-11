// Shared types for Cloudflare Pages Functions

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  SITE_URL: string; // e.g., https://ctf.tplus.cx
}

export interface SessionData {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  expires_at: number;
}

export interface User {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  created_at: number;
  best_score: number | null;
}

export interface Submission {
  id: string;
  user_id: string;
  strategy_text: string;
  execution_cost_bps: number;
  execution_cost_usd: number;
  annual_holding_cost_usd: number;
  effective_price: number;
  confidence: number;
  feedback: string;
  strategy_summary: string;
  instruments: string;
  penalties: string;
  raw_ai_response: string;
  created_at: number;
  score_vs_saylor: number;
}

// Helper: get session from cookie
export async function getSession(request: Request, env: Env): Promise<SessionData | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/bs_session=([^;]+)/);
  if (!match) return null;

  const sessionId = match[1];
  const data = await env.KV.get(`session:${sessionId}`, 'json');
  if (!data) return null;

  const session = data as SessionData;
  if (session.expires_at < Date.now()) {
    await env.KV.delete(`session:${sessionId}`);
    return null;
  }

  return session;
}

// Helper: generate random string
export function randomId(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

// Helper: JSON response
export function jsonResponse(data: unknown, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
