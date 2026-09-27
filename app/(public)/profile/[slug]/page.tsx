'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { Profile, Article } from '@/types/database';
import { getStoredProfiles, getStoredArticles, fetchProfilesFromSupabase, fetchArticlesFromSupabase, recordProfileView } from '@/lib/data-store';
import { createClient } from '@/lib/supabase/client';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { extractYouTubeId, decodeHtmlEntities, isEligibleForArticleOfTheDay, translateTextToEnglish, compareByFrontNumber } from '@/lib/url-normalizer';
import { SocialLinks } from '@/components/public/social-links';
import { ArticleCard } from '@/components/public/article-card';
import { SubmitModal } from '@/components/public/submit-modal';
import { SupportModal } from '@/components/public/support-modal';
import { CountryBreakdownModal } from '@/components/public/country-modal';
import { PublicFooter } from '@/components/public/footer';
import { BrandLogo } from '@/components/public/logo';
import { getCountryFlagEmoji } from '@/lib/device-detector';
import { ArrowLeft, PlusCircle, Radio, Video, Sparkles, ExternalLink, Globe, Heart } from 'lucide-react';

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

function getDailyArticlePick(articles: Article[]): { article: Article; quote: string } | null {
  if (!articles || articles.length === 0) return null;

  // Filter out Reddit, Genius, Google Search, social networks
  const eligible = articles.filter(art => isEligibleForArticleOfTheDay(art));
  const pool = eligible.length > 0 ? eligible : articles;

  const todayStr = new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    hash = (hash << 5) - hash + todayStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  const article = pool[index];

  let quote = article.highlight_quote;
  if (!quote && article.description) {
    const sentences = article.description.split(/(?<=[.!?])\s+/);
    quote = sentences.slice(0, 2).join(' ');
  }
  if (!quote) quote = article.title;

  return { article, quote: decodeHtmlEntities(quote) };
}

