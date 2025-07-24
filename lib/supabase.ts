import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utvolelclhzesimpwbrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dm9sZWxjbGh6ZXNpbXB3YnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTU4MTcsImV4cCI6MjA2NzY5MTgxN30.M2d3R611-y_t26xsN3R6-Y0uf5bRVRDni16-m2mF1tY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

console.log('🔧 Supabase client initialized with URL:', SUPABASE_URL); 