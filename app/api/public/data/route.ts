import { NextResponse } from 'next/server';

// Edge Caching Config (Optimizes Supabase DB Egress & Latency)
export const revalidate = 0; // Real-time data delivery for public visitors

export async function GET() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.includes('cnvxdxltwpwmnrfqvpqq'))
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw';

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    // Query strictly BBQ Warriors isolated tables with no-store cache
    const [profilesRes, articlesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?select=*&or=(status.eq.published,status.is.null)&order=display_order.asc,created_at.desc`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_articles?select=*&or=(status.eq.published,status.is.null)&order=display_order.asc,created_at.desc`, {
        headers,
        cache: 'no-store',
      }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const rawArticles = articlesRes.ok ? await articlesRes.json() : [];
    const articles = Array.isArray(rawArticles)
      ? rawArticles.map((a: any) => ({
          ...a,
          profile_id: a.bbq_profile_id || a.profile_id,
          bbq_profile_id: a.bbq_profile_id || a.profile_id,
          status: a.status || 'published',
        }))
      : [];

    return NextResponse.json(
      { profiles: Array.isArray(profiles) ? profiles : [], articles, timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ profiles: [], articles: [], error: err.message }, { status: 200 });
  }
}
