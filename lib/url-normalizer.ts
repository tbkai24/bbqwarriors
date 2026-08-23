/**
 * ============================================================================
 * URL NORMALIZER & CONTENT FINGERPRINTING MODULE (lib/url-normalizer.ts)
 * Collaborative Developer Guide & Anti-Duplicate Content Engine
 * ============================================================================
 * 
 * Purpose:
 * Sanitizes external article URLs, strips tracking query strings (UTM, fbclid, igsh, si),
 * extracts platform content fingerprints (Reddit, YouTube, Twitter/X, Instagram, TikTok),
 * and prevents duplicate link submissions across multi-format URLs and titles.
 * 
 * Key Functions Index:
 * - normalizeUrl              -> Strips tracking params & normalizes hostnames (youtu.be -> youtube.com)
 * - extractContentFingerprint -> Extracts canonical post ID (e.g. reddit:1vbgby9, twitter:18823719)
 * - isDuplicateUrl            -> Compares fingerprint, canonical URL, and title similarity
 * ============================================================================
 */

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname;

    // 1. Comprehensive list of tracking & social share query parameters to strip
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', '_ga', '_gl', 'ref', 'source', 'share_id',
      'igsh', 'ig_rid', 'si', 's', 't', '_t', '_r', 'ref_src', 'mibextid',
      'context', 'rdt', 'feature', 'is_from_webapp', 'sender_device', 'st'
    ];

    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // 2. Platform-specific URL standardization

    // YouTube: Shortened (youtu.be) -> Standard Watch URL
    if (hostname === 'youtu.be') {
      const videoId = pathname.substring(1);
      if (videoId) {
        hostname = 'youtube.com';
        pathname = '/watch';
        parsed.searchParams.set('v', videoId);
      }
    }
    // YouTube Mobile (m.youtube.com)
    if (hostname === 'm.youtube.com') {
      hostname = 'youtube.com';
    }

    // X / Twitter Standardization (x.com <-> twitter.com)
    if (hostname === 'x.com') {
      hostname = 'twitter.com';
    }

    // Reddit Shortened (redd.it) & Mobile
    if (hostname === 'redd.it') {
      const postId = pathname.substring(1);
      if (postId) {
        hostname = 'reddit.com';
        pathname = `/comments/${postId}`;
      }
    }
    if (hostname === 'm.reddit.com' || hostname === 'old.reddit.com') {
      hostname = 'reddit.com';
    }

    // Reddit Post Title stripping (e.g. /r/sub/comments/ID/post_title/ -> /r/sub/comments/ID)
    if (hostname === 'reddit.com' && pathname.includes('/comments/')) {
      const match = pathname.match(/(\/r\/[^\/]+\/comments\/[a-z0-9]+)/i) || pathname.match(/(\/comments\/[a-z0-9]+)/i);
      if (match) {
        pathname = match[1];
      }
    }

    // Reconstruct clean URL
    let clean = `${parsed.protocol}//${hostname}${pathname}`;
    
    // Strip trailing slash if path is longer than '/'
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }

    // Append remaining valid search params if any
    const remainingParams = parsed.searchParams.toString();
    if (remainingParams) {
      clean += `?${remainingParams}`;
    }

    return clean;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Extracts a unique Content Fingerprint for major social & video platforms (YouTube, Reddit, X/Twitter, Instagram, TikTok).
 * If two URLs produce the same fingerprint (e.g. reddit:1vbgby9 or youtube:dQw4w9WgXcQ), they point to the exact same content.
 */
