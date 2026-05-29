-- Allow public read access to weekly_metrics, dashboard_sheet_config, and funnel_stages tables so shared dashboards can be viewed by anonymous users.

DROP POLICY IF EXISTS "Client members read weekly_metrics" ON public.weekly_metrics;
CREATE POLICY "Public read weekly_metrics" 
  ON public.weekly_metrics FOR SELECT TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Client members read dashboard_sheet_config" ON public.dashboard_sheet_config;
CREATE POLICY "Public read dashboard_sheet_config" 
  ON public.dashboard_sheet_config FOR SELECT TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Client members read funnel_stages" ON public.funnel_stages;
CREATE POLICY "Public read funnel_stages" 
  ON public.funnel_stages FOR SELECT TO anon, authenticated 
  USING (true);
