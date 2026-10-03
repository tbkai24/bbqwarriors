'use client';

// Component dependencies and utility imports
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '@/types/database';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase, generateUUID } from '@/lib/data-store';
import { extractYouTubeId } from '@/lib/url-normalizer';
import { ImageUploadInput } from './image-upload-input';
import { X, Sparkles, Plus, Trash2, Share2, AlertCircle, Loader2, Video, PlayCircle, Copy } from 'lucide-react';

// Modal props definition
interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newProfile: Profile) => void;
}

// Social platform item structure
interface SocialItem {
  id: string;
  platform: string;
  customName?: string;
  url: string;
}

// Social platform preset options
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

// Admin modal for creating a new profile (Embed Hub or Engagement Hub)
export function CreateProfileModal({ isOpen, onClose, onCreated }: CreateProfileModalProps) {
  // Modal form state variables
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [accentColor, setAccentColor] = useState('#e11d48');
  const [profileType, setProfileType] = useState<'embed' | 'engagement'>('embed');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const existingProfiles = getStoredProfiles();

  const handleImportSocialsFromProfile = (targetProfileId: string) => {
    if (!targetProfileId) return;
    const sourceProfile = existingProfiles.find(p => p.id === targetProfileId);
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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setError('');
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required.');
      return;
    }

    setSubmitting(true);
    setError('');

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

    const newProfile: Profile = {
      id: generateUUID(),
      bbq_warrior_id: `bbq-warrior-${slug.trim().toLowerCase()}-${Date.now()}`,
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      cover_image: coverImage.trim() || null,
      profile_image: profileImage.trim() || null,
      accent_color: accentColor,
      profile_type: profileType,
      featured_video_url: featuredVideoUrl.trim() || null,
      theme: 'dark',
      website_url: getUrl('website'),
      youtube_url: getUrl('youtube'),
      facebook_url: getUrl('facebook'),
      instagram_url: getUrl('instagram'),
      x_url: getUrl('x'),
      threads_url: getUrl('threads'),
      custom_social_links: customLinks.length > 0 ? customLinks : null,
      seo_title: `${title} - BBQ Warriors`,
      seo_description: description.trim() || null,
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    const existing = getStoredProfiles();

    // Check duplicate slug in local profiles
    if (existing.some(p => p.slug.toLowerCase() === newProfile.slug)) {
      setError(`A profile with the URL slug "${newProfile.slug}" already exists. Please choose a different title or slug.`);
      setSubmitting(false);
      return;
    }

    const updated = [newProfile, ...existing];
    saveProfiles(updated);

    // Persist to Supabase Database
    const res = await saveProfileToSupabase(newProfile);
    setSubmitting(false);

    if (res && res.error) {
      setError(res.error);
      return;
    }

    onCreated(newProfile);
    onClose();
  };

  const previewYtId = extractYouTubeId(featuredVideoUrl);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <Sparkles className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Create New Release Profile</h2>
              <p className="text-xs text-slate-500 font-semibold">Add a new song or album workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
              Profile Workspace Type <span className="text-rose-600">*</span>
            </label>
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
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">YouTube MV embeds, music streaming links & news articles.</p>
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
                    <Share2 className="w-4 h-4 text-purple-600" />
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
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Release Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter title..."
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-bold transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                URL Slug <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Enter URL slug..."
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-bold transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the song/album release..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-semibold transition-all shadow-xs resize-none"
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Video className="w-4 h-4 text-rose-600" />
              <span>Featured Release Music Video (YouTube URL)</span>
            </label>
            <p className="text-[11px] text-slate-500 font-medium">
              Paste YouTube link for playable MV player directly above Streaming Articles!
            </p>
            <input
              type="url"
              value={featuredVideoUrl}
              onChange={(e) => setFeaturedVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=sb19mv"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs"
            />

            {previewYtId && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Live Playable MV Preview</span>
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

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-300 cursor-pointer shrink-0 p-1"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-36 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-extrabold text-xs focus:outline-none focus:border-rose-600 transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Official Social Links
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

            {existingProfiles.length > 0 && (
              <div className="mb-3 p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                <span className="text-rose-900 font-bold flex items-center gap-1.5 shrink-0">
                  <Copy className="w-3.5 h-3.5 text-rose-600" />
                  <span>Autofill from:</span>
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
                  {existingProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      Copy from {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {socialLinks.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-medium">
                No social links added yet. Click &quot;Add Link&quot; above to add official links (Optional).
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
                        placeholder="Enter platform name..."
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Profile Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