export function extractContentFingerprint(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const clean = normalizeUrl(rawUrl).toLowerCase();

  // 1. YouTube Video / Shorts / Live ID
  const ytMatch = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) return `youtube:${ytMatch[1]}`;

  // 2. Reddit Post ID
  const redditMatch = clean.match(/(?:reddit\.com|redd\.it)\/(?:r\/[^\/]+\/)?comments\/([a-z0-9]+)/i);
  if (redditMatch && redditMatch[1]) return `reddit:${redditMatch[1]}`;

  // 3. X / Twitter Status ID
  const twitterMatch = clean.match(/(?:twitter\.com|x\.com)\/(?:[^\/]+\/)?status\/(\d+)/i);
  if (twitterMatch && twitterMatch[1]) return `twitter:${twitterMatch[1]}`;

  // 4. Instagram Post / Reel ID
  const igMatch = clean.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1]) return `instagram:${igMatch[1]}`;

  // 5. TikTok Video ID (supports @user/video/ID, /video/ID, /v/ID, /t/ID)
  const ttMatch = clean.match(/tiktok\.com\/(?:@[^\/]+\/video\/|video\/|v\/|t\/)(\d+)/i);
  if (ttMatch && ttMatch[1]) return `tiktok:${ttMatch[1]}`;

  // 6. Facebook Post / Reel / Story / Video / Photo ID
  const fbMatch = clean.match(/(?:facebook\.com|fb\.com|m\.facebook\.com|fb\.watch)\/(?:.*?(?:story_fbid=|posts\/|photos\/|videos\/|reels\/|reel\/|watch\/\?v=|permalink\.php\?story_fbid=)|watch\/|)(pfbid[a-zA-Z0-9]+|\d+)/i);
  if (fbMatch && fbMatch[1]) return `facebook:${fbMatch[1]}`;

  return null;
}

/**
 * Extracts 11-character YouTube video ID from various YouTube URL formats.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Checks if a given input URL matches a canonical/normalized URL in an existing list.
 * Compares normalized URLs, social platform content fingerprints (Reddit, X, YouTube, Instagram, TikTok, FB),
 * AND optional article titles to catch duplicate submissions.
 */
export function isDuplicateUrl(
  inputUrl: string,
  existingUrls: string[],
  inputTitle?: string,
  existingTitles?: string[]
): boolean {
  if (!inputUrl) return false;
  const normalizedInput = normalizeUrl(inputUrl);
  const fingerprintInput = extractContentFingerprint(inputUrl);

  const urlMatched = existingUrls.some(url => {
    if (!url) return false;
    const normExisting = normalizeUrl(url);
    if (normExisting === normalizedInput) return true;

    if (fingerprintInput) {
      const fpExisting = extractContentFingerprint(url);
      if (fpExisting && fpExisting === fingerprintInput) return true;
    }

    return false;
  });

  if (urlMatched) return true;

  // Title Duplicate Check (if inputTitle & existingTitles provided)
  if (inputTitle && inputTitle.trim().length > 6 && existingTitles && existingTitles.length > 0) {
    const cleanInputTitle = inputTitle.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanInputTitle.length > 6) {
      const titleMatched = existingTitles.some(t => {
        if (!t || t.trim().length <= 6) return false;
        const cleanExistingTitle = t.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanExistingTitle === cleanInputTitle;
      });
      if (titleMatched) return true;
    }
  }

  return false;
}

/**
 * Decodes all numeric (e.g. &#8216;, &#8217;, &#x27;, &#39;) and named HTML entities into clean human-readable text.
 * Uses multi-pass decoding to handle double-encoded entities (e.g. &amp;#x27; -> &#x27; -> ').
 */
export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';

  let curr = str;
  let prev = '';

  // Up to 3 passes to unwrap double/triple HTML entity encoding
  for (let pass = 0; pass < 3; pass++) {
    prev = curr;

    // 1. Decode numeric decimal entities: &#8216; -> ‘, &#39; -> '
    curr = curr.replace(/&#(\d+);?/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });

    // 2. Decode numeric hex entities: &#x27; -> ', &#x2018; -> ‘
    curr = curr.replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });

    // 3. Decode common named entities
    curr = curr
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lsquo;/g, '‘')
      .replace(/&rsquo;/g, '’')
      .replace(/&ldquo;/g, '“')
      .replace(/&rdquo;/g, '”')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');

    if (curr === prev) break;
  }

  return curr;
}

/**
 * List of domain / platform keywords that should NOT be selected as Article of the Day.
 * You can add any keyword (e.g. 'reddit', 'genius', 'google', 'quora', etc.) to this array.
 */
