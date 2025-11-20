# Deploy to Vercel with Custom GoDaddy Domain

## Step 1: Deploy to Vercel

### Option A: CLI (Fastest)
```bash
npm install -g vercel
vercel
```

Follow prompts:
- Link to existing project? → **No**
- Project name? → **task-brain** (or press Enter)
- Directory? → **./** (press Enter)
- Modify settings? → **No**

### Option B: Git Integration
```bash
git add .
git commit -m "Production ready with Supabase"
git push origin main
```

Then:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Click **Deploy**

---

## Step 2: Add Environment Variables in Vercel

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add these 3 variables:

| Name | Value |
|------|-------|
| `API_KEY` | `YOUR_GOOGLE_API_KEY` |
| `VITE_SUPABASE_URL` | `YOUR_SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | `YOUR_SUPABASE_ANON_KEY` |

Click **Save** → **Redeploy**

---

## Step 3: Connect Custom Domain (kent.ertugrul.one)

### In Vercel:
1. Go to your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `kent.ertugrul.one`
4. Vercel will show you DNS records to add

You'll see something like:
```
Type: A
Name: kent
Value: 76.76.21.21
```

### In GoDaddy:
1. Log into GoDaddy DNS Manager
2. Find domain: `ertugrul.one`
3. Go to **DNS Settings** → **Manage DNS**
4. Add/Edit the `kent` subdomain:

**Option A - CNAME (Recommended):**
- Type: **CNAME**
- Name: **kent**
- Value: **cname.vercel-dns.com**
- TTL: **1 Hour**

**Option B - A Record:**
- Type: **A**
- Name: **kent**
- Value: **76.76.21.21** (Vercel's IP - check Vercel for latest)
- TTL: **1 Hour**

5. **Save Changes**

---

## Step 4: Wait for DNS Propagation

- Usually takes **5-30 minutes**
- Check status in Vercel → Domains
- You'll see ✅ when it's ready

---

## Step 5: Test!

Visit: **https://kent.ertugrul.one**

You should see your Task Brain app running with Supabase! 🚀

---

## Quick Deploy Script

Want me to create a deployment script that does this automatically?

