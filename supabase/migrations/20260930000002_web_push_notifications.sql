-- =========================================================================
-- BBQ WARRIORS PUSH NOTIFICATIONS SCHEMA (supabase/migrations/02_web_push_notifications.sql)
-- Web Push Subscription Registry & Targeted Notification Broadcasts
-- =========================================================================

-- 1. Notifications History & Broadcast Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.bbq_warriors_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  url TEXT DEFAULT '/',
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Push Subscriptions Table (VAPID Browser Device Tokens)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  keys JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public read subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow all access to subscriptions" ON public.push_subscriptions;

CREATE POLICY "Allow all access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to subscriptions" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);
