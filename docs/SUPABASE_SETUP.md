# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: task-brain
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to you
5. Click **"Create new project"** (takes ~2 minutes)

## 2. Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **"Run"**
5. You should see ✅ "Success. No rows returned"

## 3. Create Storage Bucket

1. Go to **Storage** in the sidebar
2. Click **"New bucket"**
3. Name: `task-attachments`
4. **Public bucket**: Yes (so files are accessible)
5. Click **"Create bucket"**

## 4. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

3. Add them to your `.env` file

## 5. Test the Connection

Run your app:
```bash
npm run dev
```

Create a task in the chat - it should now save to Supabase!

## 6. Optional: Email Integration (Advanced)

To enable email forwarding:

1. Set up **Supabase Edge Functions** or use a service like:
   - [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook)
   - [Mailgun Routes](https://documentation.mailgun.com/en/latest/user_manual.html#routes)
   
2. Configure DNS for `@taskbrain.app` (or your domain)

3. Create webhook endpoint that:
   - Parses incoming email
   - Extracts task ID from recipient
   - Uploads attachments to Supabase Storage
   - Adds content to task description

Example webhook code is in `services/emailService.ts`.

## 7. Deploy to Vercel

When deploying to Vercel:

1. Add environment variables in Vercel dashboard:
   - `API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Deploy with:
```bash
vercel
```

Done! 🚀

