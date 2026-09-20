import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Cross-device email confirmation.
 *
 * The PKCE `code` flow keeps half the exchange in the browser that started
 * signup, so opening the link on a phone when you signed up on a laptop fails
 * with "code verifier not found". A token hash carries everything needed, so
 * it works wherever the link is opened.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = (params.get('type') ?? 'email') as EmailOtpType;
  const next = params.get('next');

  if (tokenHash) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      // Recovery needs the session it just created; confirmation does not.
      if (type === 'recovery') {
        return NextResponse.redirect(new URL(next ?? '/auth/reset', request.url));
      }
      return NextResponse.redirect(
        new URL('/login?confirmed=1', request.url));
    }

    // An expired or already-used token is the common case here, and it usually
    // means the address is confirmed already — say so rather than alarm them.
    const message = /expired|invalid|not found|already/i.test(error.message)
      ? 'already-confirmed'
      : encodeURIComponent(error.message);
    return NextResponse.redirect(new URL('/login?notice=' + message, request.url));
  }

  const errDesc = params.get('error_description');
  if (errDesc) {
    return NextResponse.redirect(
      new URL('/login?error=' + encodeURIComponent(errDesc), request.url));
  }

  return NextResponse.redirect(new URL('/login?notice=already-confirmed', request.url));
}
