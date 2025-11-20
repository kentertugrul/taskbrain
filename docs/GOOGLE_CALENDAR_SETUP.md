# Google Calendar API Setup Guide

This guide will walk you through setting up Google Calendar API integration for Task Brain.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top (next to "Google Cloud")
4. Click **"New Project"**
5. Enter a project name (e.g., "Task Brain Calendar")
6. Click **"Create"**
7. Wait for the project to be created (usually takes a few seconds)
8. Select your new project from the dropdown

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"** (or click [here](https://console.cloud.google.com/apis/library))
2. In the search bar, type **"Google Calendar API"**
3. Click on **"Google Calendar API"** from the results
4. Click the **"Enable"** button
5. Wait for the API to be enabled (you'll see a success message)

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen:

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (or click [here](https://console.cloud.google.com/apis/credentials/consent))
2. Select **"External"** (unless you have a Google Workspace account, then you can use "Internal")
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: Task Brain (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the **Scopes** page, click **"Add or Remove Scopes"**
7. Search for and add these scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
8. Click **"Update"**, then **"Save and Continue"**
9. On the **Test users** page (if External):
   - Click **"Add Users"**
   - Add your own email address
   - Click **"Add"**
10. Click **"Save and Continue"**
11. Review the summary and click **"Back to Dashboard"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (or click [here](https://console.cloud.google.com/apis/credentials))
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in the form:
   - **Name**: Task Brain Web Client (or any name you prefer)
   - **Authorized JavaScript origins**:
     - For development: `http://localhost:5173`
     - For production: `https://your-domain.vercel.app` (add your actual Vercel URL)
   - **Authorized redirect URIs**:
     - For development: `http://localhost:5173`
     - For production: `https://your-domain.vercel.app` (add your actual Vercel URL)
6. Click **"Create"**
7. A popup will appear with your **Client ID** and **Client Secret**
8. **Copy the Client ID** (you'll need this for your `.env` file)
   - It looks like: `123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`
9. Click **"OK"**

## Step 5: Add Client ID to Your Project

1. Open your project's `.env` file (create it if it doesn't exist in the root directory)
2. Add the following line:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
   Replace `your_client_id_here` with the Client ID you copied in Step 4.

3. Your `.env` file should now look something like this:
   ```env
   # Google Gemini API Key
   API_KEY=your_gemini_api_key_here

   # Supabase (Required for production)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Google Calendar API
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
   ```

4. Save the file

## Step 6: Restart Your Development Server

1. Stop your development server (if running) by pressing `Ctrl+C` in the terminal
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 7: Test the Integration

1. Open your app in the browser (usually `http://localhost:5173`)
2. Sign in to your account
3. Go to the **Dashboard** page
4. Click **"Connect Google Calendar"**
5. You should see a Google sign-in popup
6. Sign in with your Google account
7. Review and accept the permissions (calendar read access)
8. You should now see all your calendars listed
9. Select the calendars you want to sync
10. Click **"Sync Selected"**

## Troubleshooting

### "Google Client ID not configured" error
- Make sure you've added `VITE_GOOGLE_CLIENT_ID` to your `.env` file
- Make sure the variable name starts with `VITE_` (required for Vite)
- Restart your development server after adding the variable

### "Token expired" error
- Google tokens expire after 1 hour
- Simply click "Connect Google Calendar" again to refresh

### "Failed to load calendars" error
- Check that Google Calendar API is enabled in your Google Cloud project
- Verify your OAuth consent screen is configured
- Make sure you've added your email as a test user (if using External app type)

### Redirect URI mismatch
- Make sure the redirect URI in your OAuth credentials matches exactly:
  - Development: `http://localhost:5173` (no trailing slash)
  - Production: Your exact Vercel URL (no trailing slash)

### "Access blocked" error
- If your app is in "Testing" mode, only test users can access it
- Add your email as a test user in OAuth consent screen
- Or publish your app (requires verification for production use)

## For Production (Vercel)

When deploying to Vercel:

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: Your Google Client ID
4. Make sure to add the production URL to your OAuth credentials:
   - Go back to Google Cloud Console → Credentials
   - Edit your OAuth client
   - Add your Vercel URL to both:
     - Authorized JavaScript origins: `https://your-app.vercel.app`
     - Authorized redirect URIs: `https://your-app.vercel.app`
5. Redeploy your app on Vercel

## Security Notes

- Never commit your `.env` file to Git (it should be in `.gitignore`)
- The Client ID is safe to expose in frontend code (it's public)
- The Client Secret should NEVER be used in frontend code (we don't use it here)
- For production, consider restricting OAuth credentials to specific domains

## Next Steps

Once set up, you can:
- View all your Google calendars in the Dashboard
- Select which calendars to sync
- See calendar events alongside your tasks (future feature)
- Sync tasks to your calendar (future feature)


