'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { extractYouTubeId } from '@/lib/url-normalizer';
import { Palette, Check, Save, Video, PlayCircle, Share2, Plus, Trash2, Globe, MessageSquare } from 'lucide-react';

interface CustomSocialLink {
  id: string;
  platform: string;
  url: string;
}

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

  // Official Social Media Links
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [threadsUrl, setThreadsUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [customSocials, setCustomSocials] = useState<CustomSocialLink[]>([]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

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

      setYoutubeUrl(activeProfile.youtube_url || '');
      setFacebookUrl(activeProfile.facebook_url || '');
      setInstagramUrl(activeProfile.instagram_url || '');
      setXUrl(activeProfile.x_url || '');
      setThreadsUrl(activeProfile.threads_url || '');
      setWebsiteUrl(activeProfile.website_url || '');

      if (activeProfile.custom_social_links && Array.isArray(activeProfile.custom_social_links)) {
        setCustomSocials(
          activeProfile.custom_social_links.map((item, idx) => ({
            id: `custom-${idx}-${Date.now()}`,
            platform: item.platform || 'Social',
            url: item.url || '',
          }))
        );
      } else {
        setCustomSocials([]);
      }

      setError('');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const handleAddCustomSocial = () => {
    setCustomSocials([
      ...customSocials,
      { id: `custom-${Date.now()}`, platform: 'Spotify', url: '' },
    ]);
  };

  const handleRemoveCustomSocial = (id: string) => {
    setCustomSocials(customSocials.filter(s => s.id !== id));
  };

  const handleUpdateCustomSocial = (id: string, field: 'platform' | 'url', val: string) => {
    setCustomSocials(
      customSocials.map(s => (s.id === id ? { ...s, [field]: val } : s))
    );
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

    const cleanCustomSocials = customSocials
      .filter(s => s.platform.trim() && s.url.trim())
      .map(s => ({ platform: s.platform.trim(), url: s.url.trim() }));

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
      youtube_url: youtubeUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      x_url: xUrl.trim() || null,
      threads_url: threadsUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      custom_social_links: cleanCustomSocials.length > 0 ? cleanCustomSocials : null,
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
          <span>Appearance & Social Links</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Customize branding & official social links for workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-5 shadow-xs">
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Appearance & Social Links updated successfully!</span>
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

        {/* Official Social Media Links Section */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-rose-600" />
              <span>Official Social Media Links</span>
            </label>
            <button
              type="button"
              onClick={handleAddCustomSocial}
              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Link</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">YouTube Channel URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/@JoshCullenOfficial"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Facebook Page URL</label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Instagram Profile URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">X (Twitter) Profile URL</label>
              <input
                type="url"
                value={xUrl}
                onChange={(e) => setXUrl(e.target.value)}
                placeholder="https://x.com/..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Threads Profile URL</label>
              <input
                type="url"
                value={threadsUrl}
                onChange={(e) => setThreadsUrl(e.target.value)}
                placeholder="https://threads.net/@..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Official Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Custom Social Links List */}
          {customSocials.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-700 uppercase">Additional Custom Social Links</span>
              {customSocials.map((custom) => (
                <div key={custom.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={custom.platform}
                    onChange={(e) => handleUpdateCustomSocial(custom.id, 'platform', e.target.value)}
                    placeholder="Platform (e.g. Spotify, TikTok)"
                    className="w-1/3 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="url"
                    value={custom.url}
                    onChange={(e) => handleUpdateCustomSocial(custom.id, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomSocial(custom.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            <span>Save Appearance & Social Links</span>
          </button>
        </div>
      </form>
    </div>
  );
}
