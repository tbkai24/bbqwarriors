-- =========================================================================
-- BBQ WARRIORS ADMIN USERS & ROLES MIGRATION
-- (supabase/migrations/20261003000001_bbq_warriors_admin_users.sql)
-- Features: Multi-Role Team Management (Super Admin & Editor)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.bbq_warriors_admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'admin123',
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin', 'editor')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bbq_admin_users_email ON public.bbq_warriors_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_bbq_admin_users_role ON public.bbq_warriors_admin_users(role);

ALTER TABLE public.bbq_warriors_admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for bbq_warriors_admin_users" ON public.bbq_warriors_admin_users;
CREATE POLICY "Enable all for bbq_warriors_admin_users" ON public.bbq_warriors_admin_users FOR ALL USING (true) WITH CHECK (true);

-- Seed default Super Admin & Content Editor accounts if not present
INSERT INTO public.bbq_warriors_admin_users (email, name, password, role, status)
VALUES 
  ('admin@bbqwarriors.com', 'Super Admin', 'admin123', 'super_admin', 'active'),
  ('editor@bbqwarriors.com', 'Content Editor', 'editor123', 'editor', 'active')
ON CONFLICT (email) DO NOTHING;
