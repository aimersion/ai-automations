/**
 * ai-scraper — Cloudflare Worker
 * Fetches any public URL, strips HTML to clean text, returns JSON.
 * Used by aimersion.github.io/ai-automations/ to feed live web content into Gemini prompts.
 *
 * Single page:  GET /?url=https://example.com
 * Deep scrape:  GET /?url=https://example.com&deep=true
 *   → Fetches homepage + up to 4 key subpages (product, pricing, features, about…)
 *   → Returns combined text with --- PAGE: /path --- section headers
 *
 * Returns: { title, text, url, wordCount, pages? }
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

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AI-Scraper/1.0; +https://aimersion.ai)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Keywords that signal a page has real product/business content worth scraping
const DEEP_KEYWORDS = [
  'product', 'solution', 'feature', 'platform', 'pricing', 'price',
  'how-it-works', 'how-we', 'why', 'capability', 'use-case', 'use_case',
  'about', 'tour', 'demo', 'overview', 'benefit', 'integration', 'workflow',
];

// File extensions and paths to skip
const SKIP_EXTENSIONS = /\.(pdf|png|jpg|jpeg|gif|svg|webp|ico|zip|mp4|mp3|css|js|woff|ttf)$/i;
const SKIP_PATHS = /\/(blog|news|press|event|career|job|legal|privacy|terms|cookie|contact|login|signup|register|checkout|cart|tag|category|author|page\/\d)/i;

/**
 * Extract clean text + title from raw HTML.
 * @param {string} html
 * @param {number} wordCap  max words to return from this page
 */
function extractText(html, wordCap = 3000) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
    : '';

  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  clean = clean
    .replace(/<\/?(h[1-6]|p|div|section|article|li|tr|blockquote|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = clean.split(/\s+/);
  const capped = words.length > wordCap
    ? words.slice(0, wordCap).join(' ') + '\n[... truncated]'
    : clean;

  return { title, text: capped, wordCount: words.length };
}

/**
 * Extract internal links from HTML that are likely product/content pages.
 * Returns absolute URLs, de-duped, ranked by keyword relevance.
 */
function extractDeepLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set();
  const scored = [];

  const linkRegex = /href=["']([^"'#?][^"']*?)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (SKIP_EXTENSIONS.test(href)) continue;

    let absolute;
    try {
      absolute = new URL(href, base).href;
    } catch {
      continue;
    }

    const parsed = new URL(absolute);

    // Same hostname only (not subdomains like blog.example.com — unless root)
    if (parsed.hostname !== base.hostname) continue;
    // Strip query strings and hashes for dedup
    const clean = parsed.origin + parsed.pathname.replace(/\/$/, '') || '/';
    if (seen.has(clean) || clean === baseUrl.replace(/\/$/, '')) continue;
    if (SKIP_PATHS.test(parsed.pathname)) continue;
    seen.add(clean);

    // Score by keyword match in path
    const path = parsed.pathname.toLowerCase();
    const score = DEEP_KEYWORDS.reduce((s, kw) => path.includes(kw) ? s + 1 : s, 0);
    if (score > 0) scored.push({ url: clean, score });
  }

  // Sort by score descending, take top 4
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.url);
}

/**
 * Fetch a single URL and return { title, text, wordCount } or null on failure.
 */
async function fetchPage(url) {
  try {
    const resp = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: 'follow',
      cf: { cacheTtl: 300, cacheEverything: false },
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    const html = await resp.text();
    return { url, ...extractText(html, 2500) };
  } catch {
    return null;
  }
}

function isPrivateHost(hostname) {
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.', '10.', '192.168.', '172.16.'];
  return blocked.some(b => hostname.startsWith(b));
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS(origin) });
    }
    if (request.method !== 'GET') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, origin);
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const deep = searchParams.get('deep') === 'true';

    if (!targetUrl) {
      return corsResponse(JSON.stringify({ error: 'Missing ?url= parameter' }), 400, origin);
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid URL' }), 400, origin);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return corsResponse(JSON.stringify({ error: 'Only http/https URLs allowed' }), 400, origin);
    }
    if (isPrivateHost(parsed.hostname)) {
      return corsResponse(JSON.stringify({ error: 'Private/local URLs not allowed' }), 400, origin);
    }

    // ── Fetch main page ──────────────────────────────────
    let mainResp;
    try {
      mainResp = await fetch(targetUrl, {
        headers: FETCH_HEADERS,
        redirect: 'follow',
        cf: { cacheTtl: 300, cacheEverything: false },
      });
    } catch (err) {
      return corsResponse(JSON.stringify({ error: `Fetch failed: ${err.message}` }), 502, origin);
    }

    if (!mainResp.ok) {
      return corsResponse(
        JSON.stringify({ error: `Target site returned ${mainResp.status}` }),
        502, origin
      );
    }

    const contentType = mainResp.headers.get('content-type') || '';
    if (!contentType.includes('html') && !contentType.includes('text')) {
      return corsResponse(JSON.stringify({ error: 'URL does not return HTML/text content' }), 422, origin);
    }

    const mainHtml = await mainResp.text();
    const mainData = extractText(mainHtml, deep ? 2500 : 6000);

    // ── Single-page mode ─────────────────────────────────
    if (!deep) {
      return corsResponse(
        JSON.stringify({ url: targetUrl, title: mainData.title, text: mainData.text, wordCount: mainData.wordCount }),
        200, origin,
        { 'Cache-Control': 'public, max-age=300' }
      );
    }

    // ── Deep mode: discover + fetch subpages ─────────────
    const subUrls = extractDeepLinks(mainHtml, targetUrl);

    // Fetch all subpages in parallel
    const subResults = await Promise.all(subUrls.map(u => fetchPage(u)));
    const subPages = subResults.filter(Boolean);

    // Combine everything
    const sections = [
      `--- PAGE: / (homepage) ---\n${mainData.text}`,
      ...subPages.map(p => {
        const path = new URL(p.url).pathname;
        return `--- PAGE: ${path} ---\n${p.text}`;
      }),
    ];

    const combinedText = sections.join('\n\n');
    const totalWords = combinedText.split(/\s+/).length;
    const pagesFetched = [targetUrl, ...subPages.map(p => p.url)];

    return corsResponse(
      JSON.stringify({
        url: targetUrl,
        title: mainData.title,
        text: combinedText,
        wordCount: totalWords,
        pages: pagesFetched,
        deepScrape: true,
      }),
      200, origin,
      { 'Cache-Control': 'public, max-age=300' }
    );
  },
};
