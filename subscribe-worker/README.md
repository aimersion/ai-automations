# ai-subscribe Worker

Handles email capture for the Aimersion AI tools homepage.

**POST /subscribe** → validates email → appends to Google Sheet → sends welcome email via SendGrid.

---

## One-time setup

### 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new sheet
2. Name it "Aimersion Subscribers" (or anything)
3. Add headers in row 1: `Timestamp | Email | Source | Day | User Agent`
4. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

### 2. Create a Google Service Account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts → Create Service Account**
5. Name it `sheets-writer` (or anything), click Create
6. Click the service account → **Keys → Add Key → JSON** → download the file
7. Open the JSON file, copy:
   - `client_email` (looks like `xxx@xxx.iam.gserviceaccount.com`)
   - `private_key` (the full PEM block including `-----BEGIN PRIVATE KEY-----`)
8. **Share the Google Sheet** with the service account email (Editor access)

### 3. Deploy the Worker

```bash
cd subscribe-worker
npm install
npx wrangler login

# Set secrets (you'll be prompted to paste each value)
npx wrangler secret put SENDGRID_KEY
npx wrangler secret put SHEET_ID
npx wrangler secret put GOOGLE_SA_EMAIL
npx wrangler secret put GOOGLE_SA_PRIVATE_KEY

# Deploy
npx wrangler deploy
```

### 4. Update the homepage

The homepage calls `https://ai-subscribe.aimersion.workers.dev/subscribe`.
If your worker name is different, update the `SUBSCRIBE_URL` constant in `index.html`.

---

## What gets stored

Each row in the sheet: `timestamp, email, source, day, user_agent`

No secrets ever touch this repo — they live in Cloudflare's secret store only.
