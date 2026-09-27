import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // Query strictly the BBQ Warriors isolated tables (NO cache, NO fallback to legacy profiles/articles)
    const [profilesRes, articlesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?select=*&status=eq.published&order=display_order.asc`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_articles?select=*&status=eq.published&order=display_order.asc`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const articles = articlesRes.ok ? await articlesRes.json() : [];

    return NextResponse.json(
      { profiles: Array.isArray(profiles) ? profiles : [], articles: Array.isArray(articles) ? articles : [], timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ profiles: [], articles: [], error: err.message }, { status: 200 });
  }
}
