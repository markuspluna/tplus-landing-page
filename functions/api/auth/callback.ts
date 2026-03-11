// Twitter OAuth 2.0 PKCE - Handle callback
import type { Env } from '../types';
import { randomId } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const siteUrl = env.SITE_URL || 'https://ctf.tplus.cx';
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return Response.redirect(`${siteUrl}/beat-saylor?error=auth_failed`, 302);
  }

  // Retrieve code verifier from KV
  const oauthData = await env.KV.get(`oauth:${state}`, 'json') as { code_verifier: string } | null;
  if (!oauthData) {
    return Response.redirect(`${siteUrl}/beat-saylor?error=invalid_state`, 302);
  }

  await env.KV.delete(`oauth:${state}`);

  const redirectUri = `${siteUrl}/api/auth/callback`;

  // Exchange code for access token
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: oauthData.code_verifier,
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${siteUrl}/beat-saylor?error=token_failed`, 302);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Fetch user profile
  const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return Response.redirect(`${siteUrl}/beat-saylor?error=profile_failed`, 302);
  }

  const userData = (await userRes.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  const { id, username, name, profile_image_url } = userData.data;

  // Upsert user in D1
  await env.DB.prepare(
    `INSERT INTO users (id, handle, display_name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET handle = ?, display_name = ?, avatar_url = ?`
  )
    .bind(id, username, name, profile_image_url || '', Date.now(), username, name, profile_image_url || '')
    .run();

  // Create session
  const sessionId = randomId(48);
  const sessionData = {
    user_id: id,
    handle: username,
    display_name: name,
    avatar_url: profile_image_url || '',
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  await env.KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days
  });

  // Set cookie and redirect
  const cookie = `bs_session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${siteUrl}/beat-saylor`,
      'Set-Cookie': cookie,
    },
  });
};
