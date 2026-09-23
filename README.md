# 222 Solutions Kanban

A Trello-style kanban board with built-in Cumulative Flow Diagram and burndown
charts, computed from an append-only card activity log rather than bolted on
after the fact.

## Stack

Next.js 16 (App Router) · Supabase (Postgres, Auth, Realtime) · Tailwind +
shadcn/ui · dnd-kit · Recharts.

## One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the
   free tier is fine).
2. **Run the schema migration**: open the Supabase dashboard → SQL Editor →
   paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   → Run. This creates every table, RLS policy, and helper function the app
   needs.
3. **Get your API keys**: Project Settings → API. You need the Project URL,
   the `anon` public key, and the `service_role` key.
4. **Set environment variables**: copy `.env.local.example` to `.env.local`
   and fill in the three values from step 3.
5. **Enable email confirmations (optional)**: by default Supabase requires
   confirming sign-up emails before login works. For faster local testing you
   can turn this off under Authentication → Providers → Email → "Confirm
   email".
6. Regenerate types once your project is live (optional, replaces the
   hand-written `src/lib/db/types.ts`):
   ```bash
   npx supabase gen types typescript --project-id <your-project-id> > src/lib/db/types.ts
   ```

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). First visit redirects to
sign-up; after confirming your account you'll be asked to name your first
workspace, then land on its (empty) boards list.

## How the charts work

Every card move, archive, and sprint assignment is appended to `card_events`.
- **CFD** (`src/lib/analytics/cfd.ts`) replays those events to compute, per
  day, how many cards have ever reached each column or a later one —
  a monotonically non-decreasing "arrival count" per stage.
- **Burndown** (`src/lib/analytics/burndown.ts`) replays events to compute,
  per day of a sprint, how many of that sprint's cards are not yet in a
  column marked "Done".

## Deployment

Deploy to Vercel and set the same three environment variables there. No
server-side build step beyond `next build` is required.