function ArticleOfTheDayCard({ articles, isEngagementProfile = false }: { articles: Article[]; isEngagementProfile?: boolean }) {
  const dailyPick = getDailyArticlePick(articles);
  const [displayQuote, setDisplayQuote] = useState<string>(dailyPick?.quote || '');
  const [displayTitle, setDisplayTitle] = useState<string>(dailyPick?.article.title || '');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  useEffect(() => {
    if (!dailyPick) return;
    const rawQuote = decodeHtmlEntities(dailyPick.quote);
    const rawTitle = decodeHtmlEntities(dailyPick.article.title);
    setDisplayQuote(rawQuote);
    setDisplayTitle(rawTitle);

    let isCancelled = false;
    setIsTranslating(true);

    Promise.all([
      translateTextToEnglish(rawQuote),
      translateTextToEnglish(rawTitle),
    ]).then(([transQuote, transTitle]) => {
      if (!isCancelled) {
        if (transQuote) setDisplayQuote(transQuote);
        if (transTitle) setDisplayTitle(transTitle);
      }
    }).finally(() => {
      if (!isCancelled) setIsTranslating(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [dailyPick?.article.id, dailyPick?.quote, dailyPick?.article.title]);

  if (!dailyPick) return null;

  return (
    <div className="w-full mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-rose-500/5 to-purple-500/10 border border-purple-300/40 shadow-sm relative overflow-hidden group">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <Sparkles className="w-3 h-3 text-white" />
          <span>{isEngagementProfile ? 'Engagement Pick of the Day' : 'Article of the Day'}</span>
        </span>
        {isTranslating && (
          <span className="text-[10px] text-purple-700/80 font-bold animate-pulse flex items-center gap-1">
            <Globe className="w-3 h-3 text-purple-600" />
            <span>Translating...</span>
          </span>
        )}
      </div>

      <div className="relative pl-3 border-l-2 border-purple-400 my-2">
        <p className="text-xs sm:text-sm italic font-serif font-medium text-slate-800 leading-relaxed">
          &quot;{displayQuote}&quot;
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-purple-200/40">
        <span className="text-[11px] font-extrabold text-slate-700 truncate">
          {displayTitle}
        </span>
        <a
          href={dailyPick.article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shrink-0 transition-transform active:scale-95 shadow-xs flex items-center gap-1"
        >
          <span>{isEngagementProfile ? 'Engage Pick' : 'Stream Pick'}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function PublicProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const viewRecordedRef = useRef<string | null>(null);

  const loadData = async () => {
    const slug = resolvedParams.slug.toLowerCase();
    
    // 1. Instant local check
    const localProfiles = getStoredProfiles();
    const localMatch = localProfiles.find(p => p.slug.toLowerCase() === slug);
    if (localMatch) {
      setProfile(localMatch);
      if (viewRecordedRef.current !== localMatch.id) {
        viewRecordedRef.current = localMatch.id;
        recordProfileView(localMatch.id);
      }
      const localArticles = getStoredArticles()
        .filter(a => a.profile_id === localMatch.id && a.status === 'published')
        .sort((a, b) => a.display_order !== b.display_order ? a.display_order - b.display_order : compareByFrontNumber(a.title, b.title, 'asc'));
      setArticles(localArticles);
    }

    // 2. Async Supabase sync check
    try {
      const fetchedProfiles = await fetchProfilesFromSupabase();
      let supabaseMatch = fetchedProfiles.find(p => p.slug.toLowerCase() === slug);

      if (!supabaseMatch) {
        const supabase = createClient();
        const { data: directProfile } = await supabase.from('bbq_warriors_profiles').select('*').ilike('slug', slug).maybeSingle();
        if (directProfile) supabaseMatch = directProfile as Profile;
      }

      if (supabaseMatch) {
        setProfile(supabaseMatch);
        if (viewRecordedRef.current !== supabaseMatch.id) {
          viewRecordedRef.current = supabaseMatch.id;
          recordProfileView(supabaseMatch.id);
        }
        const fetchedArticles = await fetchArticlesFromSupabase();
        const profileArts = fetchedArticles
          .filter(a => a.profile_id === supabaseMatch.id && a.status === 'published')
          .sort((a, b) => a.display_order !== b.display_order ? a.display_order - b.display_order : compareByFrontNumber(a.title, b.title, 'asc'));
        setArticles(profileArts);
      }
    } catch {
      // Ignore network errors, keep local
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.slug]);

  // Render Skeleton Loader while loading profile data
  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-6 sm:py-10 relative overflow-hidden">
        <div className="w-full max-w-xl flex items-center justify-between mb-6 z-10">
          <div className="w-28 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
        </div>

        <main className="w-full max-w-xl z-10 flex flex-col items-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-200 animate-pulse mb-4 shadow-sm" />
          <div className="w-56 h-8 bg-slate-200 rounded-xl animate-pulse mb-2" />
          <div className="w-72 h-4 bg-slate-200 rounded-lg animate-pulse mb-6" />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
            <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
          </div>

          <div className="w-full space-y-4">
            <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
            <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
            <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="p-8 text-center glass-panel rounded-2xl max-w-sm border border-slate-200 shadow-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            The release profile &quot;{resolvedParams.slug}&quot; does not exist or has been archived.
          </p>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-block transition-colors shadow-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-6 sm:py-10 relative overflow-hidden">
      {/* Soft Ambient Red Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] blur-[140px] pointer-events-none rounded-full opacity-15"
        style={{ backgroundColor: profile.accent_color || '#e11d48' }}
      />

      {/* Top Navigation Back Link & Brand Logo */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Releases</span>
        </Link>
        <BrandLogo size="sm" showText={false} />
      </div>

      {/* Linktree Profile Container */}
      <main className="w-full max-w-xl z-10 flex flex-col items-center">
        {/* Cover Banner */}
        {profile.cover_image && (
          <div className="w-full h-36 sm:h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md mb-[-40px] relative">
            <img
              src={getCloudinaryImageUrl(profile.cover_image, { width: 800 })}
              alt={profile.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent" />
          </div>
        )}

        {/* Profile Header Avatar */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <div 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-slate-50 shadow-xl bg-slate-100 mb-3 shrink-0"
            style={{ boxShadow: `0 8px 25px ${(profile.accent_color || '#e11d48')}33` }}
          >
            {profile.profile_image || profile.cover_image ? (
              <img
                src={getCloudinaryImageUrl(profile.profile_image || profile.cover_image || '', { width: 300 })}
                alt={profile.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-700 font-extrabold text-2xl">
                {profile.title.charAt(0)}
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {profile.title}
          </h1>

          {profile.description && (
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-1.5 leading-relaxed font-medium">
              {profile.description}
            </p>
          )}

          {/* Social Icons */}
          <SocialLinks profile={profile} />
        </div>

        {/* Featured Official MV Video Player */}
        {(() => {
          const featuredYtId = extractYouTubeId(profile.featured_video_url || profile.youtube_url);
          if (!featuredYtId) return null;
          return (
            <div className="w-full mt-5 mb-1 space-y-2">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <Video className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>Featured Release Video</span>
              </div>
              <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${featuredYtId}?rel=0`}
                  title={`${profile.title} Featured Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          );
        })()}

        {/* Daily Highlight Quote & Article / Engagement Pick of the Day */}
        <ArticleOfTheDayCard articles={articles} isEngagementProfile={profile.profile_type === 'engagement'} />

        {/* Streaming Articles & Social Engagement Links Section */}
        <div className="w-full mt-4 space-y-6">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              {profile.profile_type === 'engagement' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Social Engagement Campaigns ({articles.length})</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-rose-600" />
                  <span>Streaming Articles ({articles.length})</span>
                </>
              )}
            </span>
          </div>

          {articles.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
              No verified links published for {profile.title} yet.
            </div>
          ) : profile.profile_type === 'engagement' ? (
            (() => {
              // Group engagement articles cleanly by platform
              const groups: Record<string, { label: string; icon: string; articles: Article[] }> = {
                tiktok: { label: 'TikTok Campaigns', icon: '🎵', articles: [] },
                facebook: { label: 'Facebook Engagement Links', icon: '📘', articles: [] },
                x: { label: 'X (Twitter) Boost Links', icon: '🐦', articles: [] },
                instagram: { label: 'Instagram Posts', icon: '📸', articles: [] },
                youtube: { label: 'YouTube Community & Shorts', icon: '🔴', articles: [] },
                threads: { label: 'Threads Posts', icon: '🧵', articles: [] },
                other: { label: 'Other Social Campaigns', icon: '🚀', articles: [] },
              };

              articles.forEach(art => {
                const site = (art.website_name || '').toLowerCase();
                const url = (art.article_url || '').toLowerCase();
                if (site.includes('tiktok') || url.includes('tiktok.com')) groups.tiktok.articles.push(art);
                else if (site.includes('facebook') || site.includes('fb') || url.includes('facebook.com')) groups.facebook.articles.push(art);
                else if (site.includes('x') || site.includes('twitter') || url.includes('twitter.com') || url.includes('x.com')) groups.x.articles.push(art);
                else if (site.includes('instagram') || site.includes('ig') || url.includes('instagram.com')) groups.instagram.articles.push(art);
                else if (site.includes('youtube') || site.includes('yt') || url.includes('youtube.com') || url.includes('youtu.be')) groups.youtube.articles.push(art);
                else if (site.includes('threads') || url.includes('threads.net')) groups.threads.articles.push(art);
                else groups.other.articles.push(art);
              });

              return (
                <div className="space-y-6">
                  {Object.entries(groups).map(([gKey, group]) => {
                    if (group.articles.length === 0) return null;
                    return (
                      <div key={gKey} className="space-y-3">
                        <div className="flex items-center gap-2 px-1 pb-1 border-b border-slate-200">
                          <span className="text-sm leading-none">{group.icon}</span>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            {group.label} ({group.articles.length})
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {group.articles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              accentColor={profile.accent_color || '#e11d48'}
                              isEngagementProfile={true}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                accentColor={profile.accent_color || '#e11d48'}
                isEngagementProfile={false}
              />
            ))
          )}

          {/* Community Submit Article Button */}
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="w-full mt-6 py-3.5 px-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-400 text-slate-800 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            <span>
              {profile.profile_type === 'engagement'
                ? `Submit Engagement Link for ${profile.title}`
                : `Submit Article Link for ${profile.title}`}
            </span>
          </button>
        </div>

        <PublicFooter onOpenSupport={() => setIsSupportOpen(true)} />
      </main>

      {/* Community Submit Modal */}
      <SubmitModal
        profile={profile}
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Floating Country Breakdown Modal */}
      <CountryBreakdownModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        countryBreakdown={profile.country_breakdown}
        profileTitle={profile.title}
      />

      {/* Support / Donation QR Modal */}
      <SupportModal
        profile={profile}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </div>
  );
}
