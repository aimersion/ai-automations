/**
 * ai-scraper — Cloudflare Worker
 * Fetches any public URL, strips HTML to clean text, returns JSON.
 * Used by aimersion.github.io/ai-automations/ to feed live web content into Gemini prompts.
 *
 * Single page:  GET /?url=https://example.com
 * Deep scrape:  GET /?url=https://example.com&deep=true
 *   → Fetches homepage + up to 4 key subpages (product, pricing, features, about…)
 *   → For JS-rendered SPAs: extracts meta tags + tries common paths + sitemap.xml
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

// Common SPA/React paths to try when link discovery finds nothing
const COMMON_PATHS = [
  '/about', '/about-us',
  '/product', '/products',
  '/solutions', '/solution',
  '/platform', '/features',
  '/pricing', '/plans',
  '/how-it-works', '/why-us',
  '/services', '/what-we-do',
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
 * Extract meta/OG tags from HTML — useful for JS-rendered SPAs where the
 * visible content isn't in the raw HTML but the meta tags still are.
 */
function extractMetaTags(html) {
  const get = (pattern) => {
    const m = html.match(pattern);
    return m ? m[1].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim() : null;
  };

  const description =
    get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  const ogDescription =
    get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

  const ogTitle =
    get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

  const keywords =
    get(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["']/i);

  const siteName =
    get(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
    get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);

  const parts = [];
  if (ogTitle) parts.push(`Site: ${ogTitle}`);
  if (siteName && siteName !== ogTitle) parts.push(`Brand: ${siteName}`);
  if (description) parts.push(`About: ${description}`);
  if (ogDescription && ogDescription !== description) parts.push(`Overview: ${ogDescription}`);
  if (keywords) parts.push(`Keywords: ${keywords}`);

  return parts.join('\n');
}

/**
 * Parse sitemap.xml and extract up to 20 relevant product/about URLs.
 */
function parseSitemap(xml, baseHostname) {
  const urls = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = locRegex.exec(xml)) !== null) {
    const url = m[1].trim();
    try {
      const p = new URL(url);
      if (p.hostname !== baseHostname) continue;
      if (SKIP_EXTENSIONS.test(p.pathname)) continue;
      if (SKIP_PATHS.test(p.pathname)) continue;
      const path = p.pathname.toLowerCase();
      const score = DEEP_KEYWORDS.reduce((s, kw) => path.includes(kw) ? s + 1 : s, 0);
      if (score > 0) urls.push({ url: p.origin + p.pathname, score });
    } catch { continue; }
  }
  return urls.sort((a, b) => b.score - a.score).slice(0, 4).map(x => x.url);
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
 * Fetch a single URL and return { title, text, wordCount, url } or null on failure.
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

    // ── Detect JS-only SPA (thin page) ───────────────────
    const isSPA = mainData.wordCount < 80;
    const metaContent = isSPA ? extractMetaTags(mainHtml) : '';

    // ── Single-page mode ─────────────────────────────────
    if (!deep) {
      let text = mainData.text;
      let wordCount = mainData.wordCount;

      // For SPAs in single mode, supplement with meta tags
      if (isSPA && metaContent) {
        text = `[Note: JavaScript-rendered site — extracted from meta tags]\n\n${metaContent}`;
        wordCount = text.split(/\s+/).length;
      }

      return corsResponse(
        JSON.stringify({ url: targetUrl, title: mainData.title, text, wordCount }),
        200, origin,
        { 'Cache-Control': 'public, max-age=300' }
      );
    }

    // ── Deep mode: discover + fetch subpages ─────────────

    // Step 1: Try link discovery from HTML
    let subUrls = extractDeepLinks(mainHtml, targetUrl);

    // Step 2: If SPA or too few links found, try sitemap.xml + common paths
    if (subUrls.length < 2) {
      const base = new URL(targetUrl);
      const sitemapPromise = fetchPage(`${base.origin}/sitemap.xml`)
        .then(r => r ? parseSitemap(r.text, base.hostname) : []);

      // Try common SPA paths
      const commonPromise = Promise.all(
        COMMON_PATHS.map(path => {
          const url = `${base.origin}${path}`;
          return fetch(url, { headers: FETCH_HEADERS, redirect: 'follow', cf: { cacheTtl: 60 } })
            .then(r => r.ok ? url : null)
            .catch(() => null);
        })
      ).then(results => results.filter(Boolean).slice(0, 4));

      const [sitemapUrls, commonUrls] = await Promise.all([sitemapPromise, commonPromise]);

      // Merge: sitemap takes priority, fill with common paths
      const merged = [...new Set([...sitemapUrls, ...subUrls, ...commonUrls])].slice(0, 4);
      subUrls = merged;
    }

    // Step 3: Fetch all subpages in parallel
    const subResults = await Promise.all(subUrls.map(u => fetchPage(u)));
    const subPages = subResults.filter(r => r && r.wordCount > 30);

    // Step 4: Build homepage text — for SPAs, use meta content as supplement
    let homepageText = mainData.text;
    if (isSPA && metaContent && subPages.length > 0) {
      homepageText = `[JavaScript-rendered site — homepage meta]\n${metaContent}`;
    } else if (isSPA && metaContent) {
      homepageText = `[JavaScript-rendered site — extracted from meta tags]\n\n${metaContent}`;
    }

    // Step 5: Combine everything
    const sections = [
      `--- PAGE: / (homepage) ---\n${homepageText}`,
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
        spaSite: isSPA,
      }),
      200, origin,
      { 'Cache-Control': 'public, max-age=300' }
    );
  },
};
