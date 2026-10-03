'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { NotificationItem } from '@/types/database';
import { fetchNotificationsFromSupabase, getStoredNotifications, saveNotifications } from '@/lib/data-store';
import { createClient } from '@/lib/supabase/client';
import { Bell, Send, Plus, Smartphone, Monitor, CheckCircle2, Sparkles, AlertCircle, Link2, ExternalLink, Trash2, Radio, RotateCw } from 'lucide-react';

export default function NotificationsAdminPage() {
  const { activeProfile, profiles } = useAdminWorkspace();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'reminder' | 'release' | 'stream_goal'>('announcement');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'rose' } | null>(null);

  useEffect(() => {
    if (activeProfile && !targetUrl) {
      setTargetUrl(`/profile/${activeProfile.slug}`);
      setSelectedProfileId(activeProfile.id);
    }
  }, [activeProfile]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const notifs = await fetchNotificationsFromSupabase();
      setNotifications(notifs);

      const supabase = createClient();
      const { data: subs } = await supabase.from('push_subscriptions').select('id');
      if (subs && subs.length > 0) {
        setSubscriberCount(subs.length);
      }
    } catch {
      setNotifications(getStoredNotifications());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string, t: 'success' | 'info' | 'rose' = 'success') => {
    setToast({ message: msg, type: t });
    setTimeout(() => setToast(null), 4000);
  };

  const triggerDeviceNotification = async (notifTitle: string, notifMessage: string, notifUrl: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await new Promise<NotificationPermission>((resolve) => {
          try {
            const res = Notification.requestPermission((p) => resolve(p));
            if (res && typeof (res as any).then === 'function') {
              (res as any).then(resolve);
            }
          } catch {
            resolve(Notification.permission);
          }
        });
      }

      if (perm !== 'granted') return;

      const logoUrl = window.location.origin + '/assets/ytslogo.jpg';
      const options: NotificationOptions & { renotify?: boolean } = {
        body: notifMessage,
        icon: logoUrl,
        badge: logoUrl,
        tag: 'sb19-notif-' + Date.now(),
        renotify: true,
        data: { url: notifUrl || '/' },
      };

      // 1. Service Worker push
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(notifTitle, options);
            return;
          }
        } catch {
          // Ignore
        }
      }

      // 2. Direct Window Notification
      try {
        const notif = new Notification(notifTitle, options);
        notif.onclick = () => {
          window.focus();
          if (notifUrl) window.location.href = notifUrl;
        };
      } catch {
        // Fallback without external icon
        try {
          const notif2 = new Notification(notifTitle, { body: notifMessage });
          notif2.onclick = () => {
            window.focus();
            if (notifUrl) window.location.href = notifUrl;
          };
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleTestNotification = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Please enter a notification title and message', 'rose');
      return;
    }

    await triggerDeviceNotification(title.trim(), message.trim(), targetUrl || '/');
    showToast('Test push notification sent to your device!');
  };

  const broadcastToAllDevices = (notifTitle: string, notifMessage: string, notifUrl: string) => {
    triggerDeviceNotification(notifTitle, notifMessage, notifUrl);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('sb19_push_channel');
        bc.postMessage({
          type: 'TRIGGER_PUSH',
          title: notifTitle,
          message: notifMessage,
          url: notifUrl,
        });
        setTimeout(() => bc.close(), 1000);
      } catch {
        // Ignore
      }
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please provide a title and message', 'rose');
      return;
    }

    const currentTitle = title.trim();
    const currentMessage = message.trim();
    const currentUrl = targetUrl || '/';

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          message: currentMessage,
          url: currentUrl,
          type,
          profileId: selectedProfileId || activeProfile?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Trigger OS Push Notification pop-up on all connected devices
        broadcastToAllDevices(currentTitle, currentMessage, currentUrl);

        showToast(`Broadcast sent to ${data.sentToSubscribers || subscriberCount} devices!`);
        setTitle('');
        setMessage('');
        loadData();
      } else {
        showToast(data.error || 'Failed to send broadcast', 'rose');
      }
    } catch {
      showToast('Failed to connect to push notification server', 'rose');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRebroadcast = async (item: NotificationItem) => {
    setTitle(item.title);
    setMessage(item.message);
    setType(item.type);
    setTargetUrl(item.url || '/');
    if (item.profile_id) setSelectedProfileId(item.profile_id);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          message: item.message,
          url: item.url || '/',
          type: item.type,
          profileId: item.profile_id || activeProfile?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Trigger OS Push Notification pop-up on all connected devices
        broadcastToAllDevices(item.title, item.message, item.url || '/');

        showToast(`Re-broadcast sent to ${data.sentToSubscribers || subscriberCount} devices!`);
        loadData();
      } else {
        showToast(data.error || 'Failed to send re-broadcast', 'rose');
      }
    } catch {
      showToast('Failed to connect to push notification server', 'rose');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);

    try {
      const supabase = createClient();
      await supabase.from('notifications').delete().eq('id', id);
    } catch {
      // Ignore
    }
    showToast('Notification deleted from history');
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toast.type === 'rose'
              ? 'bg-rose-600 border-rose-500'
              : toast.type === 'info'
              ? 'bg-amber-600 border-amber-500'
              : 'bg-emerald-600 border-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-600" />
            <span>Push Notifications & Broadcasts</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Send instant push notifications to fans&apos; phones & laptops for new releases & reminders.
          </p>
        </div>

        {/* Device Subscribers Counter Card */}
        <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Subscribed Devices</div>
            <div className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>{subscriberCount} Devices</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Creation Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>Create New Push Broadcast</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Direct release links & reminders broadcast</span>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-4">
          {/* Notification Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Notification Title *</label>
              <input
                type="text"
                placeholder="Enter notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 bg-slate-50/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Notification Category</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 bg-slate-50/50"
              >
                <option value="announcement">📢 Announcement</option>
                <option value="release">🎵 New Release Alert</option>
                <option value="reminder">⏰ Streaming Reminder</option>
                <option value="stream_goal">🏆 Stream Goal Milestone</option>
              </select>
            </div>
          </div>

          {/* Notification Message Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700">Message Content *</label>
            <textarea
              rows={2}
              placeholder="Enter notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 bg-slate-50/50"
              required
            />
          </div>

          {/* Action Target Page Link URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span>Action Target Link (Opened on Click)</span>
                <span className="text-[10px] text-slate-400 font-normal">Relative or absolute URL</span>
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Enter target link URL..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Target Profile Scope</label>
              <select
                value={selectedProfileId}
                onChange={(e) => {
                  setSelectedProfileId(e.target.value);
                  const matched = profiles.find((p) => p.id === e.target.value);
                  if (matched) setTargetUrl(`/profile/${matched.slug}`);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 bg-slate-50/50"
              >
                <option value="">Global Broadcast (All Release Profiles)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    Profile: {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestNotification}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-500" />
              <span>Test Push on My Device</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending Broadcast...' : 'Broadcast Push Notification'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Notifications History */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-600" />
            <span>Broadcast History ({notifications.length})</span>
          </h2>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs font-medium">No push notifications sent yet. Create your first broadcast above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">{item.message}</p>
                  <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 truncate">
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleRebroadcast(item)}
                    className="px-3 py-1.5 rounded-xl bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    title="Push this notification again to all devices"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Push Again</span>
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    className="p-2 rounded-xl bg-white text-slate-700 hover:text-rose-600 border border-slate-200 shadow-2xs"
                    title="Open target URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteNotification(item.id)}
                    className="p-2 rounded-xl bg-white text-slate-400 hover:text-rose-600 border border-slate-200 shadow-2xs cursor-pointer"
                    title="Delete notification history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
