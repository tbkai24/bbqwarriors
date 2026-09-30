'use client';

import React from 'react';
import { Profile } from '@/types/database';
import { Globe, MessageSquare } from 'lucide-react';

// Props for SocialLinks component
interface SocialLinksProps {
  profile: Profile;
}

// Inline SVG Icon components for social media platforms
const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.31a6.34 6.34 0 0 0-1-.08 6.34 6.34 0 1 0 6.34 6.34V9.07a8.16 8.16 0 0 0 4.91 1.63V7.25a4.86 4.86 0 0 1-1-.56z"/>
  </svg>
);

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.899 4.62-1.02 8.52-.6 11.64 1.32.36.18.48.66.301 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72.96.42 1.5-.3.54-.96.72-1.5.42z"/>
  </svg>
);

const AppleMusicIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.7 0a.7.7 0 0 0-.7.7v13.626a3.86 3.86 0 1 0 1.4 3.014V5.72l7.6 1.727v7.505a3.86 3.86 0 1 0 1.4 3.014V6.756a.7.7 0 0 0-.547-.683L13.253.053A.7.7 0 0 0 12.7 0zm-3.86 15.94a2.46 2.46 0 1 1-2.46 2.46 2.46 2.46 0 0 1 2.46-2.46zm9 1.727a2.46 2.46 0 1 1-2.46-2.46 2.46 2.46 0 0 1 2.46 2.46z"/>
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.186 24c-6.19 0-10.743-4.554-10.743-11.455C1.443 5.455 6.343.5 12.5.5c6.248 0 10.957 4.707 10.957 11.758 0 7.42-5.105 11.742-11.127 11.742-2.828 0-5.326-1.077-6.907-2.981l1.52-1.55c1.233 1.492 3.256 2.33 5.387 2.33 4.542 0 8.358-3.08 8.358-9.541 0-5.46-3.488-9.056-8.188-9.056-4.786 0-8.324 3.73-8.324 9.5 0 5.46 3.4 8.784 8.1 8.784 1.83 0 3.32-.472 4.417-1.4.953-.807 1.494-1.922 1.494-3.076 0-1.848-1.34-2.846-3.69-2.846h-.37c-1.42 0-2.316.71-2.316 1.8 0 .977.72 1.636 1.88 1.636.85 0 1.54-.31 2.05-.9l.06-.07.03.07c.07.19.1.41.1.63 0 .76-.38 1.48-1.04 1.98-.82.63-2.02.93-3.45.93-3.32 0-5.75-2.22-5.75-5.91 0-3.9 2.5-6.52 6.07-6.52 3.65 0 5.94 2.45 5.94 6.27 0 1.95-.73 3.65-2.06 4.79-1.45 1.25-3.47 1.88-5.83 1.88z"/>
  </svg>
);

// Helper function to return icon component based on platform name string
function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('youtube') || p.includes('yt')) return YoutubeIcon;
  if (p.includes('facebook') || p.includes('fb')) return FacebookIcon;
  if (p.includes('instagram') || p.includes('ig')) return InstagramIcon;
  if (p.includes('twitter') || p.includes('x')) return XTwitterIcon;
  if (p.includes('tiktok')) return TikTokIcon;
  if (p.includes('spotify')) return SpotifyIcon;
  if (p.includes('apple') || p.includes('music')) return AppleMusicIcon;
  if (p.includes('threads')) return ThreadsIcon;
  return Globe;
}

// Ensures URL starts with http:// or https://
const formatDirectUrl = (url: string) => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

// Main SocialLinks component - renders row of profile social media icons
export function SocialLinks({ profile }: SocialLinksProps) {
  // Standard profile social links list
  const standardLinks = [
    { key: 'website_url', label: 'Website', url: profile.website_url, icon: Globe },
    { key: 'youtube_url', label: 'YouTube', url: profile.youtube_url, icon: YoutubeIcon },
    { key: 'facebook_url', label: 'Facebook', url: profile.facebook_url, icon: FacebookIcon },
    { key: 'instagram_url', label: 'Instagram', url: profile.instagram_url, icon: InstagramIcon },
    { key: 'x_url', label: 'X', url: profile.x_url, icon: XTwitterIcon },
    { key: 'threads_url', label: 'Threads', url: profile.threads_url, icon: ThreadsIcon },
  ].filter(link => Boolean(link.url));

  // Custom user-defined social links list
  const customLinks = (profile.custom_social_links || []).map((c, idx) => ({
    key: `custom-${idx}`,
    label: c.platform || 'Social Link',
    url: c.url,
    icon: getPlatformIcon(c.platform),
  }));

  // Combine standard and custom social links
  const links = [...standardLinks, ...customLinks];

  if (links.length === 0) return null;

  return (
    // Render icon buttons flex row
    <div className="flex items-center justify-center flex-wrap gap-3 my-6">
      {links.map((link) => {
        const IconComponent = link.icon;
        return (
          <a
            key={link.key}
            href={formatDirectUrl(link.url!)}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 hover:scale-110 shadow-sm transition-all duration-200"
          >
            <IconComponent className="w-5 h-5" />
            <span className="sr-only">{link.label}</span>
          </a>
        );
      })}
    </div>
  );
}
