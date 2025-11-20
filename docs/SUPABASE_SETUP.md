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

## 2. Enable Authentication

1. Go to **Authentication** → **Providers** in the sidebar
2. Enable **Email** provider (enabled by default)
3. (Optional) Enable **Google** provider:
   - Click on **Google**
   - Toggle **Enable Google provider**
   - Add your Google OAuth credentials (Client ID and Secret)
   - Add authorized redirect URL: `https://your-project.supabase.co/auth/v1/callback`
4. Configure email templates if needed (under **Email Templates**)

## 3. Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **"Run"**
5. You should see ✅ "Success. No rows returned"

## 4. Create Storage Bucket

1. Go to **Storage** in the sidebar
2. Click **"New bucket"**
3. Name: `task-attachments`
4. **Public bucket**: Yes (so files are accessible via public URLs)
5. Click **"Create bucket"**

### Storage Bucket Policies (Optional but Recommended)

After creating the bucket, you can set up Row Level Security policies in the SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Allow authenticated users to read files
CREATE POLICY "Users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');
```

**Note**: If you're testing without authentication (RLS disabled), you can skip these policies for now.

## 5. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

3. Add them to your `.env` file

## 6. Test the Connection

Run your app:
```bash
npm run dev
```

Create a task in the chat - it should now save to Supabase!

## 7. Authentication

The app now requires users to sign in before accessing tasks. Users can:
- Sign up with email/password
- Sign in with email/password
- Sign in with Google (if configured)
- Reset password via email

All tasks are automatically associated with the authenticated user.

## 8. Optional: Email Integration (Advanced)

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

## 9. Deploy to Vercel

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

