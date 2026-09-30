/**
 * ============================================================================
 * ADMIN WORKSPACE LAYOUT & STATE PROVIDER (app/(admin)/admin/layout.tsx)
 * Collaborative Developer Guide & Navigation Shell
 * ============================================================================
 * 
 * Purpose:
 * Provides the global workspace context (`AdminWorkspaceContext`) for all admin routes,
 * manages active profile selection, authenticates session tokens, and renders the top header & sidebar.
 * 
 * Key Features:
 * 1. Standalone Auth Route Bypass: Automatically bypasses header & sidebar layout for `/admin/login`.
 * 2. Active Profile Scoped Badges: Scopes sidebar notification counts strictly to the active workspace.
 * 3. Realtime Data Sync: Polls and caches profiles, articles, and submissions across Supabase DB.
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Profile, Article, ArticleSubmission } from '@/types/database';
import {
  getStoredProfiles,
  getStoredArticles,
  getStoredSubmissions,
  fetchProfilesFromSupabase,
  fetchArticlesFromSupabase,
  fetchSubmissionsFromSupabase,
  exportDataBackup,
} from '@/lib/data-store';
import { createClient } from '@/lib/supabase/client';
import { ActiveProfileSwitcher } from '@/components/admin/active-profile-switcher';
import { CreateProfileModal } from '@/components/admin/create-profile-modal';
import { BrandLogo } from '@/components/public/logo';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Palette,
  Share2,
  BarChart3,
  ExternalLink,
  LogOut,
  ArrowLeft,
  Loader2,
  Bell,
  Download,
  Heart,
  ShieldCheck,
} from 'lucide-react';

interface AdminWorkspaceContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  articles: Article[];
  submissions: ArticleSubmission[];
  refreshData: () => void;
  openCreateModal: () => void;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextType | null>(null);

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  if (!ctx) {
    throw new Error('useAdminWorkspace must be used within AdminLayout');
  }
  return ctx;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Standalone Login Page (Bypasses Admin Header & Sidebar Layout)
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [submissions, setSubmissions] = useState<ArticleSubmission[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check Admin Authentication
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      return;
    }

    const checkAuthStatus = async () => {
      const localSession = typeof window !== 'undefined' ? localStorage.getItem('sb19_admin_session') : null;
      if (localSession === 'authenticated') {
        setIsAuthenticated(true);
        loadAllData();
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsAuthenticated(true);
          loadAllData();
        } else {
          router.replace('/admin/login');
        }
      } catch {
        router.replace('/admin/login');
      }
    };

    checkAuthStatus();
  }, [pathname, router]);

  const handleSetActiveProfile = (profile: Profile) => {
    setActiveProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb19_active_profile_id', profile.id);
    }
  };

  const loadAllData = async () => {
    // 1. Initial local load
    const storedProfiles = getStoredProfiles();
    const storedArticles = getStoredArticles();
    const storedSubmissions = getStoredSubmissions();

    setProfiles(storedProfiles);
    setArticles(storedArticles);
    setSubmissions(storedSubmissions);

    const savedProfileId = typeof window !== 'undefined' ? localStorage.getItem('sb19_active_profile_id') : null;

    if (storedProfiles.length > 0) {
      const matchSaved = savedProfileId ? storedProfiles.find(p => p.id === savedProfileId) : null;
      const target = matchSaved || storedProfiles[0];
      setActiveProfile(target);
    }

    // 2. Fetch fresh DB state asynchronously
    try {
      const [dbProfs, dbArts, dbSubs] = await Promise.all([
        fetchProfilesFromSupabase(true),
        fetchArticlesFromSupabase(true),
        fetchSubmissionsFromSupabase(),
      ]);

      setProfiles(dbProfs);
      if (dbProfs.length > 0) {
        const currentSavedId = typeof window !== 'undefined' ? localStorage.getItem('sb19_active_profile_id') : null;
        const activeExist = dbProfs.find(p => p.id === (currentSavedId || activeProfile?.id));
        const target = activeExist || dbProfs[0];
        setActiveProfile(target);
        if (target && typeof window !== 'undefined') {
          localStorage.setItem('sb19_active_profile_id', target.id);
        }
      } else {
        setActiveProfile(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sb19_active_profile_id');
        }
      }
      setArticles(dbArts);
      setSubmissions(dbSubs);
    } catch {
      // Keep local
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb19_admin_session');
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    router.replace('/admin/login');
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  const pendingCount = activeProfile
    ? submissions.filter(s => s.profile_id === activeProfile.id && s.status === 'pending').length
    : 0;
  const articleCount = activeProfile
    ? articles.filter(a => a.profile_id === activeProfile.id).length
    : 0;

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Articles', href: '/admin/articles', icon: FileText, badge: articleCount },
    { label: 'Submissions', href: '/admin/submissions', icon: Clock, badge: pendingCount, highlight: pendingCount > 0 },
    { label: 'Push Notifications', href: '/admin/notifications', icon: Bell },
    { label: 'Appearance & Socials', href: '/admin/appearance', icon: Palette },
    { label: 'SEO & Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'DevOps & Auto-Healing', href: '/admin/devops', icon: ShieldCheck },
  ];

  return (
    <AdminWorkspaceContext.Provider
      value={{
        profiles,
        activeProfile,
        setActiveProfile: handleSetActiveProfile,
        articles,
        submissions,
        refreshData: loadAllData,
        openCreateModal: () => setIsCreateOpen(true),
      }}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Top Workspace Header Bar */}
        <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200"
              title="Return to Public Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <BrandLogo size="sm" showText={true} />

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Active Profile Switcher Dropdown */}
            <ActiveProfileSwitcher
              profiles={profiles}
              activeProfile={activeProfile}
              submissions={submissions}
              onSelectProfile={(p) => handleSetActiveProfile(p)}
              onCreateNewProfile={() => setIsCreateOpen(true)}
              onRefreshData={loadAllData}
            />
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {activeProfile && (
              <Link
                href={`/profile/${activeProfile.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-rose-400 text-xs font-semibold text-slate-700 hover:text-rose-600 flex items-center gap-1.5 transition-colors hidden sm:flex shadow-xs"
              >
                <span>View Public Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
              </Link>
            )}

            <button
              onClick={() => exportDataBackup()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download 1-Click JSON Backup of all profiles and articles"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Download Backup</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Log out from Admin Workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 flex">
          {/* Left Navigation Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 p-4 hidden md:flex flex-col justify-between shrink-0 shadow-2xs">
            <nav className="space-y-1">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Workspace Menu
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.highlight
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Sidebar Info Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200/60 space-y-1">
              <div className="text-[11px] font-extrabold text-slate-900">
                Active Workspace
              </div>
              <div className="text-xs font-bold text-rose-600 truncate">
                {activeProfile?.title || 'No Profile Selected'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Slug: <span className="font-mono">/profile/{activeProfile?.slug}</span>
              </div>
            </div>
          </aside>

          {/* Main Workspace Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        </div>

        {/* Create Profile Modal */}
        <CreateProfileModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newProf) => {
            loadAllData();
            handleSetActiveProfile(newProf);
          }}
        />
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
