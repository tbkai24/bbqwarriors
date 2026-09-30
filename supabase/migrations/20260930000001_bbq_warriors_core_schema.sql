-- =========================================================================
-- BBQ WARRIORS DATABASE SCHEMA (supabase/migrations/01_bbq_warriors_core_schema.sql)
-- Custom Schema for Josh Cullen & BBQ Warriors Multi-Media Hub
-- Features: BBQ Warriors unique columns, embedded YouTube MVs, official Spotify & YouTube links
-- Zero overlap with legacy `yt_streamers` or standard `profiles` tables.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stream Type Enum
DO $$ BEGIN
    CREATE TYPE bbq_warriors_stream_type_enum AS ENUM (
        'embedded_youtube_mv',  -- Embedded YouTube Music Video
        'spotify_playlist',     -- Official Spotify Playlist
        'spotify_track',        -- Official Spotify Track Single
        'youtube_live',         -- YouTube Live Streamer
        'verified_article'      -- Verified Media Article Embed
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. BBQ WARRIORS PROFILES TABLE (bbq_warriors_profiles)
CREATE TABLE IF NOT EXISTS public.bbq_warriors_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_warrior_id VARCHAR(64) UNIQUE NOT NULL DEFAULT 'bbq-josh-cullen-001',
    josh_cullen_artist_id VARCHAR(100) DEFAULT '6m0jT2QZ6qVb20eX2',
    title TEXT NOT NULL DEFAULT 'BBQ Warriors',
    slug TEXT UNIQUE NOT NULL DEFAULT 'like-me-mv',
    description TEXT,
    
    -- Official Links & Media Embeds
    official_spotify_playlist_url TEXT DEFAULT 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    official_spotify_track_url TEXT DEFAULT 'https://open.spotify.com/track/0e88kM3uV65lRj0S94a73z',
    embedded_youtube_mv_url TEXT DEFAULT 'https://www.youtube.com/watch?v=zPcaHffi1Z0',
    official_youtube_channel_url TEXT DEFAULT 'https://www.youtube.com/@JoshCullenOfficial',
    featured_video_url TEXT DEFAULT 'https://www.youtube.com/watch?v=zPcaHffi1Z0',
    youtube_url TEXT DEFAULT 'https://www.youtube.com/watch?v=zPcaHffi1Z0',
    facebook_url TEXT,
    instagram_url TEXT DEFAULT 'https://www.instagram.com/bbq.warriors/',
    x_url TEXT DEFAULT 'https://x.com/bbqwarriors',
    threads_url TEXT DEFAULT 'https://www.threads.com/@bbq.warriors',
    website_url TEXT,
    custom_social_links JSONB DEFAULT '[]'::jsonb,
    
    -- Badges & Display Configurations
    bbq_warrior_badge TEXT DEFAULT 'BBBQ Warriors',
    accent_color TEXT DEFAULT '#e11d48',
    theme TEXT DEFAULT 'dark',
    cover_image TEXT,
    profile_image TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    profile_type TEXT DEFAULT 'embed',
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all extended columns exist
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS custom_social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS x_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS threads_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS featured_video_url TEXT;
ALTER TABLE public.bbq_warriors_profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'embed';

-- 2. BBQ WARRIORS ARTICLES TABLE (bbq_warriors_articles)
CREATE TABLE IF NOT EXISTS public.bbq_warriors_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_profile_id UUID NOT NULL REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    article_url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    website_name TEXT NOT NULL,
    
    stream_type TEXT DEFAULT 'embedded_youtube_mv',
    embedded_youtube_mv_id VARCHAR(100),
    embedded_spotify_id VARCHAR(100),
    thumbnail TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    
    clicks_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BBQ WARRIORS SUBMISSIONS TABLE (bbq_warriors_submissions)
CREATE TABLE IF NOT EXISTS public.bbq_warriors_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
    article_url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    website_name TEXT,
    title TEXT,
    thumbnail TEXT,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate', 'archived')),
    submitted_by_name TEXT DEFAULT 'Community Fan',
    submitted_by_email TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BBQ WARRIORS ANALYTICS EVENTS (bbq_warriors_analytics)
CREATE TABLE IF NOT EXISTS public.bbq_warriors_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_profile_id UUID REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
    bbq_article_id UUID REFERENCES public.bbq_warriors_articles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    visitor_hash TEXT,
    country TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bbq_warriors_slug ON public.bbq_warriors_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_bbq_warrior_id ON public.bbq_warriors_profiles(bbq_warrior_id);
CREATE INDEX IF NOT EXISTS idx_bbq_articles_profile_id ON public.bbq_warriors_articles(bbq_profile_id);
CREATE INDEX IF NOT EXISTS idx_bbq_submissions_profile_id ON public.bbq_warriors_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_bbq_analytics_profile_id ON public.bbq_warriors_analytics(bbq_profile_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.bbq_warriors_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_submissions" ON public.bbq_warriors_submissions;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics;

CREATE POLICY "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_submissions" ON public.bbq_warriors_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics FOR ALL USING (true) WITH CHECK (true);
