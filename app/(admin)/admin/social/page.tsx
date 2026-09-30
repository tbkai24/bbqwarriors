'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { Share2, Check, Save, Plus, Trash2, Globe, Video, MessageSquare, Copy } from 'lucide-react';

interface SocialLinkItem {
  id: string;
  platform: string;
  customName?: string;
  url: string;
}

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube', icon: Video, color: 'text-red-600' },
  { value: 'instagram', label: 'Instagram', icon: Share2, color: 'text-pink-600' },
  { value: 'facebook', label: 'Facebook', icon: Share2, color: 'text-blue-600' },
  { value: 'x', label: 'X (Twitter)', icon: Share2, color: 'text-sky-600' },
  { value: 'threads', label: 'Threads', icon: MessageSquare, color: 'text-purple-600' },
  { value: 'tiktok', label: 'TikTok', icon: Share2, color: 'text-slate-800' },
  { value: 'spotify', label: 'Spotify', icon: Share2, color: 'text-emerald-600' },
  { value: 'apple', label: 'Apple Music', icon: Share2, color: 'text-rose-600' },
  { value: 'website', label: 'Official Website', icon: Globe, color: 'text-emerald-600' },
  { value: 'custom', label: '+ Add Custom Platform...', icon: Share2, color: 'text-rose-600' },
] as const;

