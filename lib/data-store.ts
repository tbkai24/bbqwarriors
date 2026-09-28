/**
 * ============================================================================
 * DATA STORE MODULE (lib/data-store.ts)
 * Collaborative Developer Guide & Database Operations Layer
 * ============================================================================
 * 
 * Purpose:
 * Central repository manager handling local caching (localStorage _v7), in-memory TTL caching,
 * Edge-API fallback queries, and direct Supabase PostgreSQL database mutations.
 * 
 * Key Functions Index:
 * - fetchProfilesFromSupabase / saveProfileToSupabase   -> Release profile CRUD
 * - updateProfilesOrderInSupabase / updateArticlesOrder -> Batch Drag & Drop sequence order updates
 * - updateArticleStatusInSupabase                       -> Soft-delete / restore toggle ('active' | 'archived')
 * - submitArticleLink                                   -> Real-time duplicate checking & submission queue
 * ============================================================================
 */

import { Profile, Article, ArticleSubmission, ExtractedMetadata, AnalyticsEvent, DailyTrafficStat, NotificationItem, ArticleStatus } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { normalizeUrl, isDuplicateUrl } from './url-normalizer';
import { detectDeviceType, detectCountryCode, normalizeReferrer, getClientIp } from './device-detector';

const LOCAL_STORAGE_KEY_PROFILES = 'bbq_warriors_profiles_v1';
const LOCAL_STORAGE_KEY_ARTICLES = 'bbq_warriors_articles_v1';
const LOCAL_STORAGE_KEY_SUBMISSIONS = 'bbq_warriors_submissions_v1';
const LOCAL_STORAGE_KEY_ANALYTICS = 'bbq_warriors_analytics_events_v1';
const LOCAL_STORAGE_KEY_DAILY_TRAFFIC = 'bbq_warriors_daily_traffic_v1';
const LOCAL_STORAGE_KEY_NOTIFICATIONS = 'bbq_warriors_notifications_v1';

/**
 * ----------------------------------------------------------------------------
 * 1. PROFILES MANAGEMENT
 * ----------------------------------------------------------------------------
 */

/**
 * Retrieves profiles saved in browser local storage.
 * Fallback mechanism when offline or before initial Supabase fetch completes.
 */
