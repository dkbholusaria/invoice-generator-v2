import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ghopqvolqzwmimcrrkry.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdob3Bxdm9scXp3bWltY3Jya3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MjQzMzQsImV4cCI6MjA3MjIwMDMzNH0.rVAbQe2cV1LuAgNDpkgOdSIHMMlTEzl0nSKYA-v2U-U"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
