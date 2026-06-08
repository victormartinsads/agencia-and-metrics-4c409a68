import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://pspkpqwfkgpsjgerxogm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcGtwcXdma2dwc2pnZXJ4b2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzIxOTQsImV4cCI6MjA5MTQwODE5NH0.ZpB_x93yA-Oq5o-yXvB2-uQy09-N8X_H2Yn0m49-c1A');

async function main() {
  const { data, error } = await sb
    .from('saved_diagnostics')
    .select('id, title, created_at, client_id')
    .order('created_at', {ascending: false})
    .limit(10);
    
  console.log(data, error);
}

main();
