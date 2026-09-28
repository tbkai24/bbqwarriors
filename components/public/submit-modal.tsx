'use client';

// Component imports for portal modal, data store, and Turnstile spam protection
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Profile, ExtractedMetadata } from '@/types/database';
import { submitArticleLink, getStoredArticles, getStoredSubmissions } from '@/lib/data-store';
import { normalizeUrl, isDuplicateUrl } from '@/lib/url-normalizer';
import { X, Link2, Sparkles, CheckCircle2, AlertCircle, Loader2, FileText, Share2 } from 'lucide-react';
import { TurnstileWidget } from '@/components/public/turnstile';

// Submit Modal Component Props
interface SubmitModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Social platform preset options
const SOCIAL_PLATFORMS = [
  { value: 'spotify', label: 'Spotify (Playlist / Track)' },
  { value: 'youtube', label: 'YouTube & YT Music (Playlist / Video)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'threads', label: 'Threads' },
  { value: 'other', label: 'Other Social Platform' },
] as const;

// Public link submission modal for community members
export function SubmitModal({ profile, isOpen, onClose, onSuccess }: SubmitModalProps) {
  // Modal state variables
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('spotify');
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isEngagement = profile.profile_type === 'engagement';

  const autoDetectPlatform = (inputUrl: string) => {
    const lower = inputUrl.toLowerCase();
    if (lower.includes('spotify.com') || lower.includes('open.spotify.com')) setSelectedPlatform('spotify');
    else if (lower.includes('youtube.com') || lower.includes('music.youtube.com') || lower.includes('youtu.be')) setSelectedPlatform('youtube');
    else if (lower.includes('tiktok.com')) setSelectedPlatform('tiktok');
    else if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')) setSelectedPlatform('facebook');
    else if (lower.includes('twitter.com') || lower.includes('x.com')) setSelectedPlatform('x');
    else if (lower.includes('instagram.com')) setSelectedPlatform('instagram');
    else if (lower.includes('threads.net')) setSelectedPlatform('threads');
  };

  const checkDuplicate = (inputUrl: string, inputTitle?: string): boolean => {
    if (!inputUrl.trim()) return false;
    const articles = getStoredArticles();
    const submissions = getStoredSubmissions();

    const publishedUrls = articles.flatMap(a => [a.canonical_url, a.article_url].filter(Boolean) as string[]);
    const publishedTitles = articles.map(a => a.title).filter(Boolean) as string[];
    if (isDuplicateUrl(inputUrl, publishedUrls, inputTitle, publishedTitles)) {
      setErrorMsg('This link or article title already exists in the directory!');
      return true;
    }

    const pendingSubs = submissions.filter(s => s.status === 'pending');
    const pendingUrls = pendingSubs.flatMap(s => [s.canonical_url, s.article_url].filter(Boolean) as string[]);
    const pendingTitles = pendingSubs.map(s => s.title).filter(Boolean) as string[];

    if (isDuplicateUrl(inputUrl, pendingUrls, inputTitle, pendingTitles)) {
      setErrorMsg('This link or article title is already submitted and pending admin review!');
      return true;
    }

    return false;
  };

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;
    autoDetectPlatform(url);
    if (checkDuplicate(url)) return;

    setLoadingMetadata(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not fetch URL metadata');
      }
      setMetadata(data);
      if (data.title) {
        setTitle(data.title);
      }
    } catch {
      setErrorMsg('Could not auto-fill metadata preview. You can still enter title manually.');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Direct duplicate check before submitting
    if (checkDuplicate(url, title)) {
      return;
    }

    if (!turnstileToken) {
      setErrorMsg('Please complete the bot security verification check.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Canonical server-side Turnstile siteverify
      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Turnstile verification failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Security verification failed. Please try again.');
      setTurnstileToken(null);
      if (typeof window !== 'undefined' && window.turnstile) {
        setTimeout(() => window.turnstile?.reset(), 0);
      }
      setSubmitting(false);
      return;
    }

    const platformItem = SOCIAL_PLATFORMS.find(p => p.value === selectedPlatform);
    const platformName = platformItem ? platformItem.label : selectedPlatform;

    const mergedMetadata = {
      ...(metadata || {}),
      title: title.trim() || metadata?.title || (isEngagement ? `${platformName} Post` : 'Submitted Link'),
      websiteName: isEngagement ? platformName : (metadata?.websiteName || 'Web Article'),
    };

    const result = await submitArticleLink(profile.id, url, notes, mergedMetadata as Partial<ExtractedMetadata>);

    setSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.message);
      if (typeof window !== 'undefined' && window.turnstile) {
        setTimeout(() => window.turnstile?.reset(), 0);
      }
      setTurnstileToken(null);
    } else {
      setSuccessMsg(result.message);
      setUrl('');
      setTitle('');
      setNotes('');
      setMetadata(null);
      setTurnstileToken(null);
      if (onSuccess) onSuccess();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 pb-4 sm:pb-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-slate-300"
              style={{ backgroundColor: profile.accent_color || '#e11d48' }}
            />
            <h2 className="text-lg font-black text-slate-900 truncate">
              {isEngagement ? (
                <>Suggest Engagement Link for <span style={{ color: profile.accent_color || '#e11d48' }}>{profile.title}</span></>
              ) : (
                <>Suggest Article for <span style={{ color: profile.accent_color || '#e11d48' }}>{profile.title}</span></>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View State */}
        {successMsg ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-center py-8 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Submission Received!</h3>
              <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed max-w-sm mx-auto">
                {successMsg}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Submit Another Link
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Scrollable Form Body */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-rose-600" />
                {isEngagement ? 'Social Engagement Link (URL)' : 'Article Link (URL)'} <span className="text-rose-600">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUrl(val);
                    autoDetectPlatform(val);
                    setErrorMsg(null);
                    checkDuplicate(val);
                  }}
                  onBlur={handleFetchMetadata}
                  placeholder={isEngagement ? 'https://www.tiktok.com/@officialsb19/video/... or https://facebook.com/...' : 'https://example.com/sb19-article-link'}
                  className="w-full pl-4 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-bold transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  disabled={loadingMetadata || !url.trim()}
                  className="absolute right-2 px-3 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loadingMetadata ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>Auto-Fill</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {isEngagement
                  ? 'Paste a TikTok, Facebook, X/Twitter, or Instagram post link to add to the engagement hub.'
                  : 'Paste a news, interview, or review link about SB19 for admin verification.'}
              </p>
            </div>

            {/* Social Platform Type Selection for Social Media Profiles */}
            {isEngagement && (
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-purple-600" /> Social Media Type <span className="text-purple-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SOCIAL_PLATFORMS.map((plat) => (
                    <button
                      key={plat.value}
                      type="button"
                      onClick={() => setSelectedPlatform(plat.value)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center justify-center ${selectedPlatform === plat.value
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      <span className="truncate">{plat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                {isEngagement ? 'Campaign Title / Post Caption' : 'Article Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isEngagement ? 'e.g. SB19 LAWLESS TikTok Dance Challenge' : 'Auto-suggested from link or type title...'}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-bold transition-all shadow-xs"
              />
            </div>

            {/* Auto Metadata Preview */}
            {metadata && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left shadow-2xs">
                <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>Auto-Extracted Preview</span>
                </div>
                <div className="flex items-start gap-3">
                  {metadata.thumbnail && (
                    <img
                      src={metadata.thumbnail}
                      alt="Preview"
                      className="w-16 h-12 object-cover rounded-xl bg-slate-200 shrink-0 border border-slate-200"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {metadata.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold line-clamp-1">
                      {metadata.websiteName} • {metadata.description || 'No description available'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                Optional Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Official campaign article with high-quality MV embed"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-semibold transition-all shadow-xs resize-none"
              />
            </div>

            {/* Cloudflare Turnstile Bot Verification */}
            <TurnstileWidget
              siteKey="0x4AAAAAADvfvehdsxMR16Ud"
              onVerify={(token: string) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: profile.accent_color || '#e11d48' }}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit for Admin Review</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
