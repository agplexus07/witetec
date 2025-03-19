import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrdedelhrbiafnuwbnvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZGVkZWxocmJpYWZudXdibnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MDIzMjEsImV4cCI6MjA1NzM3ODMyMX0.76HqqHwf-ID0L5yY17tbgCBbtCqdrGSQuHrT3gGRP40';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});