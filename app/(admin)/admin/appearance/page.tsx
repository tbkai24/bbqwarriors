'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { extractYouTubeId } from '@/lib/url-normalizer';
import { Palette, Check, Save, Video, PlayCircle, Share2, Plus, Trash2, Copy } from 'lucide-react';

interface SocialItem {
  id: string;
  platform: string;
  customName?: string;
  url: string;
}

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'threads', label: 'Threads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'apple', label: 'Apple Music' },
  { value: 'website', label: 'Official Website' },
  { value: 'custom', label: '+ Add Custom Platform...' },
] as const;

export default function AppearanceAdminPage() {
  const { activeProfile, refreshData } = useAdminWorkspace();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [accentColor, setAccentColor] = useState('#e11d48');
  const [profileType, setProfileType] = useState<'embed' | 'engagement'>('embed');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState('');

  // Social Links state (matching Create Profile modal pattern)
  const [socialLinks, setSocialLinks] = useState<SocialItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  const allStoredProfiles = getStoredProfiles();
  const otherProfiles = allStoredProfiles.filter(p => p.id !== (activeProfile?.id || ''));

  useEffect(() => {
    if (activeProfile) {
      setTitle(activeProfile.title);
      setSlug(activeProfile.slug || '');
      setDescription(activeProfile.description || '');
      setCoverImage(activeProfile.cover_image || '');
      setProfileImage(activeProfile.profile_image || '');
      setAccentColor(activeProfile.accent_color || '#e11d48');
      setProfileType(activeProfile.profile_type || 'embed');
      setFeaturedVideoUrl(activeProfile.featured_video_url || activeProfile.youtube_url || '');

      // Load initial social links
      const initialLinks: SocialItem[] = [];
      if (activeProfile.youtube_url) initialLinks.push({ id: 'yt', platform: 'youtube', url: activeProfile.youtube_url });
      if (activeProfile.instagram_url) initialLinks.push({ id: 'ig', platform: 'instagram', url: activeProfile.instagram_url });
      if (activeProfile.facebook_url) initialLinks.push({ id: 'fb', platform: 'facebook', url: activeProfile.facebook_url });
      if (activeProfile.x_url) initialLinks.push({ id: 'x', platform: 'x', url: activeProfile.x_url });
      if (activeProfile.threads_url) initialLinks.push({ id: 'th', platform: 'threads', url: activeProfile.threads_url });
      if (activeProfile.website_url) initialLinks.push({ id: 'web', platform: 'website', url: activeProfile.website_url });

      if (activeProfile.custom_social_links && Array.isArray(activeProfile.custom_social_links)) {
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

      setSocialLinks(initialLinks);
      setError('');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const handleImportSocialsFromProfile = (targetProfileId: string) => {
    if (!targetProfileId) return;
    const sourceProfile = allStoredProfiles.find(p => p.id === targetProfileId);
    if (!sourceProfile) return;

    const imported: SocialItem[] = [];
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

    setSocialLinks(imported);
  };

  const handleAddSocial = () => {
    const available = PLATFORM_OPTIONS.filter(p => p.value !== 'custom' && !socialLinks.some(s => s.platform === p.value));
    const nextPlat = available.length > 0 ? available[0].value : 'custom';
    setSocialLinks([...socialLinks, { id: `soc-${Date.now()}`, platform: nextPlat, customName: '', url: '' }]);
  };

  const handleRemoveSocial = (id: string) => {
    setSocialLinks(socialLinks.filter(s => s.id !== id));
  };

  const handleUpdateSocial = (id: string, field: 'platform' | 'customName' | 'url', val: string) => {
    setSocialLinks(socialLinks.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const newSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!newSlug) {
      setError('URL slug cannot be empty.');
      return;
    }

    const allProfiles = getStoredProfiles();
    const duplicate = allProfiles.find(p => p.id !== activeProfile.id && p.slug.toLowerCase() === newSlug);
    if (duplicate) {
      setError(`A profile with URL slug "/profile/${newSlug}" already exists. Please enter a unique slug.`);
      return;
    }

    const getUrl = (plat: string) => {
      const found = socialLinks.find(s => s.platform === plat);
      return found && found.url.trim() ? found.url.trim() : null;
    };

    const customLinks = socialLinks
      .filter(s => s.platform === 'custom' || !['youtube', 'instagram', 'facebook', 'x', 'threads', 'website'].includes(s.platform))
      .filter(s => s.url.trim())
      .map(s => ({
        platform: s.customName?.trim() || (PLATFORM_OPTIONS.find(p => p.value === s.platform)?.label || 'Social'),
        url: s.url.trim(),
      }));

    const updatedProfile = {
      ...activeProfile,
      title: title.trim(),
      slug: newSlug,
      description: description.trim() || null,
      cover_image: coverImage.trim() || null,
      profile_image: profileImage.trim() || null,
      accent_color: accentColor,
      profile_type: profileType,
      featured_video_url: featuredVideoUrl.trim() || null,
      youtube_url: getUrl('youtube'),
      facebook_url: getUrl('facebook'),
      instagram_url: getUrl('instagram'),
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

  const previewYtId = extractYouTubeId(featuredVideoUrl);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-rose-600" />
          <span>Appearance</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Customize independent branding & official social links for: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-5 shadow-xs">
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Appearance settings updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Profile Workspace Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProfileType('embed')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                profileType === 'embed'
                  ? 'bg-rose-50/80 border-rose-600 text-rose-950 ring-2 ring-rose-600/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-extrabold flex items-center gap-1.5 text-rose-700">
                  <Video className="w-4 h-4 text-rose-600" />
                  Media & Stream Embeds
                </span>
                {profileType === 'embed' && <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-xs" />}
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">YouTube MV embeds & music streaming articles.</p>
            </button>

            <button
              type="button"
              onClick={() => setProfileType('engagement')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                profileType === 'engagement'
                  ? 'bg-purple-50/80 border-purple-600 text-purple-950 ring-2 ring-purple-600/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-extrabold flex items-center gap-1.5 text-purple-700">
                  <Save className="w-4 h-4 text-purple-600" />
                  Social Engagement Links
                </span>
                {profileType === 'engagement' && <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" />}
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Spotify 🎧, YT & YT Music 🔴, TikTok 🎵, FB 📘, X 🐦, IG 📸 boost links compiled by platform.</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Release Profile Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">URL Slug *</label>
            <div className="flex items-center">
              <span className="px-2.5 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-xs font-bold shrink-0">
                /profile/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setError('');
                }}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-r-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-bold"
                placeholder="lawless"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Profile Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 resize-none font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadInput
            label="Cover Image"
            value={coverImage}
            onChange={setCoverImage}
            folder="SB19/covers"
            placeholder="https://... or upload picture"
          />
          <ImageUploadInput
            label="Avatar Image"
            value={profileImage}
            onChange={setProfileImage}
            folder="SB19/avatars"
            placeholder="https://... or upload picture"
          />
        </div>

        {/* Featured Music Video YouTube Link */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
            <Video className="w-4 h-4 text-rose-600" />
            <span>Featured Music Video YouTube URL</span>
          </label>
          <p className="text-[11px] text-slate-500 font-medium">
            Paste a YouTube video link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...). This video will be embedded as a playable MV player directly above the Streaming Articles section!
          </p>
          <input
            type="url"
            value={featuredVideoUrl}
            onChange={(e) => setFeaturedVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=sb19mv"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
          />

          {/* Live Playable Video Player Preview */}
          {previewYtId && (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Live Playable MV Player Preview</span>
              </span>
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-slate-200 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewYtId}?rel=0`}
                  title="Live MV Player Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Official Social Links (Matching Create Profile pattern) */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-4 h-4" /> Official Social Links
            </h3>
            <button
              type="button"
              onClick={handleAddSocial}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Link</span>
            </button>
          </div>

          {otherProfiles.length > 0 && (
            <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs">
              <span className="text-rose-900 font-bold flex items-center gap-1.5 shrink-0">
                <Copy className="w-3.5 h-3.5 text-rose-600" />
                <span>Autofill Socials from:</span>
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleImportSocialsFromProfile(e.target.value);
                  e.target.value = '';
                }}
                className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-2xs cursor-pointer max-w-[240px]"
              >
                <option value="" disabled>Select Profile to Copy Socials...</option>
                {otherProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    Copy from {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {socialLinks.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-medium">
              No social links added yet. Click &quot;Add Link&quot; above to add official links.
            </p>
          ) : (
            <div className="space-y-2">
              {socialLinks.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={item.platform}
                    onChange={(e) => handleUpdateSocial(item.id, 'platform', e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shrink-0"
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
                      onChange={(e) => handleUpdateSocial(item.id, 'customName', e.target.value)}
                      placeholder="Platform Name (e.g. Weverse)"
                      className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                    />
                  )}

                  <input
                    type="url"
                    required
                    value={item.url}
                    onChange={(e) => handleUpdateSocial(item.id, 'url', e.target.value)}
                    placeholder={item.platform === 'custom' ? 'https://...' : `Enter ${item.platform} URL...`}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveSocial(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                    title="Remove social link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accent Theme Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-12 h-10 rounded-xl bg-white border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-36 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Appearance Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
