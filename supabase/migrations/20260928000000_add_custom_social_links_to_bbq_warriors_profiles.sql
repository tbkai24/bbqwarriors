-- =========================================================================
-- BBQ WARRIORS MIGRATION: ADD MISSING COLUMNS, ISOLATED SUBMISSIONS & RLS POLICIES
-- (Run this SQL script in your Supabase SQL Editor to update schema cache)
-- =========================================================================

-- 1. Remove rigid default constraint on bbq_warrior_id to allow dynamic profile creation
ALTER TABLE public.bbq_warriors_profiles ALTER COLUMN bbq_warrior_id DROP DEFAULT;
ALTER TABLE public.bbq_warriors_profiles DROP CONSTRAINT IF EXISTS bbq_warriors_profiles_bbq_warrior_id_key;

-- 2. Add missing extended columns to bbq_warriors_profiles
ALTER TABLE public.bbq_warriors_profiles 
ADD COLUMN IF NOT EXISTS custom_social_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS support_qr_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS x_url TEXT,
ADD COLUMN IF NOT EXISTS threads_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS featured_video_url TEXT,
ADD COLUMN IF NOT EXISTS support_qr_image TEXT,
ADD COLUMN IF NOT EXISTS support_title TEXT,
ADD COLUMN IF NOT EXISTS support_note TEXT,
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'embed';

-- 3. Create isolated bbq_warriors_submissions table
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

-- 4. Enable ALL (SELECT, INSERT, UPDATE, DELETE) RLS policies for client operations
DROP POLICY IF EXISTS "Public can view published BBQ Warriors profiles" ON public.bbq_warriors_profiles;
DROP POLICY IF EXISTS "Public can view published BBQ Warriors articles" ON public.bbq_warriors_articles;
DROP POLICY IF EXISTS "Public can log BBQ analytics" ON public.bbq_warriors_analytics;

DROP POLICY IF EXISTS "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_submissions" ON public.bbq_warriors_submissions;

ALTER TABLE public.bbq_warriors_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bbq_warriors_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_submissions" ON public.bbq_warriors_submissions FOR ALL USING (true) WITH CHECK (true);

-- 5. Delete seed profile from table if present
DELETE FROM public.bbq_warriors_profiles WHERE slug = 'josh-cullen' OR title = 'BBQ Warriors';

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
