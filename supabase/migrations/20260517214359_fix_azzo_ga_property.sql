-- Fix invalid GA4 property ID for Azzo Decora (was a measurement stream ID).
UPDATE public.clients SET ga_property_id = '526617116' WHERE id = '5a34fa1a-6f84-48f7-abc1-81bd1c00e99a';
