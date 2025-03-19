import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrdedelhrbiafnuwbnvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGVkZWxocmJpYWZudXdibnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MDIzMjEsImV4cCI6MjA1NzM3ODMyMX0.76HqqHwf-ID0L5yY17tbgCBbtCqdrGSQuHrT3gGRP40';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      }
    }
  }
});

// Initialize session from localStorage if available
if (typeof window !== 'undefined') {
  const token = window.localStorage.getItem('token');
  if (token) {
    supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    });
  }
}
