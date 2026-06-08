import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://igfftgrhpuemegqjqhnv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZmZ0Z3JocHVlbWVncWpxaG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MzIxOTQsImV4cCI6MjA5MTQwODE5NH0.rE8zsE96nKY8XtGbyyXWPJV1fXxpJ5m9r6fsDmq59Bw'
);

async function main() {
  const { data, error } = await sb
    .from('saved_diagnostics')
    .select('id, title, created_at, client_id')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching diagnostics:', error);
  } else {
    console.log('Recent saved diagnostics:');
    data.forEach(d => console.log(`- ${d.created_at}: ${d.title} (client: ${d.client_id})`));
  }
}

main();
