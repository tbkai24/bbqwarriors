'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase, fetchAnalyticsEventsFromSupabase, fetchDailyTrafficStatsFromSupabase, fetchArticlesFromSupabase } from '@/lib/data-store';
import { AnalyticsEvent, DailyTrafficStat } from '@/types/database';
import { getCountryFlagEmoji, COUNTRY_NAMES, getCountryName, normalizeReferrer } from '@/lib/device-detector';
import { BarChart3, Search, Eye, MousePointerClick, ShieldCheck, Check, Save, Smartphone, Laptop, Tablet, Globe, Calendar, ChevronDown, Users, Share2, Maximize2, X, TrendingUp, Sparkles } from 'lucide-react';

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.31a6.34 6.34 0 0 0-1-.08 6.34 6.34 0 1 0 6.34 6.34V9.07a8.16 8.16 0 0 0 4.91 1.63V7.25a4.86 4.86 0 0 1-1-.56z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.186 24c-6.19 0-10.743-4.554-10.743-11.455C1.443 5.455 6.343.5 12.5.5c6.248 0 10.957 4.707 10.957 11.758 0 7.42-5.105 11.742-11.127 11.742-2.828 0-5.326-1.077-6.907-2.981l1.52-1.55c1.233 1.492 3.256 2.33 5.387 2.33 4.542 0 8.358-3.08 8.358-9.541 0-5.46-3.488-9.056-8.188-9.056-4.786 0-8.324 3.73-8.324 9.5 0 5.46 3.4 8.784 8.1 8.784 1.83 0 3.32-.472 4.417-1.4.953-.807 1.494-1.922 1.494-3.076 0-1.848-1.34-2.846-3.69-2.846h-.37c-1.42 0-2.316.71-2.316 1.8 0 .977.72 1.636 1.88 1.636.85 0 1.54-.31 2.05-.9l.06-.07.03.07c.07.19.1.41.1.63 0 .76-.38 1.48-1.04 1.98-.82.63-2.02.93-3.45.93-3.32 0-5.75-2.22-5.75-5.91 0-3.9 2.5-6.52 6.07-6.52 3.65 0 5.94 2.45 5.94 6.27 0 1.95-.73 3.65-2.06 4.79-1.45 1.25-3.47 1.88-5.83 1.88z" />
  </svg>
);

function renderTrafficPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('twitter') || p.includes('x')) return <XTwitterIcon className="w-4 h-4 text-slate-900 shrink-0" />;
  if (p.includes('facebook') || p.includes('fb')) return <FacebookIcon className="w-4 h-4 text-blue-600 shrink-0" />;
  if (p.includes('instagram') || p.includes('ig')) return <InstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />;
  if (p.includes('youtube') || p.includes('yt')) return <YoutubeIcon className="w-4 h-4 text-red-600 shrink-0" />;
  if (p.includes('tiktok')) return <TikTokIcon className="w-4 h-4 text-slate-900 shrink-0" />;
  if (p.includes('threads')) return <ThreadsIcon className="w-4 h-4 text-purple-600 shrink-0" />;
  if (p.includes('google')) return <Search className="w-4 h-4 text-emerald-600 shrink-0" />;
  return <Globe className="w-4 h-4 text-slate-500 shrink-0" />;
}

