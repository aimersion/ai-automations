/**
 * ai-subscribe — Cloudflare Worker
 * Handles email capture for aimersion.github.io/ai-automations/
 *
 * On POST /subscribe:
 *   1. Validates email
 *   2. Appends row to Google Sheet (email, timestamp, source, day)
 *   3. Sends welcome email via SendGrid
 *   4. Returns JSON { ok: true } or { error: "..." }
 *
 * Secrets (set via `wrangler secret put`, never in source):
 *   SENDGRID_KEY          — SendGrid API key
 *   SHEET_ID              — Google Sheet ID (from URL)
 *   GOOGLE_SA_EMAIL       — Service account email (xxx@xxx.iam.gserviceaccount.com)
 *   GOOGLE_SA_PRIVATE_KEY — Service account private key PEM (with \n as literal \n)
 */

const ALLOWED_ORIGINS = [
  'https://aimersion.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS(origin) },
  });
}

// ── Google Sheets JWT auth ────────────────────────────────────────────────────

function b64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlObj(obj) {
  return b64url(JSON.stringify(obj));
}

async function getGoogleToken(saEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);

  const header  = b64urlObj({ alg: 'RS256', typ: 'JWT' });
  const payload = b64urlObj({
    iss: saEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });

  const toSign = `${header}.${payload}`;

  // Strip PEM wrapper + whitespace, handle \n stored as literal backslash-n
  const pem = privateKeyPem.replace(/\\n/g, '\n');
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(toSign)
  );

  const sig = b64url(String.fromCharCode(...new Uint8Array(sigBytes)));
  const jwt = `${toSign}.${sig}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Append row to Google Sheet ────────────────────────────────────────────────

async function appendToSheet(token, sheetId, row) {
  const range = 'Sheet1!A:E';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Sheets append failed: ${err}`);
  }
}

// ── Send welcome email via SendGrid ──────────────────────────────────────────

async function sendWelcome(sgKey, toEmail) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080E1A;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080E1A;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:28px;">
          <span style="font-size:13px;font-weight:800;color:#06B6D4;letter-spacing:3px;text-transform:uppercase;">⚡ AIMERSION AI</span>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#0F1829;border:1px solid #1E3050;border-radius:16px;padding:36px 32px 32px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#10B981;">You're in</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#F1F5F9;line-height:1.2;">Day 04 drops tomorrow.<br>You'll be the first to know.</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#94A3B8;line-height:1.7;">
            We're building 20 free AI tools for sales and productivity — one every day for 20 days.
            You just signed up on Day 03. Three tools are already live and ready to use right now.
          </p>

          <!-- Tool list -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#152035;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748B;">Day 01 — Live</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#F1F5F9;">📬 Inbox Intelligence</p>
              <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Connects Gmail or Outlook — surfaces only what actually needs your attention.</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="background:#152035;border-radius:10px;padding:16px 20px;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748B;">Day 02 — Live</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#F1F5F9;">📝 Proposal Generator</p>
              <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Turn a prospect's pain points into a full proposal in 4 minutes.</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="background:#152035;border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:16px 20px;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#10B981;">Day 03 — Live Now</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#F1F5F9;">🎯 Competitor Intel Brief</p>
              <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Enter any competitor, get a battle card with objection handlers in 60 seconds.</p>
            </td></tr>
          </table>

          <a href="https://aimersion.github.io/ai-automations/" style="display:inline-block;background:#10B981;color:#fff;font-size:14px;font-weight:800;padding:13px 24px;border-radius:10px;text-decoration:none;">
            Try the tools now →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 0 0;">
          <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
            Built by <a href="https://aimersion.ai" style="color:#06B6D4;text-decoration:none;">Aimersion AI</a> · Free &amp; open source ·
            1611 Commons Circle, Northlake, TX 76226<br>
            You're receiving this because you signed up at aimersion.github.io/ai-automations.
            To unsubscribe, reply with "unsubscribe".
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sgKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: 'jlynch@aimersion.ai', name: 'Jim Lynch · Aimersion AI' },
      reply_to: { email: 'jlynch@aimersion.ai', name: 'Jim Lynch' },
      subject: "You're in — Day 04 drops tomorrow ⚡",
      content: [
        {
          type: 'text/plain',
          value: `You're in — Day 04 drops tomorrow.\n\nWe're building 20 free AI tools for sales and productivity, one every day. Three are already live:\n\nDay 01: Inbox Intelligence — https://aimersion.github.io/ai-automations/day-01-inbox-intelligence.html\nDay 02: Proposal Generator — https://aimersion.github.io/ai-automations/day-02-proposal-generator.html\nDay 03: Competitor Intel Brief — https://aimersion.github.io/ai-automations/day-03-competitor-intel.html\n\nSee all tools: https://aimersion.github.io/ai-automations/\n\n—\nJim Lynch · Aimersion AI\n1611 Commons Circle, Northlake, TX 76226\nTo unsubscribe, reply with "unsubscribe".`,
        },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!resp.ok && resp.status !== 202) {
    const err = await resp.text();
    throw new Error(`SendGrid error ${resp.status}: ${err}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS(origin) });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, origin);
    }

    const email = (body.email || '').trim().toLowerCase();
    const source = (body.source || 'homepage').slice(0, 80);
    const day = (body.day || '3').toString();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400, origin);
    }

    const timestamp = new Date().toISOString();

    try {
      // 1. Get Google access token
      const googleToken = await getGoogleToken(
        env.GOOGLE_SA_EMAIL,
        env.GOOGLE_SA_PRIVATE_KEY
      );

      // 2. Append to sheet: [timestamp, email, source, day, user_agent]
      const ua = request.headers.get('User-Agent') || '';
      await appendToSheet(googleToken, env.SHEET_ID, [timestamp, email, source, day, ua]);

      // 3. Send welcome email (non-blocking — don't fail subscribe if email fails)
      sendWelcome(env.SENDGRID_KEY, email).catch(e => console.error('Welcome email failed:', e));

      return json({ ok: true, message: "You're in! Check your inbox." }, 200, origin);

    } catch (err) {
      console.error('Subscribe error:', err);
      return json({ error: 'Something went wrong — please try again.' }, 500, origin);
    }
  },
};
