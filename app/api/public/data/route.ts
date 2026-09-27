import { NextResponse } from 'next/server';

// Edge Caching Config (Optimizes Supabase DB Egress & Latency)
export const revalidate = 60; // Revalidate at Edge CDN every 60 seconds

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