export default function SocialLinksAdminPage() {
  const { activeProfile, refreshData } = useAdminWorkspace();
  const [links, setLinks] = useState<SocialLinkItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      const initialLinks: SocialLinkItem[] = [];
      if (activeProfile.youtube_url) {
        const isVideo = activeProfile.youtube_url.includes('watch?v=') || activeProfile.youtube_url.includes('youtu.be/');
        const cleanYt = isVideo ? 'https://www.youtube.com/@sb19official' : activeProfile.youtube_url;
        initialLinks.push({ id: 'yt', platform: 'youtube', url: cleanYt });
      }
      if (activeProfile.instagram_url) initialLinks.push({ id: 'ig', platform: 'instagram', url: activeProfile.instagram_url });
      if (activeProfile.facebook_url) initialLinks.push({ id: 'fb', platform: 'facebook', url: activeProfile.facebook_url });
      if (activeProfile.x_url) initialLinks.push({ id: 'x', platform: 'x', url: activeProfile.x_url });
      if (activeProfile.threads_url) initialLinks.push({ id: 'th', platform: 'threads', url: activeProfile.threads_url });
      if (activeProfile.website_url) initialLinks.push({ id: 'web', platform: 'website', url: activeProfile.website_url });

      if (activeProfile.custom_social_links) {
        activeProfile.custom_social_links.forEach((c, idx) => {
          const matchingOpt = PLATFORM_OPTIONS.find(p => p.label.toLowerCase() === c.platform.toLowerCase() || p.value.toLowerCase() === c.platform.toLowerCase());
          initialLinks.push({
            id: `custom-${idx}`,
            platform: matchingOpt ? matchingOpt.value : 'custom',
            customName: matchingOpt ? undefined : c.platform,
            url: c.url,
          });
        });
      }

      setLinks(initialLinks);
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const allStoredProfiles = getStoredProfiles();
  const otherProfiles = allStoredProfiles.filter(p => p.id !== activeProfile.id);

  const handleImportSocialsFromProfile = (targetProfileId: string) => {
    if (!targetProfileId) return;
    const sourceProfile = allStoredProfiles.find(p => p.id === targetProfileId);
    if (!sourceProfile) return;

    const imported: SocialLinkItem[] = [];
    if (sourceProfile.youtube_url) imported.push({ id: `yt-${Date.now()}`, platform: 'youtube', url: sourceProfile.youtube_url });
    if (sourceProfile.instagram_url) imported.push({ id: `ig-${Date.now()}`, platform: 'instagram', url: sourceProfile.instagram_url });
    if (sourceProfile.facebook_url) imported.push({ id: `fb-${Date.now()}`, platform: 'facebook', url: sourceProfile.facebook_url });
    if (sourceProfile.x_url) imported.push({ id: `x-${Date.now()}`, platform: 'x', url: sourceProfile.x_url });
    if (sourceProfile.threads_url) imported.push({ id: `th-${Date.now()}`, platform: 'threads', url: sourceProfile.threads_url });
    if (sourceProfile.website_url) imported.push({ id: `web-${Date.now()}`, platform: 'website', url: sourceProfile.website_url });

    if (sourceProfile.custom_social_links) {
      sourceProfile.custom_social_links.forEach((c, idx) => {
        imported.push({
          id: `custom-${idx}-${Date.now()}`,
          platform: 'custom',
          customName: c.platform,
          url: c.url,
        });
      });
    }

    setLinks(imported);
  };

  const handleAddLink = () => {
    const availablePlatforms = PLATFORM_OPTIONS.filter(p => p.value !== 'custom' && !links.some(l => l.platform === p.value));
    const nextPlatform = availablePlatforms.length > 0 ? availablePlatforms[0].value : 'custom';
    setLinks([...links, { id: `link-${Date.now()}`, platform: nextPlatform, customName: '', url: '' }]);
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const handleUpdateLink = (id: string, field: 'platform' | 'customName' | 'url', val: string) => {
    setLinks(links.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const allProfiles = getStoredProfiles();

    const getUrl = (plat: string) => {
      const found = links.find(l => l.platform === plat);
      return found && found.url.trim() ? found.url.trim() : null;
    };

    const customLinks = links
      .filter(l => l.platform === 'custom' || !['youtube', 'instagram', 'facebook', 'x', 'threads', 'website'].includes(l.platform))
      .filter(l => l.url.trim())
      .map(l => ({
        platform: l.customName?.trim() || (PLATFORM_OPTIONS.find(p => p.value === l.platform)?.label || 'Social'),
        url: l.url.trim(),
      }));

    const updatedProfile = {
      ...activeProfile,
      youtube_url: getUrl('youtube'),
      instagram_url: getUrl('instagram'),
      facebook_url: getUrl('facebook'),
      x_url: getUrl('x'),
      threads_url: getUrl('threads'),
      website_url: getUrl('website'),
      custom_social_links: customLinks.length > 0 ? customLinks : null,
      updated_at: new Date().toISOString(),
    };

    const updated = allProfiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    saveProfiles(updated);
    await saveProfileToSupabase(updatedProfile);

    refreshData();
    setSavedSuccess(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-rose-600" />
          <span>Official Social Links</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Add and manage official social links for workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>. Only added links will appear on the public page.
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Social media links saved successfully!</span>
          </div>
        )}

        {/* Quick Import Socials Selector */}
        {otherProfiles.length > 0 && (
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-900 font-bold">
              <Copy className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Copy Socials from another Profile:</span>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleImportSocialsFromProfile(e.target.value);
                e.target.value = '';
              }}
              className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-2xs cursor-pointer w-full sm:w-auto"
            >
              <option value="" disabled>Select Profile to Copy From...</option>
              {otherProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  Copy from {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {links.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Share2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No social media links added yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Click the button below to add your official social links.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                <select
                  value={item.platform}
                  onChange={(e) => handleUpdateLink(item.id, 'platform', e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500 shrink-0"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {item.platform === 'custom' && (
                  <input
                    type="text"
                    required
                    value={item.customName || ''}
                    onChange={(e) => handleUpdateLink(item.id, 'customName', e.target.value)}
                    placeholder="Platform Name (e.g. Weverse)"
                    className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500 shadow-2xs"
                  />
                )}

                <input
                  type="url"
                  required
                  value={item.url}
                  onChange={(e) => handleUpdateLink(item.id, 'url', e.target.value)}
                  placeholder={item.platform === 'custom' ? 'https://...' : `Enter ${item.platform} URL...`}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveLink(item.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                  title="Remove social link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddLink}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-600" />
            <span>Add Social Media Link</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Social Links</span>
          </button>
        </div>
      </form>
    </div>
  );
}
