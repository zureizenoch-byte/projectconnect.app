import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const type = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next')
    ?? (type === 'signup' ? '/profile?welcome=1' : '/dashboard');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
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