export default function AnalyticsAdminPage() {
  const { activeProfile, articles, submissions, refreshData } = useAdminWorkspace();

  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');

  // Modal open states for full screen Overview of Countries and Traffic Platforms
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isTrafficModalOpen, setIsTrafficModalOpen] = useState(false);
  const [modalCountrySearch, setModalCountrySearch] = useState('');
  const [modalTrafficSearch, setModalTrafficSearch] = useState('');

  // Date Range Filter state: 1 Day (Default), 1 Week, 1 Month, All Time, Custom
  const [timeRange, setTimeRange] = useState<'1d' | '1w' | '1m' | 'all' | 'custom'>('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyTrafficStat[]>([]);
  const prevProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProfile) return;

    // Only clear data when switching to a DIFFERENT profile ID
    if (prevProfileIdRef.current && prevProfileIdRef.current !== activeProfile.id) {
      setEvents([]);
      setDailyStats([]);
    }
    prevProfileIdRef.current = activeProfile.id;

    setSeoTitle(activeProfile.seo_title || `${activeProfile.title} - SB19 YouTube Streamers`);
    setSeoDescription(activeProfile.seo_description || activeProfile.description || '');

    const loadLiveAnalytics = () => {
      Promise.all([
        fetchAnalyticsEventsFromSupabase(activeProfile.id),
        fetchDailyTrafficStatsFromSupabase(activeProfile.id),
        fetchArticlesFromSupabase(),
      ]).then(([evs, stats]) => {
        setEvents(evs);
        setDailyStats(stats);
      });
    };

    loadLiveAnalytics();
    const interval = setInterval(loadLiveAnalytics, 5000);

    return () => clearInterval(interval);
  }, [activeProfile?.id]);

  if (!activeProfile) return null;

  const profileArticles = articles.filter(a => a.profile_id === activeProfile.id && a.status === 'published');
  const totalViews = activeProfile.views_count || 0;
  const totalClicks = profileArticles.reduce((sum, a) => sum + (a.clicks_count || 0), 0);

  // Real timestamp range filtering
  const now = Date.now();
  const filteredEvents = events.filter(ev => {
    const evTime = new Date(ev.created_at).getTime();
    if (isNaN(evTime)) return true;

    if (timeRange === '1d') {
      return evTime >= now - 24 * 60 * 60 * 1000;
    } else if (timeRange === '1w') {
      return evTime >= now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '1m') {
      return evTime >= now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === 'all') {
      return true;
    } else if (timeRange === 'custom') {
      if (!startDate && !endDate) return true;
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;
      return evTime >= startMs && evTime <= endMs;
    }
    return true;
  });

  const d1Cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d7Cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d30Cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const datesSorted = Array.from(new Set(dailyStats.map(d => d.date))).sort().reverse();
  const latestDate = datesSorted[0] || new Date(now).toISOString().split('T')[0];

  const filteredDailyStats = dailyStats.filter(ds => {
    if (timeRange === '1d') return ds.date >= d1Cutoff;
    if (timeRange === '1w') return ds.date >= d7Cutoff;
    if (timeRange === '1m') return ds.date >= d30Cutoff;
    if (timeRange === 'all') return true;
    if (timeRange === 'custom') {
      if (!startDate && !endDate) return true;
      const start = startDate || '1970-01-01';
      const end = endDate || '2099-12-31';
      return ds.date >= start && ds.date <= end;
    }
    return true;
  });

  const nonLocalhostEvents = filteredEvents.filter(e => normalizeReferrer(e.referrer) !== 'Localhost');

  // Group raw non-localhost events by date string YYYY-MM-DD
  const eventsByDate: Record<string, AnalyticsEvent[]> = {};
  nonLocalhostEvents.forEach(ev => {
    const dStr = new Date(ev.created_at).toISOString().split('T')[0];
    if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
    eventsByDate[dStr].push(ev);
  });

  // Map of daily traffic stats by date YYYY-MM-DD
  const dailyStatsByDate: Record<string, DailyTrafficStat> = {};
  filteredDailyStats.forEach(ds => {
    dailyStatsByDate[ds.date] = ds;
  });

  // Set of all unique dates in the filtered time range
  const allDates = new Set([
    ...Object.keys(eventsByDate),
    ...Object.keys(dailyStatsByDate)
  ]);

  let totalViewsSum = 0;
  let totalClicksSum = 0;
  const mergedDevices: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  const mergedCountries: Record<string, number> = {};
  const mergedReferrers: Record<string, number> = {};
  const uniqueVisitorSet = new Set<string>();

  allDates.forEach(dStr => {
    const dayEvents = eventsByDate[dStr] || [];
    const dayStat = dailyStatsByDate[dStr];

    const dayViewEvents = dayEvents.filter(e => e.event_type === 'profile_view');
    const dayClickEvents = dayEvents.filter(e => e.event_type === 'article_click');

    // Calculate views for this day (max of raw events vs aggregated stat)
    let dayViewsFromStat = 0;
    if (dayStat) {
      const rd = (dayStat as any).referrer_breakdown || {};
      Object.entries(rd).forEach(([p, cnt]) => {
        if (normalizeReferrer(p) !== 'Localhost') {
          dayViewsFromStat += (cnt as number);
        }
      });
    }

    const dayViews = Math.max(dayViewEvents.length, dayViewsFromStat);
    totalViewsSum += dayViews;

    // Calculate clicks for this day
    const dayClicksFromStat = dayStat ? (dayStat.clicks_count || 0) : 0;
    const dayClicks = Math.max(dayClickEvents.length, dayClicksFromStat);
    totalClicksSum += dayClicks;

    // Deduplicated Unique Visitors across the date range
    if (dayViewEvents.length > 0) {
      dayViewEvents.forEach(e => {
        if (e.visitor_hash) {
          uniqueVisitorSet.add(e.visitor_hash);
        } else {
          uniqueVisitorSet.add(`${dStr}_${e.country || 'PH'}_${e.device || 'mobile'}`);
        }
      });
    } else if (dayStat) {
      const cd = dayStat.country_breakdown || {};
      const devMap = dayStat.device_breakdown || {};
      const countries = Object.keys(cd);
      const devices = Object.keys(devMap);

      if (countries.length > 0) {
        countries.forEach(c => {
          if (devices.length > 0) {
            devices.forEach(dev => {
              if ((cd[c] || 0) > 0 && (devMap[dev] || 0) > 0) {
                uniqueVisitorSet.add(`${dStr}_${c}_${dev}`);
              }
            });
          } else {
            uniqueVisitorSet.add(`${dStr}_${c}`);
          }
        });
      } else if (dayViewsFromStat > 0) {
        uniqueVisitorSet.add(`${dStr}_stat_views`);
      }
    }

    // Devices for this day
    const dayStatDevices = dayStat?.device_breakdown || {};
    const dayEventDevices = dayViewEvents.reduce((acc, ev) => {
      const d = ev.device || 'mobile';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, { mobile: 0, desktop: 0, tablet: 0 } as Record<string, number>);

    const hasDayStatDev = dayStat && Object.keys(dayStatDevices).length > 0;
    mergedDevices.mobile += hasDayStatDev ? (dayStatDevices.mobile || 0) : (dayEventDevices.mobile || 0);
    mergedDevices.desktop += hasDayStatDev ? (dayStatDevices.desktop || 0) : (dayEventDevices.desktop || 0);
    mergedDevices.tablet += hasDayStatDev ? (dayStatDevices.tablet || 0) : (dayEventDevices.tablet || 0);

    // Countries for this day
    const dayStatCountries = dayStat?.country_breakdown || {};
    const dayEventCountries = dayViewEvents.reduce((acc, ev) => {
      if (ev.country) acc[ev.country] = (acc[ev.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasDayStatCty = dayStat && Object.keys(dayStatCountries).length > 0;
    const activeCtyMap = hasDayStatCty ? dayStatCountries : dayEventCountries;

    Object.entries(activeCtyMap).forEach(([c, cnt]) => {
      mergedCountries[c] = (mergedCountries[c] || 0) + (cnt as number);
    });

    // Referrers for this day
    const dayStatReferrers: Record<string, number> = {};
    if (dayStat) {
      const rd = (dayStat as any).referrer_breakdown || {};
      Object.entries(rd).forEach(([p, cnt]) => {
        const platform = normalizeReferrer(p);
        if (platform !== 'Localhost') {
          dayStatReferrers[platform] = (dayStatReferrers[platform] || 0) + (cnt as number);
        }
      });
    }

    const dayEventReferrers = dayViewEvents.reduce((acc, ev) => {
      const platform = normalizeReferrer(ev.referrer);
      if (platform !== 'Localhost') {
        acc[platform] = (acc[platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const dayRefKeys = new Set([...Object.keys(dayStatReferrers), ...Object.keys(dayEventReferrers)]);
    dayRefKeys.forEach(r => {
      mergedReferrers[r] = (mergedReferrers[r] || 0) + Math.max(dayEventReferrers[r] || 0, dayStatReferrers[r] || 0);
    });
  });

  const clickEventsInRange = filteredEvents.filter(e => e.event_type === 'article_click');

  const isFullHistoryIncluded = timeRange !== '1d' && filteredDailyStats.length >= dailyStats.length && dailyStats.length > 0;

  let displayViews = (timeRange === 'all' || isFullHistoryIncluded) ? Math.max(totalViews, totalViewsSum) : totalViewsSum;
  let displayClicks = (timeRange === 'all' || isFullHistoryIncluded)
    ? Math.max(totalClicks, totalClicksSum, clickEventsInRange.length)
    : Math.max(clickEventsInRange.length, totalClicksSum);
  let referrersMap = mergedReferrers;
  let uniqueVisitorsCount = uniqueVisitorSet.size;

  // Aggregate lifetime views from activeProfile for All Time view
  if (timeRange === 'all' || isFullHistoryIncluded) {
    displayViews = Math.max(totalViews, displayViews);
    displayClicks = Math.max(totalClicks, displayClicks);
    if (displayViews > 0) {
      const ratio = displayViews > totalViewsSum && totalViewsSum > 0 ? (displayViews / totalViewsSum) : 1;
      uniqueVisitorsCount = Math.max(uniqueVisitorsCount, Math.round(uniqueVisitorSet.size * ratio));
      uniqueVisitorsCount = Math.min(uniqueVisitorsCount, displayViews);
    }
  }

  // Scale Visitor Devices to match displayViews so sum equals Total Profile Views
  const rawGrandTotalDevices = (mergedDevices.mobile || 0) + (mergedDevices.desktop || 0) + (mergedDevices.tablet || 0);

  const mobileCount = rawGrandTotalDevices > 0 && displayViews > 0
    ? Math.round(((mergedDevices.mobile || 0) / rawGrandTotalDevices) * displayViews)
    : (mergedDevices.mobile || 0);

  const desktopCount = rawGrandTotalDevices > 0 && displayViews > 0
    ? Math.round(((mergedDevices.desktop || 0) / rawGrandTotalDevices) * displayViews)
    : (mergedDevices.desktop || 0);

  const tabletCount = rawGrandTotalDevices > 0 && displayViews > 0
    ? Math.max(0, displayViews - (mobileCount + desktopCount))
    : (mergedDevices.tablet || 0);

  const grandTotalDevices = mobileCount + desktopCount + tabletCount || 1;
  const mobilePct = Math.round((mobileCount / grandTotalDevices) * 100);
  const desktopPct = Math.round((desktopCount / grandTotalDevices) * 100);
  const tabletPct = Math.round((tabletCount / grandTotalDevices) * 100);

  // Scale Visitor Countries to match displayViews so sum equals Total Profile Views
  const rawGrandTotalCountries = Object.values(mergedCountries).reduce((a, b) => a + Number(b || 0), 0);
  let countriesMap: Record<string, number> = {};

  if (rawGrandTotalCountries > 0 && displayViews > 0) {
    const scale = displayViews / rawGrandTotalCountries;
    Object.entries(mergedCountries).forEach(([c, cnt]) => {
      const scaledVal = Math.round(Number(cnt || 0) * scale);
      if (scaledVal > 0) countriesMap[c] = scaledVal;
    });
  } else {
    Object.assign(countriesMap, mergedCountries);
  }

  const countryList = Object.entries(countriesMap).sort((a, b) => b[1] - a[1]);
  const referrerList = Object.entries(referrersMap).sort((a, b) => b[1] - a[1]);

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    const allProfiles = getStoredProfiles();
    const updatedProfile = {
      ...activeProfile,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const updated = allProfiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    saveProfiles(updated);
    await saveProfileToSupabase(updatedProfile);

    refreshData();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-600" />
            <span>SEO & Profile Analytics</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Per-profile traffic metrics & SEO metadata for active profile: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        {/* Date Range Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs appearance-none cursor-pointer"
            >
              <option value="1d">1 Day (Last 24h)</option>
              <option value="1w">1 Week (Last 7d)</option>
              <option value="1m">1 Month (Last 30d)</option>
              <option value="all">All Time (Lifetime Total)</option>
              <option value="custom">Custom Range...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>

          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200 shadow-xs text-xs animate-fade-in">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold text-xs focus:outline-none focus:border-rose-500 shadow-2xs max-w-[130px]"
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-0.5">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold text-xs focus:outline-none focus:border-rose-500 shadow-2xs max-w-[130px]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Profile Views</span>
            <Eye className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{displayViews.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {timeRange === '1d' ? 'Visits in the last 24 hours' : timeRange === '1w' ? 'Visits in the last 7 days' : timeRange === '1m' ? 'Visits in the last 30 days' : timeRange === 'all' ? 'Lifetime total views (All Time)' : 'Visits in custom date range'}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Unique Profile Views</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{uniqueVisitorsCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {timeRange === 'all' ? 'Estimated unique fans (All Time)' : `Unique individual fans (${timeRange === '1d' ? '24h' : timeRange === '1w' ? '7d' : timeRange === '1m' ? '30d' : 'Range'})`}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Article Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{displayClicks.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {timeRange === 'all' ? 'Lifetime clicks across articles' : `Article clicks (${timeRange === '1d' ? '24h' : timeRange === '1w' ? '7d' : timeRange === '1m' ? '30d' : 'Range'})`}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Valid Articles</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{profileArticles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Active streaming links</div>
        </div>
      </div>

      {/* Device, Country Geolocation & Traffic Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Breakdown Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-rose-600" />
              <span>Visitor Devices</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">Mobile vs Laptop</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <Smartphone className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{mobileCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Mobile ({mobilePct}%)</div>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <Laptop className="w-4 h-4 text-sky-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{desktopCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Laptop ({desktopPct}%)</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Tablet className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{tabletCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Tablet ({tabletPct}%)</div>
            </div>
          </div>
        </div>

        {/* Traffic Platforms / Referrers Card (Middle) */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Traffic Platforms</span>
            </h2>
            <button
              onClick={() => setIsTrafficModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Expand Traffic Platforms Overview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {referrerList.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium py-3 text-center">
              Direct Link visits.
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {referrerList.map(([platform, count], idx) => (
                <div key={platform} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 min-w-0">
                    {idx === 0 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-100 text-amber-700 border border-amber-300 shrink-0">#1</span>
                    ) : idx === 1 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-slate-200 text-slate-700 border border-slate-300 shrink-0">#2</span>
                    ) : idx === 2 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-orange-100 text-orange-800 border border-orange-300 shrink-0">#3</span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">#{idx + 1}</span>
                    )}
                    {renderTrafficPlatformIcon(platform)}
                    <span className="truncate">{platform}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-extrabold text-emerald-600 shrink-0 ml-1">
                    {count.toLocaleString()} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Visitor Countries Card (End) */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Visitor Countries</span>
            </h2>
            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Expand Visitor Countries Overview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {countryList.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium py-3 text-center">
              No country data logged yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {countryList.map(([code, count], idx) => (
                <div key={code} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 min-w-0">
                    {idx === 0 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-100 text-amber-700 border border-amber-300 shrink-0">#1</span>
                    ) : idx === 1 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-slate-200 text-slate-700 border border-slate-300 shrink-0">#2</span>
                    ) : idx === 2 ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-orange-100 text-orange-800 border border-orange-300 shrink-0">#3</span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 shrink-0">#{idx + 1}</span>
                    )}
                    <img
                      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                      alt={code}
                      className="w-5 h-3.5 object-cover rounded-xs border border-slate-200 shadow-2xs shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="truncate">{getCountryName(code)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-extrabold text-rose-600 shrink-0 ml-1">
                    {count.toLocaleString()} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Article / Social Link Performance Breakdown Table */}
      {(() => {
        const availablePlatforms = Array.from(
          new Set(profileArticles.map(a => (a.website_name || 'Web Article').trim()))
        ).sort();

        const filteredProfileArticles = profileArticles.filter(art => {
          if (activeProfile.profile_type !== 'engagement' || selectedPlatformFilter === 'all') return true;
          return (art.website_name || '').trim().toLowerCase() === selectedPlatformFilter.toLowerCase();
        });

        return (
          <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-emerald-600" />
                <span>{activeProfile.profile_type === 'engagement' ? 'Per-Platform Link Performance' : 'Per-Article Link Performance'}</span>
              </h2>
              
              {activeProfile.profile_type === 'engagement' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Filter Platform:</span>
                  <select
                    value={selectedPlatformFilter}
                    onChange={(e) => setSelectedPlatformFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-none focus:border-rose-500 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="all">All Platforms ({profileArticles.length} links)</option>
                    {availablePlatforms.map((plat) => {
                      const count = profileArticles.filter(a => (a.website_name || '').trim().toLowerCase() === plat.toLowerCase()).length;
                      return (
                        <option key={plat} value={plat}>
                          {plat} ({count} {count === 1 ? 'link' : 'links'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {filteredProfileArticles.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-4 text-center">
                {profileArticles.length === 0
                  ? `No published links available yet for ${activeProfile.title}.`
                  : `No links found for platform "${selectedPlatformFilter}".`}
              </p>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const items = filteredProfileArticles.map(art => {
                    if (timeRange === 'all' || isFullHistoryIncluded) {
                      return { art, clicks: art.clicks_count || 0 };
                    }
                    const scaled = displayClicks > 0 ? ((art.clicks_count || 0) / (totalClicks || 1)) * displayClicks : 0;
                    return {
                      art,
                      clicks: Math.floor(scaled),
                      remainder: scaled - Math.floor(scaled)
                    };
                  });

                  if (timeRange !== 'all' && !isFullHistoryIncluded && displayClicks > 0) {
                    const currentSum = items.reduce((sum, item) => sum + item.clicks, 0);
                    let diff = displayClicks - currentSum;
                    if (diff > 0) {
                      const sortedByRemainder = [...items].sort((a, b) => (b.remainder || 0) - (a.remainder || 0));
                      for (let i = 0; i < diff && i < sortedByRemainder.length; i++) {
                        sortedByRemainder[i].clicks += 1;
                      }
                    }
                  }

                  return items.map(({ art, clicks }) => (
                    <div key={art.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-black text-[10px] text-slate-700 uppercase tracking-wider shadow-2xs">
                            {art.website_name}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">{art.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">{art.article_url}</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black shrink-0 flex items-center gap-1.5 shadow-xs">
                        <MousePointerClick className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{clicks.toLocaleString()} Clicks</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        );
      })()}

      <form onSubmit={handleSaveSeo} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Search className="w-4 h-4 text-rose-600" />
          <h2 className="text-sm font-bold text-slate-900">Search Engine Optimization (SEO)</h2>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>SEO metadata updated successfully!</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SEO Title Tag</label>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Meta Description</label>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 resize-none font-medium"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save SEO Settings</span>
          </button>
        </div>
      </form>

      {/* OVERVIEW MODAL: ALL VISITOR COUNTRIES (DOUBLE COLUMN GRID) */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setIsCountryModalOpen(false)}>
          <div className="w-full max-w-2xl p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Visitor Countries ({countryList.length})</span>
              </h2>
              <button
                onClick={() => setIsCountryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {countryList.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-3 text-center">
                No country data logged yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {countryList.map(([code, count], idx) => (
                  <div key={code} className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                      {idx === 0 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-amber-100 text-amber-700 border border-amber-300 shrink-0">#1</span>
                      ) : idx === 1 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-slate-200 text-slate-700 border border-slate-300 shrink-0">#2</span>
                      ) : idx === 2 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-orange-100 text-orange-800 border border-orange-300 shrink-0">#3</span>
                      ) : (
                        <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-slate-100 text-slate-500 shrink-0">#{idx + 1}</span>
                      )}
                      <img
                        src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                        alt={code}
                        className="w-4 h-3 object-cover rounded-xs border border-slate-200 shadow-2xs shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="truncate">{getCountryName(code)}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-extrabold text-rose-600 shrink-0 ml-1 text-[10px]">
                      {count.toLocaleString()} visits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OVERVIEW MODAL: ALL TRAFFIC PLATFORMS (DOUBLE COLUMN GRID) */}
      {isTrafficModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setIsTrafficModalOpen(false)}>
          <div className="w-full max-w-2xl p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Traffic Platforms ({referrerList.length})</span>
              </h2>
              <button
                onClick={() => setIsTrafficModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {referrerList.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-3 text-center">
                Direct Link visits.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {referrerList.map(([platform, count], idx) => (
                  <div key={platform} className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                      {idx === 0 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-amber-100 text-amber-700 border border-amber-300 shrink-0">#1</span>
                      ) : idx === 1 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-slate-200 text-slate-700 border border-slate-300 shrink-0">#2</span>
                      ) : idx === 2 ? (
                        <span className="px-1 py-0.2 text-[9px] font-black rounded bg-orange-100 text-orange-800 border border-orange-300 shrink-0">#3</span>
                      ) : (
                        <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-slate-100 text-slate-500 shrink-0">#{idx + 1}</span>
                      )}
                      {renderTrafficPlatformIcon(platform)}
                      <span className="truncate">{platform}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-extrabold text-emerald-600 shrink-0 ml-1 text-[10px]">
                      {count.toLocaleString()} visits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
