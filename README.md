# LeetCode Recommender — Based on Your Notion

A Next.js app that connects to your Notion database and uses Google Gemini AI to recommend LeetCode problems based on your study history.

## Features

- Connect your Notion database via OAuth or internal token
- Auto-detect Notion schema and map your own status values
- AI-powered recommendations using Google Gemini

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `AI_MODEL` | No | Gemini model to use (default: `gemini-2.0-flash-lite`) |
| `NOTION_CLIENT_ID` | For OAuth | Notion integration OAuth Client ID |
| `NOTION_CLIENT_SECRET` | For OAuth | Notion integration OAuth Client Secret |
| `NOTION_REDIRECT_URI` | For OAuth | Must match your Notion integration settings |
| `NOTION_API_KEY` | Alt to OAuth | Notion internal integration token |
| `NOTION_DATABASE_ID` | Alt to OAuth | Notion database ID |

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.local.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. In **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — your Google Gemini API key
   - `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_REDIRECT_URI` (if using OAuth)
4. Redeploy

> The app will show a `Missing GEMINI_API_KEY` error until this variable is set in Vercel.

## Notion Setup

### OAuth (Recommended)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create an integration
2. Under **OAuth Domain & URIs**, set the redirect URI to:
   ```
   https://<your-vercel-domain>/api/auth/callback/notion
   ```
3. Copy the **Client ID** and **Client Secret** into Vercel environment variables

### Internal Token (Quick Start)

1. Create a Notion integration and copy the internal token
2. Share your LeetCode database with the integration
3. Set `NOTION_API_KEY` and `NOTION_DATABASE_ID` in your environment variables
