// Logout - clear session
import type { Env } from '../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const siteUrl = env.SITE_URL || 'https://ctf.tplus.cx';

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/bs_session=([^;]+)/);
  if (match) {
    await env.KV.delete(`session:${match[1]}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl}/beat-saylor`,
      'Set-Cookie': 'bs_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });
};
