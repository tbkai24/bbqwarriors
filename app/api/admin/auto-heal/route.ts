import { NextResponse } from 'next/server';
import { clearDataStoreCache } from '@/lib/data-store';

export const revalidate = 0; // Dynamic route

export async function POST(req: Request) {
  const startTime = Date.now();
  const logs: string[] = [];
  const repairs: { field: string; profileId: string; oldValue: any; newValue: any }[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw';

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  try {
    logs.push(`[${new Date().toISOString()}] Initiating BBQ Warriors DevOps Self-Healing Audit...`);

    // 1. Fetch all profiles from Supabase DB
    const profilesRes = await fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?select=*`, {
      headers,
      cache: 'no-store',
    });

    if (!profilesRes.ok) {
      logs.push(`[ERROR] Failed to query bbq_warriors_profiles: HTTP ${profilesRes.status}`);
      return NextResponse.json({ success: false, logs, error: 'Database fetch failed' }, { status: 500 });
    }

    const profiles = await profilesRes.json();
    logs.push(`[INFO] Retrieved ${profiles.length} profile records for inspection.`);

    let healedProfilesCount = 0;

    for (const prof of profiles) {
      const updates: Record<string, any> = {};

      // Check & fix missing status
      if (!prof.status) {
        updates.status = 'published';
        repairs.push({ field: 'status', profileId: prof.id, oldValue: prof.status, newValue: 'published' });
      }

      // Check & fix missing slug
      if (!prof.slug && prof.title) {
        const computedSlug = prof.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `profile-${prof.id.substring(0, 6)}`;
        updates.slug = computedSlug;
        repairs.push({ field: 'slug', profileId: prof.id, oldValue: prof.slug, newValue: computedSlug });
      }

      // Check & fix video URLs (sync embedded_youtube_mv_url and featured_video_url)
      const validVideoUrl = prof.featured_video_url || prof.embedded_youtube_mv_url || null;
      if (validVideoUrl && prof.embedded_youtube_mv_url !== validVideoUrl) {
        updates.embedded_youtube_mv_url = validVideoUrl;
        repairs.push({ field: 'embedded_youtube_mv_url', profileId: prof.id, oldValue: prof.embedded_youtube_mv_url, newValue: validVideoUrl });
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?id=eq.${prof.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updates),
        });

        if (patchRes.ok) {
          healedProfilesCount++;
          logs.push(`[HEALED] Updated profile "${prof.title || prof.id}": ${Object.keys(updates).join(', ')}`);
        } else {
          logs.push(`[WARN] Failed to patch profile "${prof.id}": HTTP ${patchRes.status}`);
        }
      }
    }

    // 2. Clear client & edge cache
    clearDataStoreCache();
    logs.push(`[CACHE] Flushed in-memory DataStore & Edge SWR caches.`);
    logs.push(`[SUCCESS] DevOps Self-Healing Audit complete in ${Date.now() - startTime}ms.`);

    return NextResponse.json({
      success: true,
      executionTimeMs: Date.now() - startTime,
      totalProfilesChecked: profiles.length,
      healedProfilesCount,
      repairsCount: repairs.length,
      repairs,
      logs,
    });
  } catch (err: any) {
    logs.push(`[CRITICAL] Self-healing exception: ${err?.message || err}`);
    return NextResponse.json({ success: false, error: err?.message, logs }, { status: 500 });
  }
}
