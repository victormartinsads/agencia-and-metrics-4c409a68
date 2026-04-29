ALTER TABLE public.dashboard_sheet_config
ADD COLUMN IF NOT EXISTS row_filters JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.dashboard_sheet_config.row_filters IS
  'Array of {column, operator, value} filters applied to spreadsheet rows during sync. Operators: equals, not_equals, contains, not_contains, not_empty, empty.';