export function getStoredProfiles(): Profile[] {
  if (typeof window === 'undefined') return [];
  try {
    // Purge old legacy keys from previous project versions
    ['sb19_hub_profiles_v7', 'sb19_hub_articles_v7', 'sb19_hub_profiles', 'sb19_hub_articles'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
    if (raw) {
      const parsed: Profile[] = JSON.parse(raw);
      const clean = parsed.filter(p => !p.title.includes('SB19 '));
      if (clean.length > 0) {
        return clean.sort((a: Profile, b: Profile) => (a.display_order ?? 999) - (b.display_order ?? 999));
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

/** Saves profiles list to browser local storage */
export function saveProfiles(profiles: Profile[]) {
  if (typeof window !== 'undefined') {
    const clean = profiles.filter(p => !p.title.includes('SB19 '));
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(clean));
  }
}

// In-memory cache to prevent redundant DB calls during fast UI navigation
let cachedProfiles: { data: Profile[]; timestamp: number } | null = null;
let cachedArticles: { data: Article[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds TTL for egress & performance optimization

/** Invalidates short-lived memory cache to force fresh DB fetch on mutations */
export function clearDataStoreCache() {
  cachedProfiles = null;
  cachedArticles = null;
}

function sanitizeForBbqWarriorsProfiles(profile: Partial<Profile>) {
  const allowed = [
    'id', 'bbq_warrior_id', 'josh_cullen_artist_id', 'title', 'slug', 'description',
    'official_spotify_playlist_url', 'official_spotify_track_url', 'embedded_youtube_mv_url',
    'official_youtube_channel_url', 'bbq_warrior_badge', 'accent_color', 'theme',
    'cover_image', 'profile_image', 'status', 'custom_social_links', 'display_order',
    'support_qr_options', 'youtube_url', 'facebook_url', 'instagram_url', 'x_url',
    'threads_url', 'website_url', 'featured_video_url', 'support_qr_image',
    'support_title', 'support_note', 'profile_type', 'created_at', 'updated_at'
  ];
  const clean: Record<string, any> = {};
  for (const k of Object.keys(profile)) {
    if (allowed.includes(k)) {
      clean[k] = (profile as any)[k];
    }
  }
  if (!clean.bbq_warrior_id) {
    clean.bbq_warrior_id = `bbq-warrior-${profile.slug || Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }
  return clean;
}

export async function fetchProfilesFromSupabase(forceFresh = false): Promise<Profile[]> {
  const now = Date.now();
  if (forceFresh) {
    clearDataStoreCache();
  } else if (cachedProfiles && (now - cachedProfiles.timestamp < CACHE_TTL_MS)) {
    return cachedProfiles.data;
  }

  // Try Edge-cached API route first for public visitors (skip if forceFresh)
  if (!forceFresh && typeof window !== 'undefined') {
    try {
      const edgeRes = await fetch('/api/public/data');
      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json();
        if (edgeJson.profiles && Array.isArray(edgeJson.profiles) && edgeJson.profiles.length > 0) {
          const cleanProfs = edgeJson.profiles.filter((p: Profile) => !p.title.includes('SB19 '));
          saveProfiles(cleanProfs);
          cachedProfiles = { data: cleanProfs, timestamp: now };
          return cleanProfs;
        }
      }
    } catch {
      // Fallback to direct Supabase
    }
  }

  try {
    const supabase = createClient();
    let queryPromise = supabase
      .from('bbq_warriors_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 6000)
    );

    let { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      if (data.length === 0) {
        saveProfiles([]);
        cachedProfiles = { data: [], timestamp: now };
        return [];
      }

      const localProfiles = getStoredProfiles();
      const merged = (data as Profile[]).map((sp, idx) => {
        const lp = localProfiles.find(p => p.id === sp.id || (p as any).bbq_warrior_id === (sp as any).bbq_warrior_id);
        const validVideoUrl = sp.featured_video_url || (sp as any).embedded_youtube_mv_url || (sp.youtube_url && sp.youtube_url.includes('v=') ? sp.youtube_url : null) || lp?.featured_video_url || null;
        const computedSlug = sp.slug || sp.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `profile-${sp.id.substring(0, 6)}`;
        const computedStatus = sp.status || 'published';

        return {
          ...sp,
          slug: computedSlug,
          status: computedStatus,
          featured_video_url: validVideoUrl,
          embedded_youtube_mv_url: validVideoUrl,
          youtube_url: validVideoUrl || (sp as any).official_youtube_channel_url || 'https://www.youtube.com/@JoshCullenOfficial',
          display_order: sp.display_order ?? lp?.display_order ?? idx + 1,
          custom_social_links: sp.custom_social_links ?? lp?.custom_social_links ?? null,
        };
      }).sort((a: Profile, b: Profile) => (a.display_order ?? 999) - (b.display_order ?? 999));
      saveProfiles(merged);
      cachedProfiles = { data: merged, timestamp: now };
      return merged;
    }
  } catch {
    // Ignore, fallback to stored profiles
  }
  return getStoredProfiles();
}

export async function saveProfileToSupabase(profile: Partial<Profile>): Promise<{ success: boolean; error?: string; data?: Profile }> {
  clearDataStoreCache();

  // Ensure unique bbq_warrior_id to prevent Supabase database constraint conflict
  const bbqWarriorId = (profile as any).bbq_warrior_id || `bbq-warrior-${profile.slug || Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const profilePayload = {
    ...profile,
    bbq_warrior_id: bbqWarriorId,
    embedded_youtube_mv_url: profile.featured_video_url || (profile as any).embedded_youtube_mv_url || profile.youtube_url || null,
  };

  // Always update local storage first so local changes persist seamlessly
  if (profile.id) {
    const current = getStoredProfiles();
    const idx = current.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...profilePayload } as Profile;
    } else {
      current.unshift(profilePayload as Profile);
    }
    saveProfiles(current);
  }

  try {
    const supabase = createClient();

    // 1. Try upserting full profile payload to bbq_warriors_profiles
    const fullRes = await supabase
      .from('bbq_warriors_profiles')
      .upsert(profilePayload)
      .select()
      .maybeSingle();

    if (!fullRes.error && fullRes.data) {
      const resultData = {
        ...(fullRes.data as Profile),
        custom_social_links: fullRes.data.custom_social_links ?? profile.custom_social_links ?? null,
      };
      const all = getStoredProfiles();
      const idx = all.findIndex(p => p.id === resultData.id);
      if (idx >= 0) all[idx] = resultData;
      else all.unshift(resultData);
      saveProfiles(all);
      return { success: true, data: resultData };
    }

    // 2. If full upsert fails, upsert sanitized fields
    const bbqClean = sanitizeForBbqWarriorsProfiles(profilePayload);
    const bbqRes = await supabase
      .from('bbq_warriors_profiles')
      .upsert(bbqClean)
      .select()
      .maybeSingle();

    if (!bbqRes.error && bbqRes.data) {
      const resultData = {
        ...profilePayload,
        ...(bbqRes.data as any),
        custom_social_links: profile.custom_social_links ?? null,
      } as Profile;
      const all = getStoredProfiles();
      const idx = all.findIndex(p => p.id === resultData.id);
      if (idx >= 0) all[idx] = resultData;
      else all.unshift(resultData);
      saveProfiles(all);
      return { success: true, data: resultData };
    }

    return { success: true, data: profilePayload as Profile };
  } catch (err: any) {
    console.warn('Supabase saveProfile notice:', err?.message || err);
    return { success: true, data: profilePayload as Profile };
  }
}

// 2. ARTICLES
export function getStoredArticles(): Article[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ARTICLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveArticles(articles: Article[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_ARTICLES, JSON.stringify(articles));
  }
}

function sanitizeForBbqWarriorsArticles(article: Partial<Article>) {
  const allowed = [
    'id', 'profile_id', 'article_url', 'canonical_url', 'website_name', 'title',
    'thumbnail', 'description', 'highlight_quote', 'display_order', 'status',
    'clicks_count', 'device_breakdown', 'country_breakdown', 'created_at', 'updated_at'
  ];
  const clean: Record<string, any> = {};
  for (const k of Object.keys(article)) {
    if (allowed.includes(k) && (article as any)[k] !== undefined) {
      clean[k] = (article as any)[k];
    }
  }
  return clean;
}

export async function fetchArticlesFromSupabase(forceFresh = false): Promise<Article[]> {
  const now = Date.now();
  if (forceFresh) {
    clearDataStoreCache();
  } else if (cachedArticles && (now - cachedArticles.timestamp < CACHE_TTL_MS)) {
    return cachedArticles.data;
  }

  // Try Edge-cached API route first for public visitors (skip if forceFresh)
  if (!forceFresh && typeof window !== 'undefined') {
    try {
      const edgeRes = await fetch('/api/public/data');
      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json();
        if (edgeJson.articles && Array.isArray(edgeJson.articles)) {
          const localArticles = getStoredArticles();
          const map = new Map<string, Article>();
          localArticles.forEach(a => map.set(a.id, a));
          edgeJson.articles.forEach((a: Article) => map.set(a.id, { ...a, status: a.status || 'published' }));

          const merged = Array.from(map.values()).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
          saveArticles(merged);
          cachedArticles = { data: merged, timestamp: now };
          return merged;
        }
      }
    } catch {
      // Fallback to direct Supabase
    }
  }

  try {
    const supabase = createClient();
    let queryPromise = supabase
      .from('bbq_warriors_articles')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 6000)
    );

    let { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      const localArticles = getStoredArticles();
      const map = new Map<string, Article>();
      localArticles.forEach(a => map.set(a.id, a));
      (data as Article[]).forEach(a => map.set(a.id, { ...a, status: a.status || 'published' }));

      const merged = Array.from(map.values()).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
      saveArticles(merged);
      cachedArticles = { data: merged, timestamp: now };
      return merged;
    }
  } catch {
    // Ignore
  }
  return getStoredArticles();
}

export async function saveArticleToSupabase(article: Partial<Article>): Promise<{ success: boolean; error?: string; data?: Article }> {
  clearDataStoreCache();

  // 1. Update local storage immediately so local additions persist instantly
  if (article.id) {
    const current = getStoredArticles();
    const idx = current.findIndex(a => a.id === article.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...article } as Article;
    } else {
      current.unshift(article as Article);
    }
    saveArticles(current);
  }

  try {
    const supabase = createClient();
    const res = await supabase
      .from('bbq_warriors_articles')
      .upsert(article)
      .select()
      .maybeSingle();

    if (!res.error && res.data) {
      const resultData = { ...article, ...res.data } as Article;
      const all = getStoredArticles();
      const idx = all.findIndex(a => a.id === resultData.id);
      if (idx >= 0) all[idx] = resultData;
      else all.unshift(resultData);
      saveArticles(all);
      return { success: true, data: resultData };
    }

    // 2. Retry with sanitized payload if full upsert fails
    const sanitized = sanitizeForBbqWarriorsArticles(article);
    const retryRes = await supabase
      .from('bbq_warriors_articles')
      .upsert(sanitized)
      .select()
      .maybeSingle();

    if (!retryRes.error && retryRes.data) {
      const resultData = { ...article, ...retryRes.data } as Article;
      const all = getStoredArticles();
      const idx = all.findIndex(a => a.id === resultData.id);
      if (idx >= 0) all[idx] = resultData;
      else all.unshift(resultData);
      saveArticles(all);
      return { success: true, data: resultData };
    }
  } catch (err: any) {
    console.warn('Supabase saveArticle notice:', err?.message || err);
  }
  return { success: true, data: article as Article };
}

export async function updateArticleStatusInSupabase(articleId: string, status: ArticleStatus): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();
  const current = getStoredArticles();
  const idx = current.findIndex(a => a.id === articleId);
  if (idx >= 0) {
    current[idx] = { ...current[idx], status, updated_at: new Date().toISOString() };
    saveArticles(current);
  }

  try {
    const supabase = createClient();
    await supabase
      .from('bbq_warriors_articles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', articleId);
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase updateArticleStatus notice:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export async function updateProfilesOrderInSupabase(updates: { id: string; display_order: number }[]): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();

  // Update local storage first
  const current = getStoredProfiles();
  const updatedLocal = current.map(prof => {
    const match = updates.find(u => u.id === prof.id);
    return match ? { ...prof, display_order: match.display_order, updated_at: new Date().toISOString() } : prof;
  });
  saveProfiles(updatedLocal);

  try {
    const supabase = createClient();
    await Promise.all(
      updates.map(u =>
        supabase
          .from('bbq_warriors_profiles')
          .update({ display_order: u.display_order, updated_at: new Date().toISOString() })
          .eq('id', u.id)
      )
    );
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase updateProfilesOrder notice:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export async function updateArticlesOrderInSupabase(updates: { id: string; display_order: number }[]): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();

  // Update local storage first
  const current = getStoredArticles();
  const updatedLocal = current.map(art => {
    const match = updates.find(u => u.id === art.id);
    return match ? { ...art, display_order: match.display_order, updated_at: new Date().toISOString() } : art;
  });
  saveArticles(updatedLocal);

  try {
    const supabase = createClient();
    await Promise.all(
      updates.map(u =>
        supabase
          .from('bbq_warriors_articles')
          .update({ display_order: u.display_order, updated_at: new Date().toISOString() })
          .eq('id', u.id)
      )
    );
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase updateArticlesOrder notice:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export async function deleteArticleFromSupabase(articleId: string): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();
  // Update local storage first
  const current = getStoredArticles();
  const filtered = current.filter(a => a.id !== articleId);
  saveArticles(filtered);

  try {
    const supabase = createClient();
    await supabase
      .from('bbq_warriors_articles')
      .delete()
      .eq('id', articleId);
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase deleteArticle notice:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export async function deleteProfileFromSupabase(profileId: string): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();
  // Update local storage first
  const current = getStoredProfiles();
  const filtered = current.filter(p => p.id !== profileId && p.slug !== profileId);
  saveProfiles(filtered);

  if (typeof window !== 'undefined') {
    const activeId = localStorage.getItem('sb19_active_profile_id');
    if (activeId === profileId) {
      localStorage.removeItem('sb19_active_profile_id');
    }
  }

  try {
    const supabase = createClient();
    await supabase
      .from('bbq_warriors_profiles')
      .delete()
      .or(`id.eq.${profileId},slug.eq.${profileId}`);
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase deleteProfile notice:', err?.message || err);
    return { success: true };
  }
}

// 3. SUBMISSIONS
export function getStoredSubmissions(): ArticleSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubmissions(submissions: ArticleSubmission[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
  }
}

export async function fetchSubmissionsFromSupabase(): Promise<ArticleSubmission[]> {
  try {
    const supabase = createClient();
    const queryPromise = supabase
      .from('bbq_warriors_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 6000)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      saveSubmissions(data as ArticleSubmission[]);
      return data as ArticleSubmission[];
    }
  } catch {
    // Ignore
  }
  return getStoredSubmissions();
}

export async function approveSubmissionInSupabase(sub: ArticleSubmission, newArt: Article) {
  clearDataStoreCache();
  try {
    const supabase = createClient();
    await supabase.from('bbq_warriors_articles').upsert(newArt);
    await supabase.from('bbq_warriors_submissions').update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    }).eq('id', sub.id);
  } catch (err) {
    console.error('Error approving submission in Supabase:', err);
  }
}

export async function updateSubmissionStatusInSupabase(subId: string, status: 'rejected' | 'duplicate', notes?: string) {
  try {
    const supabase = createClient();
    await supabase.from('bbq_warriors_submissions').update({
      status,
      notes: notes || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', subId);
  } catch (err) {
    console.error('Error updating submission status in Supabase:', err);
  }
}

export async function updateSubmissionInSupabase(sub: ArticleSubmission) {
  try {
    const supabase = createClient();
    await supabase.from('bbq_warriors_submissions').upsert(sub);
  } catch (err) {
    console.error('Error updating submission in Supabase:', err);
  }
}

export async function deleteSubmissionFromSupabase(subId: string): Promise<{ success: boolean; error?: string }> {
  clearDataStoreCache();
  // Update local storage first
  const current = getStoredSubmissions();
  const filtered = current.filter(s => s.id !== subId);
  saveSubmissions(filtered);

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('bbq_warriors_submissions')
      .delete()
      .eq('id', subId);

    if (error) {
      console.warn('Supabase deleteSubmission notice:', error.message || error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase deleteSubmission notice:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

export function clearAllData() {
  if (typeof window !== 'undefined') {
    const keys = [
      'sb19_hub_profiles_v5', 'sb19_hub_profiles_v4', 'sb19_hub_profiles_v3', 'sb19_hub_profiles_v2', 'sb19_hub_profiles_v1', 'sb19_hub_profiles', 'sb19_profiles',
      'sb19_hub_articles_v5', 'sb19_hub_articles_v4', 'sb19_hub_articles_v3', 'sb19_hub_articles_v2', 'sb19_hub_articles_v1', 'sb19_hub_articles', 'sb19_articles',
      'sb19_hub_submissions_v5', 'sb19_hub_submissions_v4', 'sb19_hub_submissions_v3', 'sb19_hub_submissions_v2', 'sb19_hub_submissions_v1', 'sb19_hub_submissions', 'sb19_submissions'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function submitArticleLink(
  profileId: string,
  rawUrl: string,
  notes?: string,
  metadata?: Partial<ExtractedMetadata>
): Promise<{ success: boolean; message: string; submission?: ArticleSubmission }> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { success: false, message: 'Invalid URL provided.' };
  }

  const targetCanonical = normalizeUrl(metadata?.canonicalUrl || normalized);
  const inputTitle = metadata?.title;

  const articles = getStoredArticles();
  const submissions = getStoredSubmissions();

  // 1. Local Storage Check (BOTH canonical_url AND article_url AND title)
  const publishedUrls = articles.flatMap(a => [a.canonical_url, a.article_url].filter(Boolean) as string[]);
  const publishedTitles = articles.map(a => a.title).filter(Boolean) as string[];
  if (isDuplicateUrl(normalized, publishedUrls, inputTitle, publishedTitles) || isDuplicateUrl(targetCanonical, publishedUrls, inputTitle, publishedTitles)) {
    return { success: false, message: 'This link or article title already exists in the directory.' };
  }

  const pendingSubs = submissions.filter(s => s.status === 'pending' || s.status === 'approved');
  const pendingUrls = pendingSubs.flatMap(s => [s.canonical_url, s.article_url].filter(Boolean) as string[]);
  const pendingTitles = pendingSubs.map(s => s.title).filter(Boolean) as string[];

  if (isDuplicateUrl(normalized, pendingUrls, inputTitle, pendingTitles) || isDuplicateUrl(targetCanonical, pendingUrls, inputTitle, pendingTitles)) {
    return { success: false, message: 'This link or article title has already been submitted and is pending review.' };
  }

  // 2. Direct Supabase Database Check (Blocks duplicate submissions from different devices/browsers)
  try {
    const supabase = createClient();
    const [dbArtRes, dbSubRes] = await Promise.all([
      supabase.from('bbq_warriors_articles').select('article_url, canonical_url, title'),
      supabase.from('bbq_warriors_submissions').select('article_url, canonical_url, title').in('status', ['pending', 'approved'])
    ]);

    if (dbArtRes.data && dbArtRes.data.length > 0) {
      const dbArtUrls = dbArtRes.data.flatMap(a => [a.canonical_url, a.article_url].filter(Boolean) as string[]);
      const dbArtTitles = dbArtRes.data.map(a => a.title).filter(Boolean) as string[];
      if (isDuplicateUrl(normalized, dbArtUrls, inputTitle, dbArtTitles) || isDuplicateUrl(targetCanonical, dbArtUrls, inputTitle, dbArtTitles)) {
        return { success: false, message: 'This link or article title already exists in the directory.' };
      }
    }

    if (dbSubRes.data && dbSubRes.data.length > 0) {
      const dbSubUrls = dbSubRes.data.flatMap(s => [s.canonical_url, s.article_url].filter(Boolean) as string[]);
      const dbSubTitles = dbSubRes.data.map(s => s.title).filter(Boolean) as string[];
      if (isDuplicateUrl(normalized, dbSubUrls, inputTitle, dbSubTitles) || isDuplicateUrl(targetCanonical, dbSubUrls, inputTitle, dbSubTitles)) {
        return { success: false, message: 'This link or article title has already been submitted by another user and is pending review.' };
      }
    }
  } catch {
    // Ignore DB fetch failure, fallback to local check
  }

  const newSubmission: ArticleSubmission = {
    id: generateUUID(),
    profile_id: profileId,
    article_url: rawUrl,
    canonical_url: metadata?.canonicalUrl || normalized,
    website_name: metadata?.websiteName || new URL(normalized).hostname.replace('www.', ''),
    title: metadata?.title || 'Submitted Article Link',
    thumbnail: metadata?.thumbnail || null,
    description: metadata?.description || null,
    notes: notes || null,
    status: 'pending',
    submitted_by_name: 'Community Fan',
    submitted_by_email: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [newSubmission, ...submissions];
  saveSubmissions(updated);

  // Sync to Supabase DB
  try {
    const supabase = createClient();
    await supabase.from('bbq_warriors_submissions').insert(newSubmission);
  } catch {
    // Ignore
  }

  return { success: true, message: 'Thank you! Your article submission has been received for review.', submission: newSubmission };
}

export function getStoredAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ANALYTICS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalyticsEvents(events: AnalyticsEvent[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_ANALYTICS, JSON.stringify(events));
  }
}

export async function fetchAnalyticsEventsFromSupabase(profileId: string): Promise<AnalyticsEvent[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error && data) {
      saveAnalyticsEvents(data as AnalyticsEvent[]);
      return data as AnalyticsEvent[];
    }
  } catch {
    // Ignore
  }
  return getStoredAnalyticsEvents().filter(e => e.profile_id === profileId);
}

export function getStoredDailyTrafficStats(): DailyTrafficStat[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_TRAFFIC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDailyTrafficStats(stats: DailyTrafficStat[]) {
  if (typeof window !== 'undefined') {
    const existing = getStoredDailyTrafficStats();
    const map = new Map<string, DailyTrafficStat>();
    existing.forEach(s => map.set(s.id, s));
    stats.forEach(s => map.set(s.id, s));
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_TRAFFIC, JSON.stringify(Array.from(map.values())));
  }
}

export async function fetchDailyTrafficStatsFromSupabase(profileId: string): Promise<DailyTrafficStat[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_traffic_stats')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(90);

    if (!error && data) {
      saveDailyTrafficStats(data as DailyTrafficStat[]);
      return data as DailyTrafficStat[];
    }
  } catch {
    // Ignore
  }
  return getStoredDailyTrafficStats().filter(s => s.profile_id === profileId);
}

export function getVisitorHash(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let hash = localStorage.getItem('sb19_visitor_hash');
    if (!hash) {
      hash = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('sb19_visitor_hash', hash);
    }
    return hash;
  } catch {
    return 'anon';
  }
}

export async function recordProfileView(profileId: string) {
  if (typeof window === 'undefined' || !profileId) return;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return;

  const todayStr = new Date().toISOString().split('T')[0];

  // Session-level view deduplication to save DB writes and Egress
  if (typeof sessionStorage !== 'undefined') {
    const sessionKey = `pv_${profileId}_${todayStr}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  }

  const device = detectDeviceType();
  const country = await detectCountryCode();
  const visitorHash = await getClientIp();

  const profiles = getStoredProfiles();
  const idx = profiles.findIndex(p => p.id === profileId);

  const nowIso = new Date().toISOString();
  const newEvent: AnalyticsEvent = {
    id: generateUUID(),
    profile_id: profileId,
    article_id: null,
    event_type: 'profile_view',
    visitor_hash: visitorHash,
    country,
    device,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    created_at: nowIso,
  };

  const stored = getStoredAnalyticsEvents();
  saveAnalyticsEvents([newEvent, ...stored]);

  try {
    const supabase = createClient();
    await Promise.all([
      supabase.rpc('increment_profile_views', { p_id: profileId }),
      supabase.from('analytics_events').insert(newEvent),
      supabase.rpc('increment_daily_profile_view', {
        p_profile_id: profileId,
        p_date: todayStr,
        p_device: device,
        p_country: country,
        p_referrer: normalizeReferrer(newEvent.referrer),
      }),
    ]);
  } catch {
    // Ignore
  }
}

export async function recordArticleClick(articleId: string) {
  if (typeof window === 'undefined' || !articleId) return;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return;

  const device = detectDeviceType();
  const country = await detectCountryCode();
  const visitorHash = await getClientIp();

  const articles = getStoredArticles();
  const idx = articles.findIndex(a => a.id === articleId);
  let newCount = 1;
  let deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  let countryMap: Record<string, number> = {};
  let targetProfileId = '';

  if (idx >= 0) {
    const art = articles[idx];
    targetProfileId = art.profile_id;
  }

  if (targetProfileId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const newEvent: AnalyticsEvent = {
      id: generateUUID(),
      profile_id: targetProfileId,
      article_id: articleId,
      event_type: 'article_click',
      visitor_hash: visitorHash,
      country,
      device,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      created_at: nowIso,
    };

    const stored = getStoredAnalyticsEvents();
    saveAnalyticsEvents([newEvent, ...stored]);

    try {
      const supabase = createClient();
      await Promise.all([
        supabase.rpc('increment_article_clicks', { a_id: articleId }),
        supabase.from('analytics_events').insert(newEvent),
        supabase.rpc('increment_daily_article_click', {
          p_profile_id: targetProfileId,
          p_date: todayStr,
          p_device: device,
          p_country: country,
        }),
      ]);
    } catch {
      // Ignore
    }
  }
}

// 6. NOTIFICATIONS & BROADCASTS
export function getStoredNotifications(): NotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return [];
}

export function saveNotifications(notifications: NotificationItem[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  }
}

export async function fetchNotificationsFromSupabase(): Promise<NotificationItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      saveNotifications(data);
      return data;
    }
  } catch {
    // Ignore
  }
  return getStoredNotifications();
}

export function exportDataBackup() {
  if (typeof window === 'undefined') return;
  const backup = {
    profiles: getStoredProfiles(),
    articles: getStoredArticles(),
    submissions: getStoredSubmissions(),
    analytics: getStoredAnalyticsEvents(),
    dailyTraffic: getStoredDailyTrafficStats(),
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sb19_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

