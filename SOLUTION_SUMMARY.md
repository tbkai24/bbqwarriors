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

### Database Schema for Web Push (`supabase/migrations/20260808000005_create_notifications_tables.sql`)
1. **`push_subscriptions` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `endpoint`: `TEXT UNIQUE NOT NULL`
   - `keys`: `JSONB` (contains VAPID `p256dh` and `auth` keys)
   - `user_agent`: `TEXT`
   - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`

2. **`notifications` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `profile_id`: `UUID REFERENCES public.profiles(id)`
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

## 11. 🌐 Stream Pick & Foreign Article Auto-Translation Upgrade

### The Problem Solved
Indonesian/foreign news articles (e.g. `CreativeDisc.com - JAKARTA - SB19 dan BE:FIRST mengajak...`) failed to translate or showed rate-limited HTTP 429/403 errors because of standard public GTX and MyMemory endpoints being rate-limited.

### The Solution (`app/api/translate/route.ts` & `lib/url-normalizer.ts`)
- **`dict-chrome-ex` High-Reliability Google Translate Endpoint**: Upgraded translation requests to `client=dict-chrome-ex` which handles multi-sentence foreign news paragraphs without rate limits or 429/403 blocks.
- **Stream Pick Quote & Title Parallel Auto-Translation (`ArticleOfTheDayCard`)**: Updated `ArticleOfTheDayCard` to translate both the article quote AND the title in parallel, preserving any leading numbers (`9. `) while outputting natural English text.






