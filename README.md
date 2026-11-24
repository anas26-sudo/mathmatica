# Mathmatica — AI Eng. Anas Ayman

Next.js 14 (App Router) + Tailwind + Lucide + Supabase (optional).

## 1. Preview now (demo mode, no database)
```bash
npm install
cp .env.local.example .env.local
npm run dev        # http://localhost:3000
```
- Student demo codes: `MATH-101` … `MATH-106`
- Teacher password: `anas2026` (change it in `.env.local`)
- Demo data lives in your browser only (Admin → "Reset demo data" clears it).

## 2. Connect the free database (Supabase)
1. Create a free project at https://supabase.com.
2. Open **SQL Editor**, paste the contents of `supabase.sql`, click **Run**. This creates the tables and the public `homework` photo bucket.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public key**.
4. Put them in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=choose-a-strong-password
```
5. Restart `npm run dev`. The yellow "Demo mode" bar disappears and everything is stored in Supabase.
   Add students from the Students tab, then publish homework from the Homework tab.

## 3. Deploy free on Vercel
1. Push this folder to a GitHub repository (`.env.local` is git-ignored).
2. Go to https://vercel.com → **Add New → Project** → import the repo.
3. Under **Environment Variables** add the same three variables from step 2.4.
4. Click **Deploy**. You get a link like `https://mathmatica.vercel.app` — put it in your Instagram/Facebook bio.
5. Optional: Project → **Settings → Domains** to add your own domain.

## Security note
The teacher password is checked in the browser and the database policies are open, which is fine for a small class
but not for sensitive data. To harden later: move the admin login to a Next.js API route and tighten the Supabase policies.
