'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Profile, Article } from '@/types/database';
import { getStoredProfiles, getStoredArticles, fetchProfilesFromSupabase, fetchArticlesFromSupabase, isArticleForProfile } from '@/lib/data-store';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { PublicFooter } from '@/components/public/footer';
import { BrandLogo } from '@/components/public/logo';
import { SupportModal } from '@/components/public/support-modal';
import { Search, ArrowRight, Music } from 'lucide-react';

export default function PublicHomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const loadData = async () => {
    // 1. Initial local load
    const localProfiles = getStoredProfiles().filter(p => p.status === 'published');
    const localArticles = getStoredArticles().filter(a => a.status === 'published');
    setProfiles(localProfiles);
    setArticles(localArticles);

    // 2. Fetch fresh data strictly from Supabase DB (no hardcoded defaults)
    try {
      const dbProfiles = await fetchProfilesFromSupabase();
      const dbArticles = await fetchArticlesFromSupabase();

      const publishedProfs = dbProfiles
        .filter(p => p.status === 'published')
        .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
      const publishedArts = dbArticles.filter(a => a.status === 'published');

      setProfiles(publishedProfs);
      setArticles(publishedArts);
    } catch {
      // Keep local profiles
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProfiles = profiles.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getArticleCount = (profile: Profile) => {
    return articles.filter(a => isArticleForProfile(a, profile)).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Soft Blue & Sky Blue ambient glow background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-500/15 blur-[140px] pointer-events-none rounded-full animate-pulse-blue" />
      <div className="fixed bottom-0 right-0 w-[450px] h-[350px] bg-blue-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header / Brand Bar */}
      <div className="w-full max-w-xl flex items-center justify-center mb-8 z-10">
        <BrandLogo size="md" showText={true} />
      </div>

      {/* Main Container */}
      <main className="w-full max-w-xl z-10 flex flex-col items-center">
        {/* Title / Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold mb-3 shadow-xs">
            <span>Josh Cullen Streaming & Support Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            BBQ Warriors
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
            Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.
          </p>
        </div>

        {/* Instant Search Bar */}
        <div className="w-full relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Josh Cullen MV releases & Spotify playlists..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 text-sm shadow-md transition-all font-medium"
          />
        </div>

        {/* Content Area */}
        <div className="w-full space-y-4">
          {isLoading && profiles.length === 0 ? (
            <div className="space-y-4">
              <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
              <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="w-full p-8 text-center glass-panel rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center bg-white">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mb-3 shadow-xs">
                <Music className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Nothing here yet.</h2>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium bg-white">
              Nothing here yet.
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const count = getArticleCount(profile);
              return (
                <div
                  key={profile.id}
                  className="group relative block w-full rounded-2xl overflow-hidden glass-card p-4 border border-slate-200/90 hover:border-sky-400 shadow-sm hover:shadow-md transition-all bg-white"
                >
                  <Link href={`/profile/${profile.slug}`} className="block">
                    <div className="flex items-center gap-4">
                      {/* Image / Avatar */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                        {profile.cover_image || profile.profile_image ? (
                          <img
                            src={getCloudinaryImageUrl(profile.profile_image || profile.cover_image || '', { width: 200 })}
                            alt={profile.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                            <Music className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h2 className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-sky-600 transition-colors">
                            {profile.title}
                          </h2>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                            {count} articles
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                          {profile.description || 'Compilation of Josh Cullen MV embeds & official Spotify tracks.'}
                        </p>
                      </div>

                      {/* Arrow Icon Button */}
                      <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-sky-600 transition-all shadow-xs">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <PublicFooter onOpenSupport={() => setIsSupportModalOpen(true)} />
      </main>

      {/* Support Modal */}
      {isSupportModalOpen && (
        <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
      )}
    </div>
  );
}
