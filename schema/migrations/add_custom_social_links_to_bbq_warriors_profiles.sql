-- =========================================================================
-- BBQ WARRIORS MIGRATION: ADD MISSING COLUMNS, ENABLE DELETE & RLS POLICIES
-- (Run this SQL script in your Supabase SQL Editor to enable deletes & cache reload)
-- =========================================================================

-- 1. Add missing extended columns to bbq_warriors_profiles
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

-- 2. Enable ALL (SELECT, INSERT, UPDATE, DELETE) RLS policies for client operations
DROP POLICY IF EXISTS "Public can view published BBQ Warriors profiles" ON public.bbq_warriors_profiles;
DROP POLICY IF EXISTS "Public can view published BBQ Warriors articles" ON public.bbq_warriors_articles;
DROP POLICY IF EXISTS "Public can log BBQ analytics" ON public.bbq_warriors_analytics;

DROP POLICY IF EXISTS "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles;
DROP POLICY IF EXISTS "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics;

CREATE POLICY "Enable all for bbq_warriors_profiles" ON public.bbq_warriors_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_articles" ON public.bbq_warriors_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for bbq_warriors_analytics" ON public.bbq_warriors_analytics FOR ALL USING (true) WITH CHECK (true);

-- 3. Delete seed profile from table
DELETE FROM public.bbq_warriors_profiles WHERE slug = 'josh-cullen' OR title = 'BBQ Warriors';

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
