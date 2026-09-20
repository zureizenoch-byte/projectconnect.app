import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next')
    ?? (type === 'recovery' ? '/auth/reset' : '/dashboard');

  // A token hash works on any device; prefer it when one is present.
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  if (tokenHash) {
    const url = new URL('/auth/confirm', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));

    // "code verifier not found" means the link was opened somewhere other than
    // the browser that signed up — almost always a confirmed address already.
    const verifierMissing = /verifier|pkce|code challenge/i.test(error.message);
    if (verifierMissing) {
      return NextResponse.redirect(
        new URL('/login?notice=already-confirmed', request.url));
    }
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent(error.message), request.url));
  }

  // Supabase also sends errors back on this route
  const errDesc = request.nextUrl.searchParams.get('error_description');
  if (errDesc) {
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(errDesc), request.url));
  }

  return NextResponse.redirect(new URL('/login?error=expired', request.url));
}
