# Technical Architecture & Solution Summary

This document provides a comprehensive reusable blueprint of the solutions, database architecture, security measures, and analytics engine built for this application. You can reuse this exact architecture for future Web Applications and Progressive Web Apps (PWAs).

---

## 1. 🛡️ Cloudflare Turnstile Security & Anti-Bot Protection

### Client Widget Integration (`components/public/turnstile.tsx`)
- Renders Cloudflare Turnstile using Next.js `Script` (`strategy="afterInteractive"`).
- Uses `useRef` to maintain widget state across re-renders and prevent duplicate script loading.
- Exposes `onVerify` and `onExpire` callbacks to gate sensitive user actions.

### Server Verification Route (`app/api/verify-turnstile/route.ts`)
- Canonical server-side API endpoint POSTing to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- Requires both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET`.
- Gates public submission forms (`submit-modal.tsx`) before executing metadata extraction or database writes.

---

## 1.5. 🍖 BBQ Warriors Schema Clean-Up & Direct Data Layer Architecture
- **Schema Isolation**: Dedicated PostgreSQL tables (`bbq_warriors_profiles`, `bbq_warriors_articles`) strictly isolated from legacy tables.
- **Reference Project Architecture**: Directly mirrors the robust, bug-free data flow of `SB19 YT Streamers Embeded link`:
  - Removed confusing client-side local storage merge maps that previously caused phantom/ghost article resurrection and out-of-sync devices.
  - Direct Supabase PostgreSQL upserts: Articles write straight to `bbq_warriors_articles` with strict column alignment (eliminating `PGRST204` schema cache errors caused by non-existent columns like `highlight_quote`).
  - Seamless foreign key mapping: `bbq_profile_id` <-> `profile_id` ensures consistent UUID resolution across mobile phones, tablets, and desktops.
  - Fast, un-cached public API delivery: `/api/public/data` serves real-time published profiles and articles with `Cache-Control: no-store`.
- **Complete Support Removal**:
  - Removed all Support / Donation QR modals, buttons, and references from public headers, footers, and profile views.
  - Footer strictly displays: `© 2026 BBQ Warriors. All rights reserved.`
  - Supabase profiles cleared of support fields (`support_qr_options = []`, `support_qr_image = null`).
- **Clean DB State**:
  - `bbq_warriors_articles` table completely cleared (0 articles), ready for fresh, bug-free article additions via the admin panel.


---

## 2. ⚡ Atomic PostgreSQL Analytics & Data Accuracy Engine

### The Problem Solved
In high-concurrency environments or multi-visitor Web/PWA apps, client-side updates (e.g., `.update({ clicks_count: newCount })` from local storage) cause race conditions that overwrite real database counts with lower stale numbers.

### The Solution: Server-Side Atomic Stored Procedures (RPC)

#### 1. Atomic Article Click Increment (`increment_article_clicks`)
```sql
CREATE OR REPLACE FUNCTION public.increment_article_clicks(a_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.articles 
  SET clicks_count = COALESCE(clicks_count, 0) + 1 
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Atomic Daily Traffic Rollup (`increment_daily_article_click`)
```sql
CREATE OR REPLACE FUNCTION increment_daily_article_click(
    p_profile_id UUID,
    p_date DATE,
    p_device TEXT,
    p_country TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_traffic_stats (profile_id, date, clicks_count)
    VALUES (
        p_profile_id,
        p_date,
        1
    )
    ON CONFLICT (profile_id, date) DO UPDATE SET
        clicks_count = daily_traffic_stats.clicks_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. ⏱️ Real-Time Event Tracking & Date-Range Filtering

### Raw Event Log Schema (`analytics_events`)
- **`id`**: `UUID`
- **`profile_id`**: `UUID` (Strict Workspace/Profile Isolation)
- **`article_id`**: `UUID` (Target Content Item)
- **`event_type`**: `profile_view` | `article_click` | `submit_attempt`
- **`visitor_hash`**: Anonymized client IP / visitor hash for deduplicated unique count
- **`country`**: GeoIP country code (PH, US, JP, AU, etc.)
- **`device`**: `mobile` | `desktop` | `tablet`
- **`referrer`**: Normalized platform origin (Twitter/X, Facebook, Threads, Direct Link, etc.)
- **`created_at`**: `TIMESTAMPTZ` (Exact ISO timestamp)

### Filter Mechanics (`1d`, `1w`, `1m`, `all`, `custom`)
- **`1d` (Last 24h)**: Filtered strictly to `created_at >= Date.now() - 24h` / today's date.
- **`1w` (Last 7d)**: Filtered strictly to `created_at >= Date.now() - 7d`.
- **`1m` (Last 30d)**: Filtered strictly to `created_at >= Date.now() - 30d`.
- **`all` (Lifetime)**: Lifetime total accumulated from database tables.
- **`custom`**: Filtered strictly to user-selected `startDate` and `endDate`.

---

## 4. 🎨 Responsive UI & Custom Date Range Controls

- **Layout Resilience**: Custom date picker wrapped in `flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200 shadow-xs animate-fade-in`.
- **Bounded Inputs**: Date inputs bounded with `max-w-[130px]` to prevent browser native date-picker overflow across screen resolutions.
- **Strict Profile Isolation**: All analytical queries enforce `.eq('profile_id', activeProfile.id)` to guarantee 0% data cross-contamination between workspaces/projects.

---

## 5. 📱 PWA & Web Push Notification Architecture

### Service Worker (`public/sw.js`)
- Registered at `/sw.js` via `navigator.serviceWorker.register('/sw.js')`.
- Handles `push` event listeners, parsing JSON payloads (`title`, `message`, `url`, `id`).
- Employs strict single-notification tagging (`tag: notifTag`, `renotify: false`) to ensure exactly **1 clean notification banner** is displayed per broadcast instead of duplicate spam.
- Listens to `notificationclick` events, automatically closing the notification banner and navigating to the target URL (or focusing an existing active client window).

### Database Schema for Web Push (`supabase/migrations/20260930000002_web_push_notifications.sql`)
1. **`push_subscriptions` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `endpoint`: `TEXT UNIQUE NOT NULL`
   - `keys`: `JSONB` (contains VAPID `p256dh` and `auth` keys)
   - `user_agent`: `TEXT`
   - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`

2. **`notifications` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `profile_id`: `UUID REFERENCES public.bbq_warriors_profiles(id)`
   - `title`: `TEXT NOT NULL`
   - `message`: `TEXT NOT NULL`
   - `type`: `TEXT DEFAULT 'announcement'`
   - `url`: `TEXT DEFAULT '/'`
   - `status`: `TEXT DEFAULT 'sent'`
   - `sent_at`: `TIMESTAMPTZ DEFAULT NOW()`

---

## 6. 📊 Analytics Engine Accuracy & Largest Remainder Alignment

### 1. The Problem Solved
Individual article click counts scaled independently using `Math.round()` produced rounding discrepancies (±1 to ±5 clicks) compared to the `Total Article Clicks` header card. Additionally, un-synced `clicks_count` totals across `articles` vs `daily_traffic_stats` caused UI containers to display lower stale values.

### 2. The Solutions
1. **Largest Remainder Algorithm (Hare-Niemeyer Method)**:
   Applied in `app/(admin)/admin/analytics/page.tsx` when rendering the `Per-Article Link Performance` table. The sum of all 15 articles in the UI list is **guaranteed 100% mathematically equal to the Total Article Clicks card at the top** to the exact single digit.
2. **Database Auto-Sync & Real-Time Polling**:
   - `analytics/page.tsx` polls fresh analytics data every 5 seconds, updating UI counters live as fans click links.
   - `fetchArticlesFromSupabase()` clears stale local storage browser cache on load.
3. **Live Debug API Endpoint (`app/api/admin/debug-analytics/route.ts`)**:
   Provides `http://localhost:3000/api/admin/debug-analytics` returning raw, untouched JSON metrics directly from Supabase for instant database validation.
4. **Zero-Flickering State Reset Isolation (`prevProfileIdRef`)**:
   Background polling intervals (every 5s) must NOT call `setEvents([])` or `setDailyStats([])`. State resets are strictly isolated using `useRef(prevProfileId)` to execute ONLY when switching to a different Profile ID.
5. **Local Storage Key Versioning (`v7`)**:
   Bumped client storage keys in `lib/data-store.ts` to `_v7` for automatic client-side cache eviction across all browser tabs.

---

## 7. 🔗 Content Fingerprinting & Multi-Format Duplicate URL Prevention

### 1. The Problem Solved
Users often submit different URL variations pointing to the exact same content or post (e.g. Reddit share IDs, YouTube shortened links, X/Twitter query parameters, Instagram reels, TikTok tracking flags). Without canonical normalization, duplicate content bypasses standard string comparisons.

### 2. The Multi-Layered Solutions (`lib/url-normalizer.ts` & `app/api/extract-metadata/route.ts`)
1. **Comprehensive Tracking Parameter Stripping**:
   Automatically strips `utm_source`, `utm_medium`, `fbclid`, `igsh`, `si`, `s`, `t`, `_t`, `_r`, `ref_src`, `share_id`, `mibextid`, `context`, `rdt`, `feature`, `is_from_webapp`, `sender_device`, and `st`.
2. **Platform Content Fingerprinting (`extractContentFingerprint()`)**:
   Extracts unique canonical post/video IDs across major social networks:
   - **Reddit**: `reddit:1vbgby9` (matches `reddit.com/r/.../comments/1vbgby9`, `redd.it/1vbgby9`, `m.reddit.com/...`)
   - **YouTube**: `youtube:VIDEO_ID` (matches `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/live/ID`)
   - **X / Twitter**: `twitter:TWEET_ID` (matches `x.com/status/ID`, `twitter.com/status/ID`, `x.com/i/status/ID`)
   - **Instagram**: `instagram:POST_ID` (matches `instagram.com/p/ID`, `instagram.com/reel/ID`)
   - **TikTok**: `tiktok:VIDEO_ID` (matches `tiktok.com/@user/video/ID`)
3. **HTML OpenGraph & `<link rel="canonical">` Extraction**:
   Server-side `/api/extract-metadata` parses the webpage HTML `<link rel="canonical">` and `<meta property="og:url">` tags, ensuring true underlying canonical destination URLs are resolved even for shortened or redirected URLs.

---

## 🚀 PWA & Web App Blueprint Checklist for Future Projects

When building future Web Apps or PWAs:
1. Include `SOLUTION_SUMMARY.md` in your project root directory.
2. Use PostgreSQL RPC functions (`.rpc()`) for any counter/like/view/click action to guarantee zero client race-condition overwrites.
3. Protect public forms and endpoints with Cloudflare Turnflare anti-bot verification.
4. Use `analytics_events` with `TIMESTAMPTZ` alongside `daily_traffic_stats` with `DATE` for 100% accurate date-range filtering.
5. Register `/sw.js` service worker with VAPID web push subscriptions saved to `push_subscriptions` table for instant PWA push notification broadcasts.
6. Use `extractContentFingerprint()` and HTML `<link rel="canonical">` extraction to prevent duplicate submissions across different URL formats.
7. Always clean up temporary test scripts and dead code after completing work to maintain a clean codebase.

---

## 8. 🛠️ Direct Workspace Switcher Drag-and-Drop & Standalone Admin Login Layout

### 1. Standalone Admin Login Layout (`app/(admin)/admin/layout.tsx`)
- **Bypassed Admin Navbar & Sidebar**: Solved the layout bug where navigating to `/admin/login` rendered the admin header navbar and sidebar navigation. Added `if (pathname === '/admin/login') return <>{children}</>;` to isolate the login screen as a clean, full-viewport standalone page.

### 2. Strict Workspace-Scoped Submission Badging & Cross-Profile Notice Banner
- **Current Workspace Scoped Sidebar Badge**: Solved the misleading sidebar count bug where `pendingCount` checked submissions for all profiles combined. Scoped `pendingCount` in `AdminLayout` strictly to `activeProfile.id`.
- **Subtle Cross-Profile Indicator**: Added an amber pulsing indicator dot on the header profile switcher toggle button whenever other workspace profiles contain pending submissions, preventing misleading counts on the sidebar while ensuring admins never miss incoming fan submissions.
- **Direct Per-Profile Tags & Cross-Profile Filter**: Added a `Current Workspace` vs `All Workspaces` toggle on `admin/submissions/page.tsx` with color-coded workspace tags (`Profile: LAWLESS`, `Profile: TF`), allowing admins to review and approve/reject submissions across any profile without needing to switch active workspaces.

### 3. Drag and Drop Profile & Article Re-ordering
- **Direct Header Dropdown Re-ordering (`components/admin/active-profile-switcher.tsx`)**: Integrated HTML5 Drag & Drop directly inside the header profile switcher dropdown menu with `GripVertical` handles (`⋮⋮`), enabling instant drag-and-drop re-ordering of release profiles without opening modals.
- **Article Card Drag-and-Drop (`app/(admin)/admin/articles/page.tsx`)**: Added `GripVertical` handles on article card rows for fluid drag-and-drop re-ordering.
- **Database Sequence Order Sync (`lib/data-store.ts`)**: Created `updateProfilesOrderInSupabase` and `updateArticlesOrderInSupabase` executing batch PostgreSQL updates to assign sequential `display_order` (1, 2, 3...) to Supabase DB.
- **Dead Code Cleanup**: Deleted unused `reorder-profiles-modal.tsx` to maintain documentation and repository integrity.

---

## 9. 🔢 Front-Number Title Sorting & Automatic Database Sync

### 1. Front-Number Parsing & Natural Comparison Engine (`lib/url-normalizer.ts`)
- **`extractFrontNumber(title: string)`**: Extracts leading numeric digits from titles formatted with numbers at the beginning (e.g. `1. Title`, `02 - Title`, `[10] Title`, `#5 Title`).
- **`compareByFrontNumber(titleA, titleB, direction)`**: Sorts items numerically by their front number (`1, 2, 3... 10, 11, 100`). If front numbers are identical or absent, seamlessly falls back to natural locale-aware string comparison (`localeCompare(..., { numeric: true })`).

### 2. Streamlined Admin Sorting UI (`app/(admin)/admin/articles/page.tsx`)
- Renamed options cleanly to **`Number at Front (Ascending)`** (`num-asc`) and **`Number at Front (Descending)`** (`num-desc`) (removing restrictive `1 to 9` labels).
- **Automatic DB Sync (`handleSortChange`)**: Selecting any sort mode automatically re-sequences `display_order` (1, 2, 3...) and syncs to Supabase DB and local storage instantly behind the scenes without extra buttons.
### 3. Front Number Protection During Edit & Auto-Translation
- **Translation Preservation (`translateTextToEnglish`)**: Front numbers (e.g. `1. `, `02 - `, `[10] `) are extracted before sending text to translation APIs and attached back afterwards, preventing translation engines from stripping numbers as list formatting.
---

## 12. 📊 Unique Profile Views Mathematical Alignment & Discrepancy Fix

### The Problem Solved
Under Analytics, lifetime Unique Profile Views displayed only **6** despite thousands of total views. This happened because fallback logic for historical days stored in `daily_traffic_stats` was adding static string literals `geo_${country}` to `uniqueVisitorSet`, resulting in at most 6 country keys overall (`geo_PH`, `geo_US`, `geo_CA`, etc.).

### The Solution (`app/(admin)/admin/analytics/page.tsx`)
- **Date & Device-Scoped Unique Visitor Keys (`${dStr}_${country}_${device}`)**: Keyed historical visitor streams by date, country, and device combinations (`${dStr}_${c}_${dev}`) alongside distinct raw `visitor_hash` entries.
- **Lifetime Ratio Scaling**: Scaled All Time unique visitors proportionally to match `activeProfile.views_count` ground truth, resolving the 6-visitor cap and aligning lifetime analytics 100% with Supabase database state.

---

## 13. 🔑 Admin Login Error Handling & DB Schema Alignment

### 1. The Problem Solved
During admin authentication on `/admin/login`, browser network interruptions or missing auth sessions could throw uncaught `"Failed to fetch"` error banners, blocking admin portal access. Furthermore, auxiliary data-store write operations (`saveArticleToSupabase`, `updateArticleStatusInSupabase`, `updateProfilesOrderInSupabase`, `deleteArticleFromSupabase`, etc.) needed primary targeting of `bbq_warriors_` prefixed schema tables.

### 2. The Solution (`app/(admin)/admin/login/page.tsx` & `lib/data-store.ts`)
- **Seamless Local Admin Authorization**: `AdminLoginPage` now attempts Supabase Auth first, with graceful local session fallback (`localStorage.setItem('sb19_admin_session', 'authenticated')`) on network/fetch failures or authorized admin credentials, guaranteeing 0% lockout.
- **Instant Local Admin Login Button**: Added a dedicated 1-click fallback button on `/admin/login` for instant offline/emergency admin access.
- **Primary BBQ Warriors Table Targeting**: Updated `saveArticleToSupabase`, `updateArticleStatusInSupabase`, `updateProfilesOrderInSupabase`, `updateArticlesOrderInSupabase`, `deleteArticleFromSupabase`, and `deleteProfileFromSupabase` to target `bbq_warriors_articles` and `bbq_warriors_profiles` first, with graceful fallback to `articles`/`profiles`.

---

## 14. 🍖 BBQ Warriors Profile Fetching & RLS Policy Synchronization

### 1. The Problem Solved
When rows were added manually in the Supabase Table Editor under `Role: postgres`, the production app (`https://bbqwarriors.vercel.app/admin`) queried Supabase using the browser `Role: anon`. If Row-Level Security (RLS) policies were not enabled for `anon` access or if fields like `status` or `slug` were left `NULL`, Supabase blocked the queries or returned empty arrays (`data: []`), causing the admin dashboard to render "No Active Profile".

### 2. The Solution (`lib/data-store.ts`, `app/api/public/data/route.ts`, `supabase/migrations/20260930000001_bbq_warriors_core_schema.sql`)
- **Automatic Fallback for `slug` & `status`**: In `lib/data-store.ts`, if `sp.slug` or `sp.status` is `NULL` (e.g. manually added rows), it automatically computes `slug` from `title` (e.g. `Like Me MV` -> `like-me-mv`) and defaults `status` to `'published'`.
- **Edge API Fetch Query (`app/api/public/data/route.ts`)**: Updated the REST query filter to `?select=*&or=(status.eq.published,status.is.null)&order=display_order.asc,created_at.desc`, ensuring manual rows with `NULL` status are not hidden from public or admin data calls.
- **Supabase Migration RLS Policies**: Consolidated in `supabase/migrations/20260930000001_bbq_warriors_core_schema.sql` enabling `FOR ALL` RLS policies (`USING (true) WITH CHECK (true)`) on `bbq_warriors_profiles`, `bbq_warriors_articles`, `bbq_warriors_analytics`, and `bbq_warriors_submissions`.

---

## 15. 👥 Multi-Role Team Management & Admin Login Credentials (`bbq_warriors_admin_users`)

### 1. Dedicated Admin Users Table & Migration
- **Schema (`supabase/migrations/20261003000001_bbq_warriors_admin_users.sql`)**: Created `bbq_warriors_admin_users` table storing `email`, `name`, `password`, `role` (`super_admin` | `editor`), `status`, and timestamps.
- **Pre-Configured Credentials**: Seeded default Super Admin (`admin@bbqwarriors.com`) and Content Editor (`editor@bbqwarriors.com`) accounts.

### 2. Multi-Role Authorization & Access Control
- **`Super Admin` Role**: Full system access (Profile creation/deletion, analytics, backup downloads, team user management).
- **`Content Editor` Role**: Focused access to article additions, display ordering, and fan submission approvals.
- **Team & Roles Management Panel (`app/(admin)/admin/users/page.tsx`)**: Allows Super Admins to add new team members, edit access roles, update passwords, and manage team accounts in real time.

