import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client initialization for API routes and server pages
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  // Load environment variables for Supabase connection
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.includes('cnvxdxltwpwmnrfqvpqq'))
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 50)
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw';

  // Return server client with cookie management
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Handled safely during server component rendering
        }
      },
    },
  });
}
