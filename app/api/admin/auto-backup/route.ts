import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleBackup(req);
}

export async function POST(req: NextRequest) {
  return handleBackup(req);
}

async function handleBackup(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'wkmmjpzb';
    const apiKey = process.env.CLOUDINARY_API_KEY || '498322474662986';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'YXKfV-YIkUep-i6mxrQEd3qoqeM';

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };

    // 1. Fetch data from Supabase DB strictly from BBQ Warriors tables
    const [profilesRes, articlesRes, subsRes, trafficRes, notifsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_profiles?select=*`, { headers, cache: 'no-store' }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_articles?select=*`, { headers, cache: 'no-store' }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_submissions?select=*`, { headers, cache: 'no-store' }),
      fetch(`${supabaseUrl}/rest/v1/bbq_warriors_analytics?select=*&limit=100`, { headers, cache: 'no-store' }),
      fetch(`${supabaseUrl}/rest/v1/notifications?select=*&limit=50`, { headers, cache: 'no-store' }),
    ]);

    const backupContent = {
      profiles: profilesRes.ok ? await profilesRes.json() : [],
      articles: articlesRes.ok ? await articlesRes.json() : [],
      submissions: subsRes.ok ? await subsRes.json() : [],
      daily_traffic: trafficRes.ok ? await trafficRes.json() : [],
      notifications: notifsRes.ok ? await notifsRes.json() : [],
      exported_at: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(backupContent, null, 2);
    const base64Data = `data:application/json;base64,${Buffer.from(jsonString).toString('base64')}`;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = 'SB19/backups';
    
    // Upload 1: Always update latest_db_backup
    const latestPublicId = 'latest_db_backup';
    const latestSigString = `folder=${folder}&overwrite=true&public_id=${latestPublicId}&timestamp=${timestamp}${apiSecret}`;
    const latestSig = crypto.createHash('sha1').update(latestSigString).digest('hex');

    const formDataLatest = new FormData();
    formDataLatest.append('file', base64Data);
    formDataLatest.append('api_key', apiKey);
    formDataLatest.append('timestamp', timestamp);
    formDataLatest.append('folder', folder);
    formDataLatest.append('public_id', latestPublicId);
    formDataLatest.append('overwrite', 'true');
    formDataLatest.append('signature', latestSig);

    // Upload 2: Create rolling timestamped backup file
    const timePublicId = `db_backup_${dateTag}`;
    const timeSigString = `folder=${folder}&overwrite=true&public_id=${timePublicId}&timestamp=${timestamp}${apiSecret}`;
    const timeSig = crypto.createHash('sha1').update(timeSigString).digest('hex');

    const formDataTimestamped = new FormData();
    formDataTimestamped.append('file', base64Data);
    formDataTimestamped.append('api_key', apiKey);
    formDataTimestamped.append('timestamp', timestamp);
    formDataTimestamped.append('folder', folder);
    formDataTimestamped.append('public_id', timePublicId);
    formDataTimestamped.append('overwrite', 'true');
    formDataTimestamped.append('signature', timeSig);

    const [latestRes, timestampedRes] = await Promise.all([
      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: formDataLatest }),
      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: formDataTimestamped }),
    ]);

    const latestData = await latestRes.json();
    if (!latestRes.ok) {
      return NextResponse.json({ success: false, error: latestData.error?.message || 'Upload failed' }, { status: 500 });
    }

    // 3. Automatic Rolling Cleanup (Keep max 5 timestamped backups, delete older ones)
    let deletedCount = 0;
    try {
      const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const listRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/raw?type=upload&prefix=SB19/backups/db_backup_&max_results=50`, {
        headers: { Authorization: authHeader },
        cache: 'no-store'
      });

      if (listRes.ok) {
        const listJson = await listRes.json();
        const resources: Array<{ public_id: string; created_at: string }> = listJson.resources || [];
        
        // Sort oldest first
        resources.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const MAX_BACKUPS = 5;
        if (resources.length > MAX_BACKUPS) {
          const toDelete = resources.slice(0, resources.length - MAX_BACKUPS);
          for (const item of toDelete) {
            const delTs = Math.floor(Date.now() / 1000).toString();
            const delSigString = `public_id=${item.public_id}&timestamp=${delTs}${apiSecret}`;
            const delSig = crypto.createHash('sha1').update(delSigString).digest('hex');

            const delForm = new FormData();
            delForm.append('public_id', item.public_id);
            delForm.append('api_key', apiKey);
            delForm.append('timestamp', delTs);
            delForm.append('signature', delSig);

            await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, {
              method: 'POST',
              body: delForm,
            });
            deletedCount++;
          }
        }
      }
    } catch {
      // Ignore cleanup error if admin API is restricted
    }

    return NextResponse.json({
      success: true,
      message: `Backup complete! Created ${timePublicId} and cleaned up old backups. Retaining top 5 backups.`,
      latest_cloudinary_url: latestData.secure_url,
      timestamp: new Date().toISOString(),
      deleted_old_backups_count: deletedCount,
      record_counts: {
        profiles: backupContent.profiles.length,
        articles: backupContent.articles.length,
        submissions: backupContent.submissions.length,
      },
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
