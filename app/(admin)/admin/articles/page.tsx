'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdminWorkspace } from '../layout';
import { Article, ExtractedMetadata } from '@/types/database';
import { getStoredArticles, saveArticles, saveArticleToSupabase, updateArticleStatusInSupabase, updateArticlesOrderInSupabase, deleteArticleFromSupabase, generateUUID, isArticleForProfile } from '@/lib/data-store';
import { normalizeUrl, decodeHtmlEntities, isEligibleForArticleOfTheDay, translateTextToEnglish, extractFrontNumber, compareByFrontNumber } from '@/lib/url-normalizer';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { DeleteConfirmModal } from '@/components/admin/delete-confirm-modal';
import { Plus, Trash2, Edit2, ExternalLink, Sparkles, Loader2, Link2, MoveUp, MoveDown, X, CheckCircle2, Archive, RotateCcw, AlertTriangle, ArrowUpDown, MessageSquare, Filter, Globe, GripVertical } from 'lucide-react';

function getDailyArticlePick(articles: Article[]): { article: Article; quote: string } | null {
  if (!articles || articles.length === 0) return null;

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

function TranslatedText({ text, className = '' }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState<string>(decodeHtmlEntities(text));

  useEffect(() => {
    if (!text) return;
    const clean = decodeHtmlEntities(text);
    setDisplayText(clean);

    let isCancelled = false;
    translateTextToEnglish(clean).then(translated => {
      if (!isCancelled && translated) setDisplayText(translated);
    });

    return () => { isCancelled = true; };
  }, [text]);

  return <span className={className}>{displayText}</span>;
}

function AdminArticleCardQuote({ quote }: { quote: string }) {
  return (
    <div className="mt-1.5 text-[11px] italic font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 rounded-lg p-1.5 px-2.5 flex items-center gap-1.5">
      <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
      <span className="truncate">&quot;<TranslatedText text={quote} />&quot;</span>
    </div>
  );
}

function AdminArticleOfTheDayBanner({ articles, onEdit }: { articles: Article[]; onEdit: (art: Article) => void }) {
  const dailyPick = getDailyArticlePick(articles);

  if (!dailyPick) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-300/40 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <Sparkles className="w-3 h-3 text-white" />
          <span>Today&apos;s Article of the Day (Public Showcase)</span>
        </span>
        <button
          type="button"
          onClick={() => onEdit(dailyPick.article)}
          className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
        >
          <Edit2 className="w-3 h-3" />
          <span>Edit Featured Quote</span>
        </button>
      </div>

      <div className="flex items-start gap-3 mt-2">
        {dailyPick.article.thumbnail && (
          <img
            src={dailyPick.article.thumbnail}
            alt={dailyPick.article.title}
            className="w-12 h-12 rounded-xl object-cover border border-amber-200 shadow-2xs shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-slate-900 truncate">
            <TranslatedText text={dailyPick.article.title} />
          </h4>
          <p className="text-xs italic font-serif font-medium text-amber-900 mt-0.5 line-clamp-2">
            &quot;<TranslatedText text={dailyPick.quote} />&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ArticlesAdminPage() {
  const { activeProfile, articles, refreshData } = useAdminWorkspace();

  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active');
  const [filterCategory, setFilterCategory] = useState<'all' | 'spotlight' | 'quotes' | 'outlets' | 'external'>('all');
  const [sortBy, setSortBy] = useState<'order' | 'num-asc' | 'num-desc' | 'name-asc' | 'name-desc' | 'clicks-desc' | 'clicks-asc' | 'newest' | 'oldest'>('order');
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Article | null>(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState<Article | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [highlightQuote, setHighlightQuote] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'rose' } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!activeProfile) return null;

  const showToast = (message: string, type: 'success' | 'info' | 'rose' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const profileArticles = articles
    .filter(a => isArticleForProfile(a, activeProfile))
    .sort((a, b) => a.display_order - b.display_order);

  const activeArticles = profileArticles.filter(a => !a.status || a.status === 'published');
  const archivedArticles = profileArticles.filter(a => a.status === 'archived');
  const currentTabArticles = viewTab === 'active' ? activeArticles : archivedArticles;

  const getSortedArticlesList = (baseList: Article[], overrideSortBy?: typeof sortBy) => {
    const activeSort = overrideSortBy || sortBy;
    const dailyPick = getDailyArticlePick(activeArticles);
    const filtered = baseList.filter(art => {
      const isEligible = isEligibleForArticleOfTheDay(art);

      if (filterCategory === 'spotlight') return dailyPick?.article.id === art.id;
      if (filterCategory === 'quotes') return Boolean(art.highlight_quote);
      if (filterCategory === 'outlets') return isEligible;
      if (filterCategory === 'external') return !isEligible;
      return true;
    });

    switch (activeSort) {
      case 'num-asc':
        return filtered.sort((a, b) => compareByFrontNumber(a.title, b.title, 'asc'));
      case 'num-desc':
        return filtered.sort((a, b) => compareByFrontNumber(a.title, b.title, 'desc'));
      case 'name-asc':
        return filtered.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
      case 'name-desc':
        return filtered.sort((a, b) => b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' }));
      case 'clicks-desc':
        return filtered.sort((a, b) => (b.clicks_count || 0) - (a.clicks_count || 0));
      case 'clicks-asc':
        return filtered.sort((a, b) => (a.clicks_count || 0) - (b.clicks_count || 0));
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'order':
      default:
        return filtered.sort((a, b) => a.display_order - b.display_order);
    }
  };

  const sortedTabArticles = getSortedArticlesList(currentTabArticles);

  const handleSortChange = async (newSort: typeof sortBy) => {
    setSortBy(newSort);

    if (newSort !== 'order') {
      const sortedList = getSortedArticlesList(currentTabArticles, newSort);
      if (sortedList.length > 0) {
        const updates = sortedList.map((art, idx) => ({
          id: art.id,
          display_order: idx + 1,
        }));

        const allArticles = getStoredArticles();
        const orderMap = new Map(updates.map(u => [u.id, u.display_order]));
        const updatedLocal = allArticles.map(a => {
          const newOrder = orderMap.get(a.id);
          return newOrder !== undefined ? { ...a, display_order: newOrder, updated_at: new Date().toISOString() } : a;
        });
        saveArticles(updatedLocal);

        await updateArticlesOrderInSupabase(updates);
        refreshData();
      }
    }
  };

  const handleFetchMetadata = async (isManualClick = false) => {
    if (!url.trim()) return;
    setFetchingMeta(true);
    try {
      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ExtractedMetadata = await res.json();
      if (data.title) {
        const frontMatch = title.match(/^(?:[#\[\(])?\s*\d+(?:\s*[\.\-\)]\s*|\s+)/);
        const frontPrefix = frontMatch ? frontMatch[0] : '';

        if (editingArticle && title.trim() && !isManualClick) {
          // Keep existing manually edited title intact on blur
        } else if (frontPrefix) {
          setTitle(`${frontPrefix}${data.title}`);
        } else {
          setTitle(data.title);
        }
      }
      if (data.websiteName && (!websiteName || isManualClick)) setWebsiteName(data.websiteName);
      if (data.thumbnail && (!thumbnail || isManualClick)) setThumbnail(data.thumbnail);
      if (data.description && (!description || isManualClick)) setDescription(data.description);
    } catch {
      // Ignore
    } finally {
      setFetchingMeta(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setWebsiteName('');
    setThumbnail('');
    setDescription('');
    setHighlightQuote('');
    setEditingArticle(null);
    setIsAddOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setSubmitting(true);
    const normalized = normalizeUrl(url);
    const allArticles = getStoredArticles();

    if (editingArticle) {
      const updatedArticle: Article = {
        ...editingArticle,
        article_url: url.trim(),
        canonical_url: normalized,
        title: title.trim(),
        website_name: websiteName.trim() || new URL(normalized).hostname.replace('www.', ''),
        thumbnail: thumbnail.trim() || null,
        description: description.trim() || null,
        highlight_quote: highlightQuote.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const res = await saveArticleToSupabase(updatedArticle);
      if (res.success) {
        showToast('Article updated successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to update article.', 'rose');
      }
    } else {
      // Check for URL duplication within active profile
      const duplicate = allArticles.find(
        a => (a.profile_id === activeProfile.id || (a as any).bbq_profile_id === activeProfile.id) &&
             (a.canonical_url === normalized || a.article_url === url.trim())
      );

      if (duplicate) {
        setSubmitting(false);
        showToast('Duplicate URL! This article has already been added to this profile.', 'rose');
        return;
      }

      const newArt: Article = {
        id: generateUUID(),
        profile_id: activeProfile.id,
        article_url: url.trim(),
        canonical_url: normalized,
        website_name: websiteName.trim() || new URL(normalized).hostname.replace('www.', ''),
        title: title.trim(),
        thumbnail: thumbnail.trim() || null,
        description: description.trim() || null,
        highlight_quote: highlightQuote.trim() || null,
        display_order: activeArticles.length + 1,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const res = await saveArticleToSupabase(newArt);
      if (res.success) {
        showToast('Article published and saved to workspace!', 'success');
      } else {
        showToast(res.error || 'Failed to save article.', 'rose');
      }
    }

    setSubmitting(false);
    refreshData();
    resetForm();
  };

  // 1. Soft Delete (Move to Recycle Bin)
  const handleConfirmSoftDelete = async () => {
    if (!softDeleteTarget) return;
    const allArticles = getStoredArticles();
    const updatedArticle: Article = {
      ...softDeleteTarget,
      status: 'archived',
      updated_at: new Date().toISOString(),
    };
    const updated = allArticles.map(a => a.id === softDeleteTarget.id ? updatedArticle : a);
    saveArticles(updated);
    await updateArticleStatusInSupabase(softDeleteTarget.id, 'archived');
    refreshData();
    showToast(`"${softDeleteTarget.title}" moved to Recycle Bin.`, 'info');
    setSoftDeleteTarget(null);
  };

  // 2. Restore from Recycle Bin
  const handleRestore = async (art: Article) => {
    const allArticles = getStoredArticles();
    const updatedArticle: Article = {
      ...art,
      status: 'published',
      updated_at: new Date().toISOString(),
    };
    const updated = allArticles.map(a => a.id === art.id ? updatedArticle : a);
    saveArticles(updated);
    await updateArticleStatusInSupabase(art.id, 'published');
    refreshData();
    showToast(`"${art.title}" restored to Active Articles!`, 'success');
  };

  // 3. Delete Permanently
  const handleConfirmPermDelete = async () => {
    if (!permDeleteTarget) return;
    const allArticles = getStoredArticles();
    const filtered = allArticles.filter(a => a.id !== permDeleteTarget.id);
    saveArticles(filtered);
    await deleteArticleFromSupabase(permDeleteTarget.id);
    refreshData();
    showToast(`"${permDeleteTarget.title}" permanently deleted.`, 'rose');
    setPermDeleteTarget(null);
  };

  const handleMoveOrder = async (artId: string, direction: 'up' | 'down') => {
    const currentList = [...activeArticles];
    const index = currentList.findIndex(a => a.id === artId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    // Swap elements in array
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    // Re-assign explicit order 1, 2, 3...
    const updates = currentList.map((art, idx) => ({
      id: art.id,
      display_order: idx + 1,
    }));

    // Update local storage immediately for zero-lag UI reaction
    const allArticles = getStoredArticles();
    const updatedLocal = allArticles.map(a => {
      const match = updates.find(u => u.id === a.id);
      return match ? { ...a, display_order: match.display_order } : a;
    });
    saveArticles(updatedLocal);

    // Sync order to Supabase DB asynchronously
    await updateArticlesOrderInSupabase(updates);
    refreshData();
  };



  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentList = [...activeArticles];
    const [draggedItem] = currentList.splice(draggedIndex, 1);
    currentList.splice(targetIndex, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    const updates = currentList.map((art, idx) => ({
      id: art.id,
      display_order: idx + 1,
    }));

    const allArticles = getStoredArticles();
    const updatedLocal = allArticles.map(a => {
      const match = updates.find(u => u.id === a.id);
      return match ? { ...a, display_order: match.display_order } : a;
    });
    saveArticles(updatedLocal);

    await updateArticlesOrderInSupabase(updates);
    refreshData();
    showToast('Articles re-ordered via Drag & Drop!', 'success');
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openEdit = (art: Article) => {
    setEditingArticle(art);
    setUrl(art.article_url);
    setTitle(art.title);
    setWebsiteName(art.website_name);
    setThumbnail(art.thumbnail || '');
    setDescription(art.description || '');
    setHighlightQuote(art.highlight_quote || '');
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl w-full">
      {/* Toast Feedback Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg animate-fade-in ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            toast.type === 'rose' ? 'bg-rose-50 border-rose-300 text-rose-900' :
              'bg-slate-900 text-white border-slate-800'
          }`}>
          <div className="flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Articles Directory</h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Manage streaming articles for profile: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Tab Switcher: Active vs Recycle Bin */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewTab('active')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewTab === 'active' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Active ({activeArticles.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('archived')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${viewTab === 'archived' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-rose-600'
                }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Bin ({archivedArticles.length})</span>
            </button>
          </div>

          {viewTab === 'active' && activeArticles.length > 1 && (
            <div
              className={`relative flex items-center px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs gap-1.5 ${
                sortBy !== 'order'
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
              }`}
              title="Sort Articles"
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[140px] hidden sm:inline">
                {sortBy === 'order' && 'Default Order'}
                {sortBy === 'num-asc' && 'Number (Ascending)'}
                {sortBy === 'num-desc' && 'Number (Descending)'}
                {sortBy === 'name-asc' && 'Name (A to Z)'}
                {sortBy === 'name-desc' && 'Name (Z to A)'}
                {sortBy === 'clicks-desc' && 'Clicks (Highest)'}
                {sortBy === 'clicks-asc' && 'Clicks (Lowest)'}
                {sortBy === 'newest' && 'Newest'}
                {sortBy === 'oldest' && 'Oldest'}
              </span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                title="Sort Articles"
              >
                <option value="order">Default (Custom Drag & Drop)</option>
                <option value="num-asc">Number at Front (Ascending)</option>
                <option value="num-desc">Number at Front (Descending)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
                <option value="clicks-desc">Clicks (Highest)</option>
                <option value="clicks-asc">Clicks (Lowest)</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Article</span>
          </button>
        </div>
      </div>
      {/* Article of the Day Spotlight Banner for Admin */}
      {viewTab === 'active' && activeArticles.length > 0 && (() => {
        const dailyPick = getDailyArticlePick(activeArticles);
        if (!dailyPick) return null;
        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-300/40 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-white" />
                <span>Today&apos;s Article of the Day (Public Showcase)</span>
              </span>
              <button
                type="button"
                onClick={() => openEdit(dailyPick.article)}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Featured Quote</span>
              </button>
            </div>

            <div className="flex items-start gap-3 mt-2">
              {dailyPick.article.thumbnail && (
                <img
                  src={dailyPick.article.thumbnail}
                  alt={dailyPick.article.title}
                  className="w-12 h-12 rounded-xl object-cover border border-amber-200 shadow-2xs shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-slate-900 truncate">{decodeHtmlEntities(dailyPick.article.title)}</h4>
                <p className="text-xs italic font-serif font-medium text-amber-900 mt-0.5 line-clamp-2">
                  &quot;{dailyPick.quote}&quot;
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter Category Pills Bar */}
      {viewTab === 'active' && activeArticles.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${filterCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            All ({activeArticles.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('spotlight')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'spotlight' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Article of the Day</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('quotes')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${filterCategory === 'quotes' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>With Quotes</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('outlets')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${filterCategory === 'outlets' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            News Outlets
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('external')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${filterCategory === 'external' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            Search & Forum Links
          </button>
        </div>
      )}

      <div className="rounded-2xl glass-panel border border-slate-200 bg-white overflow-hidden shadow-xs">
        {sortedTabArticles.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            {viewTab === 'active'
              ? `No active articles in ${activeProfile.title} workspace yet. Click "Add New Article" above.`
              : `Recycle Bin is empty. No archived articles for ${activeProfile.title}.`}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sortedTabArticles.map((art, idx) => (
              <div
                key={art.id}
                draggable={viewTab === 'active' && sortBy === 'order'}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-4 flex items-center justify-between gap-4 transition-all duration-150 ${
                  draggedIndex === idx ? 'opacity-30 bg-rose-50/50 scale-[0.98] border-2 border-dashed border-rose-300' :
                  dragOverIndex === idx ? 'bg-rose-50 border-t-2 border-rose-600 scale-[1.01] shadow-xs' :
                  'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {viewTab === 'active' && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-grab active:cursor-grabbing rounded-lg hover:bg-slate-200/60 transition-colors"
                        title="Click & Drag to re-order article position"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(art.id, 'up')}
                          className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                          title="Move up 1 step"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === activeArticles.length - 1}
                          onClick={() => handleMoveOrder(art.id, 'down')}
                          className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                          title="Move down 1 step"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {art.thumbnail ? (
                    <img src={art.thumbnail} alt={decodeHtmlEntities(art.title)} className="w-16 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200" />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                      No Image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {decodeHtmlEntities(art.website_name)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(art.clicks_count || 0).toLocaleString()} clicks
                      </span>
                      {viewTab === 'active' && (
                        <span className="text-[10px] text-slate-500 font-medium">Order #{art.display_order}</span>
                      )}
                      {viewTab === 'archived' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          <span>In Recycle Bin</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate mt-1">
                      <TranslatedText text={art.title} />
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{art.article_url}</div>
                    {art.highlight_quote && (
                      <AdminArticleCardQuote quote={art.highlight_quote} />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={art.article_url}
                    target="_blank"
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200 border border-slate-200"
                    title="Preview external article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {viewTab === 'active' ? (
                    <>
                      <button
                        onClick={() => openEdit(art)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                        title="Edit article"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSoftDeleteTarget(art)}
                        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(art)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Restore article to active list"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setPermDeleteTarget(art)}
                        className="p-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 cursor-pointer"
                        title="Permanently Delete Article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. Soft Delete Confirmation Modal (Move to Bin) */}
      <DeleteConfirmModal
        isOpen={Boolean(softDeleteTarget)}
        title="Move Article to Recycle Bin?"
        itemName={softDeleteTarget ? decodeHtmlEntities(softDeleteTarget.title) : undefined}
        isPermanent={false}
        onClose={() => setSoftDeleteTarget(null)}
        onConfirm={handleConfirmSoftDelete}
      />

      {/* 2. Permanent Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(permDeleteTarget)}
        title="Permanently Delete Article?"
        itemName={permDeleteTarget ? decodeHtmlEntities(permDeleteTarget.title) : undefined}
        isPermanent={true}
        onClose={() => setPermDeleteTarget(null)}
        onConfirm={handleConfirmPermDelete}
      />

      {isAddOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[calc(100vh-130px)] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                  <Sparkles className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingArticle ? 'Edit Article' : `Add Article to ${activeProfile.title}`}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">Publish or update streaming article link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="article-admin-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-rose-600" />
                  {activeProfile.profile_type === 'engagement' ? 'Social Engagement Link (URL) *' : 'Article Link (URL) *'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={() => handleFetchMetadata(false)}
                    placeholder={activeProfile.profile_type === 'engagement' ? 'https://www.tiktok.com/... or https://facebook.com/...' : 'https://...'}
                    className="w-full pl-4 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchMetadata(true)}
                    disabled={fetchingMeta || !url.trim()}
                    className="absolute right-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold flex items-center gap-1 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {fetchingMeta ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-rose-600" />}
                    <span>Auto Fill</span>
                  </button>
                </div>
                {url.trim() && !editingArticle && profileArticles.some(a => a.canonical_url === normalizeUrl(url) || a.article_url.trim() === url.trim()) && (
                  <p className="text-[11px] text-rose-600 font-extrabold mt-1.5 flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>This URL has already been added to {activeProfile.title}!</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  {activeProfile.profile_type === 'engagement' ? 'Campaign Title / Post Caption *' : 'Article Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={activeProfile.profile_type === 'engagement' ? 'e.g. TikTok Dance Challenge' : 'Article Headline...'}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  {activeProfile.profile_type === 'engagement' ? 'Social Platform Name' : 'Website Name (Outlet)'}
                </label>
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder={activeProfile.profile_type === 'engagement' ? 'e.g. TikTok, Facebook, X (Twitter)' : 'e.g. Billboard Philippines, ABS-CBN News'}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                />
              </div>

              <div>
                <ImageUploadInput
                  label="Thumbnail Cover Image (Optional)"
                  value={thumbnail}
                  onChange={setThumbnail}
                  placeholder="Upload thumbnail or paste image URL..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>Highlight Quote / Excerpt Snippet (Optional)</span>
                  </span>
                  <span className="text-[10px] text-amber-600 font-bold normal-case">Daily Spotlight Quote</span>
                </label>
                <textarea
                  rows={2}
                  value={highlightQuote}
                  onChange={(e) => setHighlightQuote(e.target.value)}
                  placeholder='e.g. "SB19 shatters streaming records with breathtaking visuals in LAWLESS..."'
                  className="w-full p-3 bg-amber-50/40 border border-amber-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500 shadow-xs resize-none"
                />
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="p-4 px-6 border-t border-slate-200 shrink-0 bg-slate-50/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="article-admin-form"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingArticle ? 'Save Changes' : 'Publish Article'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
