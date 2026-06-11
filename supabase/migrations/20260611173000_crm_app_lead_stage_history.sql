-- Add stage_history jsonb column to public.leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '{}'::jsonb;

-- Trigger function to update stage_history on insert/update of stage_id
CREATE OR REPLACE FUNCTION public.update_lead_stage_history()
RETURNS TRIGGER AS $$
BEGIN
  -- If stage_history is NULL, initialize it
  IF NEW.stage_history IS NULL THEN
    NEW.stage_history := '{}'::jsonb;
  END IF;

  -- If it's a new lead, or the stage_id has changed, log the timestamp
  IF (TG_OP = 'INSERT' AND NEW.stage_id IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id)) THEN
    NEW.stage_history := NEW.stage_history || jsonb_build_object(NEW.stage_id::text, now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_update_lead_stage_history ON public.leads;
CREATE TRIGGER trg_update_lead_stage_history
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_stage_history();

-- Backfill existing leads stage_history using created_at
UPDATE public.leads 
SET stage_history = jsonb_build_object(stage_id::text, created_at)
WHERE stage_id IS NOT NULL AND (stage_history IS NULL OR stage_history = '{}'::jsonb);
