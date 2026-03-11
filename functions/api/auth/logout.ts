// Logout - clear session
import type { Env } from '../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/bs_session=([^;]+)/);
  if (match) {
    await env.KV.delete(`session:${match[1]}`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'bs_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
