export type ProfileStatus = 'published' | 'draft' | 'archived';
export type ArticleStatus = 'published' | 'draft' | 'archived';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'duplicate' | 'archived';
export type AnalyticsEventType = 'profile_view' | 'article_click' | 'submit_attempt';

export interface SupportQrOption {
  id: string;
  platform: string; // e.g. "GCash", "Maya", "PayPal", "Ko-fi", "GoTyme", "Bank"
  qr_image?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  note?: string | null;
}

export interface Profile {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  profile_image: string | null;
  accent_color: string;
  theme: 'dark' | 'light' | 'glass';
  website_url: string | null;
  youtube_url: string | null;
  featured_video_url?: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  threads_url: string | null;
  custom_social_links?: Array<{ platform: string; url: string }> | null;
  support_qr_image?: string | null;
  support_title?: string | null;
  support_note?: string | null;
  support_qr_options?: SupportQrOption[] | null;
  seo_title: string | null;
  seo_description: string | null;
  status: ProfileStatus;
  profile_type?: 'embed' | 'engagement';
  display_order?: number;
  views_count?: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  profile_id: string;
  title: string;
  article_url: string;
  canonical_url: string;
  website_name: string;
  thumbnail: string | null;
  description: string | null;
  highlight_quote?: string | null;
  display_order: number;
  status: ArticleStatus;
  clicks_count?: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface ArticleSubmission {
  id: string;
  profile_id: string;
  article_url: string;
  canonical_url: string;
  website_name: string | null;
  title: string | null;
  thumbnail: string | null;
  description: string | null;
  notes: string | null;
  status: SubmissionStatus;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  profile_id: string;
  article_id: string | null;
  event_type: AnalyticsEventType;
  visitor_hash: string | null;
  country: string | null;
  device: string | null;
  referrer: string | null;
  created_at: string;
}

export interface DailyTrafficStat {
  id: string;
  profile_id: string;
  date: string;
  views_count: number;
  clicks_count: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export type AdminRole = 'super_admin' | 'editor';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: AdminRole;
  status: 'active' | 'inactive';
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Admin {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'super_admin' | 'editor';
  created_at: string;
}

export interface ExtractedMetadata {
  url: string;
  canonicalUrl: string;
  title: string;
  description: string;
  websiteName: string;
  thumbnail: string;
  favicon: string;
}

export interface NotificationItem {
  id: string;
  profile_id?: string | null;
  title: string;
  message: string;
  type: 'announcement' | 'reminder' | 'release' | 'stream_goal';
  url: string;
  status: 'draft' | 'sent' | 'scheduled';
  sent_at?: string | null;
  created_at: string;
}

export interface PushSubscriptionItem {
  id: string;
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  } | null;
  user_agent?: string | null;
  created_at: string;
}
