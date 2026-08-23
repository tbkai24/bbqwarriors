import { NextResponse } from 'next/server';
import { decodeHtmlEntities } from '@/lib/url-normalizer';

export async function POST(request: Request) {
  let rawText = '';
  try {
    const body = await request.json();
    rawText = body?.text || '';
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json({ translated: rawText });
    }

    const decoded = decodeHtmlEntities(rawText);

    // Validation helper to reject MyMemory warning and error responses
    const isValidTranslation = (trans: string) => {
      if (!trans || !trans.trim()) return false;
      const upper = trans.toUpperCase();
      if (upper.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) return false;
      if (upper.includes('MYMEMORY WARNING')) return false;
      if (upper.includes('INVALID LANGUAGE PAIR')) return false;
      if (upper.includes('QUERY LENGTH LIMIT EXCEEDED')) return false;
      if (upper.includes('YOU HAVE USED ALL YOUR FREE')) return false;
      if (upper.includes('MAXIMUM ALLOWED')) return false;
      return true;
    };

    // 1. Primary: Google Chrome Extension API (client=dict-chrome-ex, sl=auto, tl=en) - High Reliability
    try {
      const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=auto&tl=en&dt=t&q=${encodeURIComponent(decoded)}`;
      const res = await fetch(gtxUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translatedParts = data[0]
            .map((item: any) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
            .filter(Boolean);
          const translated = translatedParts.join(' ');
          if (isValidTranslation(translated) && translated.trim().toLowerCase() !== decoded.trim().toLowerCase()) {
            return NextResponse.json({ translated: decodeHtmlEntities(translated.trim()) });
          }
        }
      }
    } catch {
      // Fallback
    }

    // 2. Secondary: Standard GTX Fallback
    try {
      const gtxUrl2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(decoded)}`;
      const res2 = await fetch(gtxUrl2);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2[0] && Array.isArray(data2[0])) {
          const translatedParts2 = data2[0]
            .map((item: any) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
            .filter(Boolean);
          const translated2 = translatedParts2.join(' ');
          if (isValidTranslation(translated2) && translated2.trim().toLowerCase() !== decoded.trim().toLowerCase()) {
            return NextResponse.json({ translated: decodeHtmlEntities(translated2.trim()) });
          }
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json({ translated: decoded });
  } catch {
    return NextResponse.json({ translated: rawText || '' });
  }
}
