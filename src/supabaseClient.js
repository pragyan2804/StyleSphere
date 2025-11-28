import { createClient } from '@supabase/supabase-js'

// Use Vite env vars (VITE_ prefix). These are replaced at build time.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mkguhkuoqlzlennkhlzv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ3Voa3VvcWx6bGVubmtobHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzI2ODgsImV4cCI6MjA3NzIwODY4OH0.LnqRZzKh0Vs7nJrMaBjfkDXtiD3kWDT0g0CgKTAPeeM';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;