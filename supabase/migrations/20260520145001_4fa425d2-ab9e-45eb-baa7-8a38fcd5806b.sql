
-- =========================================================
-- CLIENTS TABLE: column-level anon access + admin/editor writes
-- =========================================================
DROP POLICY IF EXISTS "Anyone can select clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

-- Allow row-level read; column privileges below restrict what anon may select.
CREATE POLICY "Public can read safe client columns"
  ON public.clients FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read clients"
  ON public.clients FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'editor'::app_role));

-- Column-level privileges: anon may only read safe columns.
REVOKE SELECT ON public.clients FROM anon;
GRANT SELECT (id, name, slug, currency_symbol, visible_tabs, logo_url)
  ON public.clients TO anon;

-- =========================================================
-- CLIENT_SHEETS: remove anon read, scope writes to admin/editor
-- =========================================================
DROP POLICY IF EXISTS "Public read client_sheets" ON public.client_sheets;
DROP POLICY IF EXISTS "Auth manage client_sheets" ON public.client_sheets;

CREATE POLICY "Admin/editor manage client_sheets"
  ON public.client_sheets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read own client_sheets"
  ON public.client_sheets FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- DASHBOARD_SHEET_CONFIG: admin/editor only + client own read
-- =========================================================
DROP POLICY IF EXISTS "Auth select dashboard_sheet_config" ON public.dashboard_sheet_config;
DROP POLICY IF EXISTS "Auth insert dashboard_sheet_config" ON public.dashboard_sheet_config;
DROP POLICY IF EXISTS "Auth update dashboard_sheet_config" ON public.dashboard_sheet_config;
DROP POLICY IF EXISTS "Auth delete dashboard_sheet_config" ON public.dashboard_sheet_config;

CREATE POLICY "Admin/editor manage dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- DIAGNOSTIC_METRICS_CONFIG: remove anon, scope writes
-- =========================================================
DROP POLICY IF EXISTS "Public can view diagnostic_metrics_config" ON public.diagnostic_metrics_config;
DROP POLICY IF EXISTS "Auth select diagnostic_metrics_config" ON public.diagnostic_metrics_config;
DROP POLICY IF EXISTS "Auth insert diagnostic_metrics_config" ON public.diagnostic_metrics_config;
DROP POLICY IF EXISTS "Auth update diagnostic_metrics_config" ON public.diagnostic_metrics_config;
DROP POLICY IF EXISTS "Auth delete diagnostic_metrics_config" ON public.diagnostic_metrics_config;

CREATE POLICY "Admin/editor manage diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- CREATIVE_METRIC_OVERRIDES: admin/editor only
-- =========================================================
DROP POLICY IF EXISTS "Auth select creative_metric_overrides" ON public.creative_metric_overrides;
DROP POLICY IF EXISTS "Auth insert creative_metric_overrides" ON public.creative_metric_overrides;
DROP POLICY IF EXISTS "Auth update creative_metric_overrides" ON public.creative_metric_overrides;
DROP POLICY IF EXISTS "Auth delete creative_metric_overrides" ON public.creative_metric_overrides;

CREATE POLICY "Admin/editor manage creative_metric_overrides"
  ON public.creative_metric_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read creative_metric_overrides"
  ON public.creative_metric_overrides FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- FUNNEL_STAGES: admin/editor manage + client own read
-- =========================================================
DROP POLICY IF EXISTS "Auth select funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Auth insert funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Auth update funnel_stages" ON public.funnel_stages;
DROP POLICY IF EXISTS "Auth delete funnel_stages" ON public.funnel_stages;

CREATE POLICY "Admin/editor manage funnel_stages"
  ON public.funnel_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read funnel_stages"
  ON public.funnel_stages FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- FUNNEL_NOTES: admin/editor + client own
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read funnel notes" ON public.funnel_notes;
DROP POLICY IF EXISTS "Authenticated users can insert funnel notes" ON public.funnel_notes;
DROP POLICY IF EXISTS "Authenticated users can update funnel notes" ON public.funnel_notes;
DROP POLICY IF EXISTS "Authenticated users can delete funnel notes" ON public.funnel_notes;

CREATE POLICY "Admin/editor manage funnel_notes"
  ON public.funnel_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read funnel_notes"
  ON public.funnel_notes FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- SALES_EVENTS: remove broad auth, keep admin/editor + client own
-- =========================================================
DROP POLICY IF EXISTS "Auth select sales_events" ON public.sales_events;
DROP POLICY IF EXISTS "Auth insert sales_events" ON public.sales_events;
DROP POLICY IF EXISTS "Auth update sales_events" ON public.sales_events;
DROP POLICY IF EXISTS "Auth delete sales_events" ON public.sales_events;

CREATE POLICY "Admin/editor manage sales_events"
  ON public.sales_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read sales_events"
  ON public.sales_events FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- WEEKLY_METRICS: admin/editor + client own read
-- =========================================================
DROP POLICY IF EXISTS "Auth select weekly_metrics" ON public.weekly_metrics;
DROP POLICY IF EXISTS "Auth insert weekly_metrics" ON public.weekly_metrics;
DROP POLICY IF EXISTS "Auth update weekly_metrics" ON public.weekly_metrics;
DROP POLICY IF EXISTS "Auth delete weekly_metrics" ON public.weekly_metrics;

CREATE POLICY "Admin/editor manage weekly_metrics"
  ON public.weekly_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read weekly_metrics"
  ON public.weekly_metrics FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

-- =========================================================
-- SAVED_INSIGHTS: admin/editor + client own read
-- =========================================================
DROP POLICY IF EXISTS "Auth select saved_insights" ON public.saved_insights;
DROP POLICY IF EXISTS "Auth insert saved_insights" ON public.saved_insights;
DROP POLICY IF EXISTS "Auth update saved_insights" ON public.saved_insights;
DROP POLICY IF EXISTS "Auth delete saved_insights" ON public.saved_insights;

CREATE POLICY "Admin/editor manage saved_insights"
  ON public.saved_insights FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Client members read saved_insights"
  ON public.saved_insights FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));
