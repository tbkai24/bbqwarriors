/**
 * Supabase Browser Client Factory
 * -------------------------------------------------------------------
 * Creates an instance of the Supabase client specifically for Browser / Client-Side components.
 * Uses `@supabase/ssr` to maintain consistent cookie and session handling across client and server.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.includes('cnvxdxltwpwmnrfqvpqq'))
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
