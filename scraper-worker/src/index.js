/**
 * ai-scraper — Cloudflare Worker
 * Fetches any public URL, strips HTML to clean text, returns JSON.
 * Used by aimersion.github.io/ai-automations/ to feed live web content into Gemini prompts.
 *
 * GET /?url=https://example.com
 * Returns: { title, text, url, wordCount }
 */

const ALLOWED_ORIGINS = [
  'https://aimersion.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});

function corsResponse(body, status, origin, extra = {}) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS(origin), ...extra },
  });
}

/**
 * Strip HTML tags and clean up whitespace to extract readable text.
 * Handles common patterns: scripts, styles, nav, footer, aside removed first.
 */
function extractText(html) {
  // Pull <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';

  // Remove noisy blocks
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Replace block-level tags with newlines for readability
  clean = clean
    .replace(/<\/?(h[1-6]|p|div|section|article|li|tr|blockquote|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')           // strip remaining tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')            // collapse spaces
    .replace(/\n{3,}/g, '\n\n')         // max 2 blank lines
    .trim();

  // Cap at ~6000 words to keep Gemini prompt sizes sane
  const words = clean.split(/\s+/);
  const capped = words.length > 6000 ? words.slice(0, 6000).join(' ') + '\n\n[... truncated for length ...]' : clean;

  return { title, text: capped, wordCount: words.length };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(origin) });
    }

    if (request.method !== 'GET') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    // Validate URL
    if (!targetUrl) {
      return corsResponse(JSON.stringify({ error: 'Missing ?url= parameter' }), 400, origin);
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid URL' }), 400, origin);
    }

    // Only allow public HTTP(S) — block internal IPs
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return corsResponse(JSON.stringify({ error: 'Only http/https URLs allowed' }), 400, origin);
    }
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.', '10.', '192.168.', '172.16.'];
    if (blocked.some(b => parsed.hostname.startsWith(b))) {
      return corsResponse(JSON.stringify({ error: 'Private/local URLs not allowed' }), 400, origin);
    }

    // Fetch with a realistic User-Agent so sites don't block us
    let response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Scraper/1.0; +https://aimersion.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        cf: { cacheTtl: 300, cacheEverything: false },  // 5-min cache on Cloudflare edge
      });
    } catch (err) {
      return corsResponse(JSON.stringify({ error: `Fetch failed: ${err.message}` }), 502, origin);
    }

    if (!response.ok) {
      return corsResponse(
        JSON.stringify({ error: `Target site returned ${response.status}` }),
        502, origin
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html') && !contentType.includes('text')) {
      return corsResponse(JSON.stringify({ error: 'URL does not return HTML/text content' }), 422, origin);
    }

    const html = await response.text();
    const { title, text, wordCount } = extractText(html);

    return corsResponse(
      JSON.stringify({ url: targetUrl, title, text, wordCount }),
      200, origin,
      { 'Cache-Control': 'public, max-age=300' }  // browsers can cache 5 min too
    );
  },
};
