-- Add new metric columns to weekly_metrics
ALTER TABLE public.weekly_metrics
  ADD COLUMN IF NOT EXISTS investment numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_ticket_meta integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_ticket_google integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS qualified_messages integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qualified_followers integer DEFAULT 0;

-- Add corresponding column mappings to client_sheets_config
ALTER TABLE public.client_sheets_config
  ADD COLUMN IF NOT EXISTS column_investment text,
  ADD COLUMN IF NOT EXISTS column_leads text,
  ADD COLUMN IF NOT EXISTS column_low_ticket_meta text,
  ADD COLUMN IF NOT EXISTS column_low_ticket_google text,
  ADD COLUMN IF NOT EXISTS column_product_code text,
  ADD COLUMN IF NOT EXISTS column_qualified_messages text,
  ADD COLUMN IF NOT EXISTS column_qualified_followers text,
  ADD COLUMN IF NOT EXISTS monthly_revenue_goal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_investment_budget numeric DEFAULT 0;