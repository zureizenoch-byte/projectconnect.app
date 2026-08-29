# Project Connect — web app

Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage) + Stripe.
Matched small-group meetups and Speaker Series talks, organised by city chapter.

## What's implemented

| Area | Where |
|---|---|
| Email + password auth, roles at signup | `app/signup`, `app/login`, `app/actions/auth.ts` |
| Profile + experience mapping (click-to-add chips, "Other" write-ins) | `app/profile`, `components/ChipGroup.tsx`, `lib/options.ts` |
| Student / immigrant fields | `app/profile/ProfileForm.tsx` |
| Events (meetups + talks in one schedule), RSVP, seat caps, waitlist | `app/events`, `app/actions/events.ts` |
| Google Maps directions per venue | `lib/matching.ts` (`mapsUrl`) |
| Auto-matching by domain + role level, Lead override | `lib/matching.ts`, `app/chapter` |
| Speaker dashboard (talks, requests, attendees, past talks) | `app/speaker` |
| Chapter Lead dashboard (calendar, seating, tables) | `app/chapter` |
| Admin (access requests, event approval, venues, reports, audit log) | `app/admin`, `app/actions/admin.ts` |
| Tier gating (free = 1 event/cycle, no talks) | `lib/tiers.ts` + DB trigger `enforce_seat_rules` |
| Stripe checkout + webhook | `app/api/checkout`, `app/api/stripe/webhook` |
| Privacy settings + versioned consent records | `app/profile/PrivacyForm.tsx`, `lib/legal.ts` |

Rules are enforced in the **database**, not only the UI: `enforce_seat_rules` blocks
talk RSVPs without a paid plan, blocks a second free-tier event in a cycle, and pushes
over-capacity confirmations to the waitlist. Row Level Security governs every table.

## Local setup

1. `npm install`
2. `cp .env.example .env.local` and fill in the Supabase values.
3. Create a Supabase project. In **SQL Editor**, run `supabase/migrations/0001_init.sql`,
   then optionally `supabase/seed.sql` for demo chapters, venues and events.
4. In **Storage**, create a public bucket named `avatars`.
5. In **Authentication → Providers**, keep Email enabled. For a fast start turn off
   "Confirm email"; leave it on for production.
6. `npm run dev` → http://localhost:3000

### Making yourself an admin

Sign up normally, then in the Supabase SQL editor:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

Chapter Leads and Speakers are then granted from **Admin → Access requests**: a member
applies from their profile, you approve, and the approval writes the role plus the chapter
it applies to. Free members cannot apply to lead a chapter.

## Stripe

Create four prices in Stripe and put their IDs in `.env`:

| Plan | Type | Amount |
|---|---|---|
| Monthly | recurring, monthly | $7.99 CAD |
| 6-Month Pass | one-time | $35 CAD |
| Annual | recurring, yearly | $49 CAD |
| 12-Month Pass | one-time | $49 CAD |

Webhook endpoint: `https://projectconnect.app/api/stripe/webhook`, events
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

Leaving `STRIPE_SECRET_KEY` blank runs the app with billing stubbed — everything else works.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project**, import the repo. Framework preset: Next.js.
3. Add every variable from `.env.example` under **Settings → Environment Variables**
   (`SUPABASE_SERVICE_ROLE_KEY` and the Stripe keys are server-side only — do not prefix
   them with `NEXT_PUBLIC_`).
4. Set `NEXT_PUBLIC_SITE_URL` to `https://projectconnect.app`.
5. Deploy.

## Pointing projectconnect.app (GoDaddy) at Vercel

You keep GoDaddy as the registrar; only DNS changes.

1. In Vercel: **Project → Settings → Domains → Add**, enter `projectconnect.app`.
   Vercel will show the records it wants.
2. In GoDaddy: **My Products → Domains → projectconnect.app → DNS → Manage Zones**.
3. Set the apex record:
   - Type `A`, Name `@`, Value `76.76.21.21`, TTL 600
4. Set the www record:
   - Type `CNAME`, Name `www`, Value `cname.vercel-dns.com`, TTL 600
   (Delete any conflicting existing `A`/`CNAME` on `@` or `www`, including GoDaddy's
   parking page records.)
5. Back in Vercel, wait for the domain to verify — usually minutes, up to an hour.
   Vercel issues the TLS certificate automatically.
6. In Supabase: **Authentication → URL Configuration**, set Site URL to
   `https://projectconnect.app` and add `https://projectconnect.app/auth/callback`
   to Redirect URLs.
7. Update the Stripe webhook endpoint to the live domain.

Always verify the exact IP/CNAME values in your own Vercel dashboard before saving —
Vercel has changed them before.

## Notes and next steps

- `app/events/EVENT_ID_FOLDER_page.tsx` must be moved to `app/events/[id]/page.tsx`
  before running — the authoring environment could not write square brackets in a path.
- Transactional email (verification, RSVP confirmations, seat-request notices) is not wired
  up yet. Supabase sends auth emails; add Resend or similar for the rest.
- The legal pages are shells — paste the approved Privacy Policy and Terms text in, and bump
  the version constants in `lib/legal.ts` when the wording changes.
