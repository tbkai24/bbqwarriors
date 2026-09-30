'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { extractYouTubeId } from '@/lib/url-normalizer';
import { Palette, Check, Save, Video, PlayCircle, Heart, QrCode } from 'lucide-react';

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
  const [supportQrImage, setSupportQrImage] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [supportNote, setSupportNote] = useState('');
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
      setSupportQrImage(activeProfile.support_qr_image || '');
      setSupportTitle(activeProfile.support_title || '');
      setSupportNote(activeProfile.support_note || '');
      setError('');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

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
      support_qr_image: supportQrImage.trim() || null,
      support_title: supportTitle.trim() || null,
      support_note: supportNote.trim() || null,
      youtube_url: activeProfile.youtube_url || null,
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
          <span>Appearance & Branding</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Customize independent branding for active workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-5 shadow-xs">
        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Appearance settings updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
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

        {/* Support / Donation QR Code Section */}
        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-3">
          <label className="block text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-600 fill-rose-500" />
            <span>Support / Donation QR Code (GCash, Maya, Ko-fi, PayPal)</span>
          </label>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Upload your GCash/Maya QR code picture or paste an image link. A &quot;💖 Support Streamers&quot; button will appear on your public profile page for fans to donate!
          </p>

          <ImageUploadInput
            label="Support QR Code Image"
            value={supportQrImage}
            onChange={setSupportQrImage}
            folder="SB19/qr_codes"
            placeholder="https://... or upload QR picture"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Support Title</label>
              <input
                type="text"
                value={supportTitle}
                onChange={(e) => setSupportTitle(e.target.value)}
                placeholder="Support SB19 Streamers Hub"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Support Note / Instructions</label>
              <input
                type="text"
                value={supportNote}
                onChange={(e) => setSupportNote(e.target.value)}
                placeholder="Scan QR to donate via GCash / Maya to help fund streaming costs!"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
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