export const EXCLUDED_SPOTLIGHT_KEYWORDS: string[] = [
  'reddit',
  'genius',
  'google',
  'twitter',
  'x.com',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'pinterest',
  'wikipedia',
];

/**
 * Helper to check if an article is eligible to be picked as Article of the Day.
 */
export function isEligibleForArticleOfTheDay(article: { article_url?: string; canonical_url?: string; website_name?: string }): boolean {
  if (!article) return false;
  const url = (article.article_url || '').toLowerCase();
  const canon = (article.canonical_url || '').toLowerCase();
  const site = (article.website_name || '').toLowerCase();

  return !EXCLUDED_SPOTLIGHT_KEYWORDS.some(kw =>
    url.includes(kw) || canon.includes(kw) || site.includes(kw)
  );
}

/**
 * Automatically translates foreign text to English using Google Translate endpoint.
 * Returns clean translated text or original decoded text if translation fails/is already English.
 */
export async function translateTextToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  const decoded = decodeHtmlEntities(text);

  // Preserve front number prefix if present (e.g. "1. ", "02 - ", "[10] ", "#5 ")
  const frontMatch = decoded.match(/^(?:[#\[\(])?\s*\d+(?:\s*[\.\-\)]\s*|\s+)/);
  const frontPrefix = frontMatch ? frontMatch[0] : '';
  const textToTranslate = frontPrefix ? decoded.slice(frontPrefix.length).trim() : decoded;

  if (!textToTranslate) return decoded;

  const isValid = (trans?: string | null) => {
    if (!trans || !trans.trim()) return false;
    const upper = trans.toUpperCase();
    if (upper.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) return false;
    if (upper.includes('MYMEMORY WARNING')) return false;
    if (upper.includes('INVALID LANGUAGE PAIR')) return false;
    return true;
  };

  // 1. Try server-side route
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToTranslate }),
    });
    if (res.ok) {
      const data = await res.json();
      if (
        data &&
        data.translated &&
        isValid(data.translated) &&
        data.translated.trim().toLowerCase() !== textToTranslate.toLowerCase()
      ) {
        return frontPrefix + decodeHtmlEntities(data.translated);
      }
    }
  } catch {
    // Ignore
  }

  // 2. Client-side MyMemory API fallback
  try {
    const mmRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=id|en`
    );
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      const translatedText = mmData?.responseData?.translatedText;
      if (
        translatedText &&
        typeof translatedText === 'string' &&
        isValid(translatedText) &&
        translatedText.trim().toLowerCase() !== textToTranslate.toLowerCase()
      ) {
        return frontPrefix + decodeHtmlEntities(translatedText.trim());
      }
    }
  } catch {
    // Ignore
  }

  return decoded;
}

/**
 * Extracts a numeric value from the beginning of a string if present.
 * Works with numbers prefixed with symbols like "#", "[", "(", or plain numbers:
 * - "1. SB19 Moonlight MV" -> 1
 * - "02 - SB19 GENTO" -> 2
 * - "[10] SB19 KALAKAL" -> 10
 * - "#5 SB19 MV" -> 5
 * - "SB19 MV 1" -> null
 */
export function extractFrontNumber(str: string): number | null {
  if (!str) return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(?:[#\[\(])?\s*(\d+)/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Compares two titles by their front number if both or either has one,
 * falling back to natural string localeCompare.
 */
export function compareByFrontNumber(titleA: string, titleB: string, direction: 'asc' | 'desc' = 'asc'): number {
  const numA = extractFrontNumber(titleA);
  const numB = extractFrontNumber(titleB);

  if (numA !== null && numB !== null) {
    if (numA !== numB) {
      return direction === 'asc' ? numA - numB : numB - numA;
    }
    return direction === 'asc'
      ? titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' })
      : titleB.localeCompare(titleA, undefined, { numeric: true, sensitivity: 'base' });
  }

  if (numA !== null) return -1; // Items with front numbers take precedence
  if (numB !== null) return 1;

  return direction === 'asc'
    ? titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' })
    : titleB.localeCompare(titleA, undefined, { numeric: true, sensitivity: 'base' });
}

