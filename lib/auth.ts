import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = 'google' | 'apple';

function extractTokens(url: string): { access_token: string; refresh_token: string } | null {
  const hashIdx = url.indexOf('#');
  const fragment = hashIdx >= 0 ? url.slice(hashIdx + 1) : '';
  const queryIdx = url.indexOf('?');
  const query = queryIdx >= 0 ? url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined) : '';

  const parse = (s: string): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!s) return out;
    for (const pair of s.split('&')) {
      const [k, v] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    }
    return out;
  };

  const params = { ...parse(query), ...parse(fragment) };
  if (params.access_token && params.refresh_token) {
    return { access_token: params.access_token, refresh_token: params.refresh_token };
  }
  return null;
}

async function signInWithOAuthProvider(provider: OAuthProvider) {
  const redirectTo = makeRedirectUri({ scheme: 'facadelens', path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('OAuth URL not returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('OAuth cancelled');
  }

  const tokens = extractTokens(result.url);
  if (!tokens) throw new Error('OAuth response missing tokens');

  const { error: sessionErr } = await supabase.auth.setSession(tokens);
  if (sessionErr) throw sessionErr;
}

export async function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export async function signInWithApple() {
  return signInWithOAuthProvider('apple');
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
