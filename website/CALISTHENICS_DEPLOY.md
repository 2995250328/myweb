# Calisthenics Cloud Deployment

This page can run in two storage modes:

- Local fallback: `website/data/calisthenics-progress.json`
- Cloud mode: Supabase table, enabled by environment variables

For a real public website, use cloud mode plus an access code.

## Recommended Stack

Use Vercel for the Next.js website and Supabase for progress storage.

Why this stack:

- Vercel runs this Next.js app without needing your Mac online.
- Supabase stores the shared progress in a hosted Postgres database.
- All devices read and write the same progress through `/api/calisthenics-progress`.
- `CALISTHENICS_ACCESS_CODE` prevents casual visitors from editing your records.

## Supabase Setup

Create a Supabase project, then run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.calisthenics_progress (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.calisthenics_progress enable row level security;
```

The app uses the server-side Supabase service role key from a Next.js API route.
Do not expose the service role key in client-side code.

## Vercel Setup

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Set the project root to `website`.
4. Add these environment variables in Vercel:

```text
CALISTHENICS_ACCESS_CODE=<a long private code>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
```

5. Deploy.
6. Open:

```text
https://<your-vercel-domain>/calisthenics
```

The first visit will ask for the access code. Each device stores the code in
that device browser's local storage, while the actual training progress is kept
in Supabase.

## Local Development

Without Supabase env vars:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Progress is saved to:

```text
website/data/calisthenics-progress.json
```

With Supabase env vars in `.env.local`, local development writes to the cloud
database instead.

## Data Privacy

The current protection is a simple shared access code. That is enough for a
personal private training tracker with an unlisted URL, but not enough for a
multi-user product. If this becomes more than your personal page, add proper
Supabase Auth or another real login provider.
