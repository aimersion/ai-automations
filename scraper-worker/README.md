# ai-scraper — Cloudflare Worker

Fetches any public URL, strips HTML to clean text, and returns JSON. Powers the URL-to-Gemini pipeline for [aimersion.github.io/ai-automations](https://aimersion.github.io/ai-automations/).

## Deploy (one time, ~2 minutes)

```bash
cd scraper-worker
npx wrangler login        # opens browser — log in to your Cloudflare account
npx wrangler deploy       # deploys to <account>.workers.dev
```

After deploy, Wrangler prints your worker URL like:
```
https://ai-scraper.<your-account>.workers.dev
```

Paste that URL into Day 03 (and any future tool that uses it).

## Test it

```bash
curl "https://ai-scraper.<your-account>.workers.dev/?url=https://example.com"
```

Should return:
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "text": "Example Domain\nThis domain is for use in...",
  "wordCount": 42
}
```

## Optional: custom domain (scraper.aimersion.ai)

1. In Cloudflare dashboard → Workers → ai-scraper → Settings → Triggers → Custom Domains
2. Add `scraper.aimersion.ai`
3. Update the worker URL in `day-03-competitor-intel.html`

## Usage (from the browser)

```js
const res = await fetch('https://ai-scraper.<account>.workers.dev/?url=' + encodeURIComponent(targetUrl));
const { title, text } = await res.json();
```

## Limits

- Free tier: 100,000 requests/day — more than enough
- Response cached 5 minutes on Cloudflare edge + browser
- Text capped at 6,000 words before sending to Gemini
