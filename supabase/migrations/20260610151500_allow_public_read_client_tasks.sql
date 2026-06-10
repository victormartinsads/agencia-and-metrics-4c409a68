-- Allow public read access to client_tasks table so shared dashboards can see the task checklist.
DROP POLICY IF EXISTS "Public read client tasks" ON public.client_tasks;
CREATE POLICY "Public read client tasks"
  ON public.client_tasks FOR SELECT TO anon, authenticated
  USING (true);
