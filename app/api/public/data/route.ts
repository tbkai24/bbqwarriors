import { NextResponse } from 'next/server';

// Edge Caching Config (Optimizes Supabase DB Egress & Latency)
export const revalidate = 60; // Revalidate at Edge CDN every 60 seconds

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // Query strictly BBQ Warriors isolated tables with Edge CDN Revalidation (60s SWR)
    const [profilesRes, articlesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?select=*&or=(status.eq.published,status.is.null)&order=created_at.desc`, {
        headers,
        next: { revalidate: 60 },
      }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_articles?select=*&or=(status.eq.published,status.is.null)&order=created_at.desc`, {
        headers,
        next: { revalidate: 60 },
      }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const articles = articlesRes.ok ? await articlesRes.json() : [];

    return NextResponse.json(
      { profiles: Array.isArray(profiles) ? profiles : [], articles: Array.isArray(articles) ? articles : [], timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ profiles: [], articles: [], error: err.message }, { status: 200 });
  }
}
