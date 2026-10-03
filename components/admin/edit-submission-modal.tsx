'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArticleSubmission } from '@/types/database';
import { getStoredSubmissions, saveSubmissions, updateSubmissionInSupabase } from '@/lib/data-store';
import { ImageUploadInput } from './image-upload-input';
import { X, Edit2, Save, FileText, Link2, Sparkles, Loader2 } from 'lucide-react';

interface EditSubmissionModalProps {
  submission: ArticleSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSubmissionModal({ submission, isOpen, onClose, onSaved }: EditSubmissionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (submission) {
      setTitle(submission.title || '');
      setUrl(submission.article_url || '');
      setWebsiteName(submission.website_name || '');
      setThumbnail(submission.thumbnail || '');
      setDescription(submission.description || '');
      setNotes(submission.notes || '');
    }
  }, [submission]);

  if (!isOpen || !submission || !mounted) return null;

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;
    setFetchingMeta(true);
    try {
      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.websiteName) setWebsiteName(data.websiteName);
      if (data.thumbnail) setThumbnail(data.thumbnail);
      if (data.description) setDescription(data.description);
    } catch {
      // Ignore
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setSaving(true);
    const allSubs = getStoredSubmissions();
    const updatedSub: ArticleSubmission = {
      ...submission,
      title: title.trim(),
      article_url: url.trim(),
      canonical_url: url.trim().replace(/^https?:\/\/(www\.)?/, 'https://'),
      website_name: websiteName.trim() || new URL(url.trim()).hostname.replace('www.', ''),
      thumbnail: thumbnail.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const updated = allSubs.map(s => s.id === submission.id ? updatedSub : s);
    saveSubmissions(updated);
    await updateSubmissionInSupabase(updatedSub);

    setSaving(false);
    onSaved();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl max-h-[calc(100vh-130px)] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 sm:p-7 pb-4 sm:pb-5 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Edit Fan Submission</h2>
              <p className="text-xs text-slate-500 font-semibold">Refine details before approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-submission-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-rose-600" /> Article Link (URL) *
            </label>
            <div className="relative flex items-center">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleFetchMetadata}
                className="w-full pl-4 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
              />
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={fetchingMeta || !url.trim()}
                className="absolute right-2 px-3 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {fetchingMeta ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>Auto-Fill</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
              Article Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
              Website Name (Outlet)
            </label>
            <input
              type="text"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              placeholder="Enter publisher / platform source..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
            />
          </div>

          <div>
            <ImageUploadInput
              label="Thumbnail Cover Image"
              value={thumbnail}
              onChange={setThumbnail}
              placeholder="Upload thumbnail or paste image URL..."
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
              Optional Admin Notes / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs resize-none"
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="p-4 px-6 border-t border-slate-200 shrink-0 bg-slate-50/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-submission-form"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
