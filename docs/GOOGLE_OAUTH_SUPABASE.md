# Google OAuth Setup for Supabase

This guide explains how to configure Google OAuth for your Task Brain app using Supabase.

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Configure:
   - **Name**: Task Brain Auth
   - **Authorized JavaScript origins**:
     - `https://YOUR_PROJECT_REF.supabase.co`
     - `http://localhost:5173` (for local dev)
     - `https://kent.ertugrul.one` (your production domain)
   - **Authorized redirect URIs**:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - `http://localhost:5173` (optional, for local testing)
     - `https://kent.ertugrul.one` (your production domain)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Google OAuth in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Toggle **Enable Sign in with Google** to ON
6. Enter your credentials:
   - **Client ID**: Paste from Google Console
   - **Client Secret**: Paste from Google Console
7. Click **Save**

## Step 3: Configure Redirect URLs

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your site URLs:
   - **Site URL**: `https://kent.ertugrul.one`
   - **Redirect URLs** (add each on a new line):
     - `http://localhost:5173`
     - `https://kent.ertugrul.one`
     - `https://kent.ertugrul.one/**` (wildcard for all routes)

## Step 4: Update Your Environment Variables

No additional environment variables are needed in your app - Supabase handles the OAuth configuration server-side.

## Step 5: Test the OAuth Flow

1. Deploy your changes to Vercel
2. Visit `https://kent.ertugrul.one`
3. Click **"Continue with Google"**
4. You should be redirected to Google's OAuth consent screen
5. After approving, you'll be redirected back to your app and signed in
6. Your session should persist across browser refreshes

## Troubleshooting

### "OAuth redirect URI mismatch" error
- Make sure the redirect URI in Google Console exactly matches: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Find your Supabase project ref in the Supabase dashboard URL (e.g., `vjflwknbzdjkcnyzoiqb`)

### Google OAuth doesn't work on production
- Verify `https://kent.ertugrul.one` is added to:
  - Google Console → Authorized JavaScript origins
  - Supabase → Authentication → URL Configuration → Redirect URLs

### Session doesn't persist after OAuth
- Check browser console for errors
- Verify `localStorage` is enabled in your browser
- Clear browser cache and cookies, then try again

### "Provider not enabled" error
- Make sure Google provider is toggled ON in Supabase
- Verify Client ID and Secret are correctly saved
- Try toggling OFF and back ON to refresh the configuration

## Security Notes

- Never commit Google Client Secret to Git
- The Supabase Anon Key is safe to expose (it's public)
- Always use HTTPS in production for OAuth callbacks
- Consider adding your domain to Google's OAuth consent screen for better UX

