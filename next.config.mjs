export default {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

notepad supabase/migrations/0007_messaging.sql



sign up email:-

Two things worth knowing about Supabase's built-in email:

It's rate-limited — a handful of messages per hour on the free tier. Fine for testing, not for launch.

It sends from Supabase's domain, so it often lands in spam. For real signups you'd connect your own SMTP under Project Settings → Authentication → SMTP Settings — Resend or Postmark, sending from noreply@projectconnect.app. Say the word and I'll walk you through it.