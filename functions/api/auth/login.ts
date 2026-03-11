// Twitter OAuth 2.0 PKCE - Initiate login
import type { Env } from '../types';
import { randomId } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const siteUrl = env.SITE_URL || 'https://ctf.tplus.cx';

  // Generate PKCE code verifier and challenge
  const codeVerifier = randomId(64);
  const state = randomId(32);

  // Generate code challenge (S256)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Store code verifier in KV (expires in 10 minutes)
  await env.KV.put(`oauth:${state}`, JSON.stringify({ code_verifier: codeVerifier }), {
    expirationTtl: 600,
  });

  const redirectUri = `${siteUrl}/api/auth/callback`;
  const scopes = 'tweet.read users.read';

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.TWITTER_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return Response.redirect(authUrl.toString(), 302);
};
