-- =========================================================================
-- BBQ WARRIORS DATABASE SCHEMA (supabase/bbqwarrior.sql & schema/bbqwarrior.sql)
-- Custom Schema for Josh Cullen & BBQ Warriors Multi-Media Hub
-- Features: BBQ Warriors unique columns, embedded YouTube MVs, official Spotify & YouTube links
-- Zero overlap with legacy `yt_streamers` or standard `profiles` tables.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- BBQ Warriors Stream Type Enum
CREATE TYPE bbq_warriors_stream_type_enum AS ENUM (
    'embedded_youtube_mv',  -- Embedded YouTube Music Video
    'spotify_playlist',     -- Official Spotify Playlist
    'spotify_track',        -- Official Spotify Track Single
    'youtube_live',         -- YouTube Live Streamer
    'verified_article'      -- Verified Media Article Embed
);

-- 1. BBQ WARRIORS PROFILES TABLE (bbq_warriors_profiles)
-- Unique columns dedicated to Josh Cullen & BBQ Warriors
CREATE TABLE IF NOT EXISTS public.bbq_warriors_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_warrior_id VARCHAR(64) UNIQUE NOT NULL DEFAULT 'bbq-josh-cullen-001',  -- Unique BBQ Warrior ID
    josh_cullen_artist_id VARCHAR(100) DEFAULT '6m0jT2QZ6qVb20eX2',             -- Spotify Artist ID for Josh Cullen
    title TEXT NOT NULL DEFAULT 'BBQ Warriors',
    slug TEXT UNIQUE NOT NULL DEFAULT 'josh-cullen',
    description TEXT DEFAULT 'Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.',
    
    -- Official Links & Media Embeds
    official_spotify_playlist_url TEXT DEFAULT 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    official_spotify_track_url TEXT DEFAULT 'https://open.spotify.com/track/0e88kM3uV65lRj0S94a73z',
    embedded_youtube_mv_url TEXT DEFAULT 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    official_youtube_channel_url TEXT DEFAULT 'https://www.youtube.com/@JoshCullenOfficial',
    
    -- Badges & Display Configurations
    bbq_warrior_badge TEXT DEFAULT 'BBBQ Warriors',
    accent_color TEXT DEFAULT '#f97316',               -- BBQ Flame Orange / Spotify Green
    theme TEXT DEFAULT 'dark',
    cover_image TEXT,
    profile_image TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BBQ WARRIORS ARTICLES TABLE (bbq_warriors_articles)
-- Stores verified articles, embedded YouTube MVs, and Spotify streaming links
CREATE TABLE IF NOT EXISTS public.bbq_warriors_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_profile_id UUID NOT NULL REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                               -- Article / Stream Title
    article_url TEXT NOT NULL,                         -- Article URL
    canonical_url TEXT NOT NULL,                       -- Canonical Link
    website_name TEXT NOT NULL,                        -- Publisher / Media Source
    
    -- Multi-Media Unique Fields
    stream_type bbq_warriors_stream_type_enum DEFAULT 'embedded_youtube_mv',
    embedded_youtube_mv_id VARCHAR(100),              -- e.g. YouTube Video ID
    embedded_spotify_id VARCHAR(100),                 -- e.g. Spotify Track/Playlist ID
    thumbnail TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    
    clicks_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BBQ WARRIORS ANALYTICS EVENTS (bbq_warriors_analytics)
CREATE TABLE IF NOT EXISTS public.bbq_warriors_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbq_profile_id UUID REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
    bbq_article_id UUID REFERENCES public.bbq_warriors_articles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'mv_click', 'spotify_stream_click')),
    visitor_hash TEXT,
    country TEXT,
    device TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bbq_warriors_slug ON public.bbq_warriors_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_bbq_warrior_id ON public.bbq_warriors_profiles(bbq_warrior_id);
CREATE INDEX IF NOT EXISTS idx_bbq_articles_profile_id ON public.bbq_warriors_articles(bbq_profile_id);

-- RLS POLICIES
ALTER TABLE public.bbq_warriors_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published BBQ Warriors profiles" ON public.bbq_warriors_profiles FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view published BBQ Warriors articles" ON public.bbq_warriors_articles FOR SELECT USING (status = 'published');
CREATE POLICY "Public can log BBQ analytics" ON public.bbq_warriors_analytics FOR INSERT WITH CHECK (true);

-- SEED DATA FOR JOSH CULLEN & BBQ WARRIORS
INSERT INTO public.bbq_warriors_profiles (
    bbq_warrior_id, 
    josh_cullen_artist_id, 
    title, 
    slug, 
    description,
    official_spotify_playlist_url,
    official_spotify_track_url,
    embedded_youtube_mv_url,
    official_youtube_channel_url,
    bbq_warrior_badge
) VALUES (
    'bbq-josh-cullen-001',
    '6m0jT2QZ6qVb20eX2',
    'BBQ Warriors',
    'josh-cullen',
    'Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.',
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/track/0e88kM3uV65lRj0S94a73z',
    'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    'https://www.youtube.com/@JoshCullenOfficial',
    'BBBQ Warriors'
) ON CONFLICT (slug) DO UPDATE SET 
    description = EXCLUDED.description,
    bbq_warrior_badge = EXCLUDED.bbq_warrior_badge;
