# Vancouver Trip Planner 🍁

## Files in this repo
- `index.html` — the entire app (itinerary, budget, packing, chat)
- `api/chat.js` — Vercel serverless function for the AI assistant
- `schema.sql` — paste into Supabase SQL editor to set up tables + seed data
- `vercel.json` — routes /api/ calls correctly
- `package.json` — tells Vercel to install the Anthropic SDK

---

## Setup (3 steps)

### Step 1: Supabase
1. Go to supabase.com, create a new project (or use existing one)
2. Go to SQL Editor, paste ALL of `schema.sql`, click Run
3. Go to Settings > API and copy:
   - Project URL (looks like https://xxxx.supabase.co)
   - anon/public key

### Step 2: Add your Supabase keys to index.html
Open `index.html` and find these two lines near the top of the script:
```
const SUPABASE_URL = window.SUPABASE_URL || 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
```
Replace the placeholder text with your actual values. Save and commit.

### Step 3: Vercel
1. Push this repo to GitHub
2. Go to vercel.com > New Project > Import repo
3. Add these Environment Variables:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (from console.anthropic.com)
   - (Supabase keys are already in index.html directly for simplicity)
4. Deploy!

---

## Editing the trip
- Edit files directly in GitHub using the pencil icon
- Vercel auto-deploys on every commit to main
- NEVER drag and drop files (corrupts to 14 bytes) - always use pencil icon
- To add days or change seeded data, edit `schema.sql` then re-run in Supabase

## Sharing
Send the Vercel URL to anyone in the family. Everyone sees the same live data.
The AI chatbot floats in the bottom right corner.
