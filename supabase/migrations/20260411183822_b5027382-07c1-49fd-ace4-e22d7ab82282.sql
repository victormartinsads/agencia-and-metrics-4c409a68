
ALTER TABLE public.clients ADD COLUMN slug text UNIQUE;

UPDATE public.clients SET slug = 
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[àáâãäå]', 'a', 'gi'),
            '[èéêë]', 'e', 'gi'),
          '[ìíîï]', 'i', 'gi'),
        '[òóôõö]', 'o', 'gi'),
      '[ùúûü]', 'u', 'gi')
  );

UPDATE public.clients SET slug = 
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(slug, '[^a-z0-9\s-]', '', 'g'), '[\s]+', '-', 'g'));

UPDATE public.clients SET slug = TRIM(BOTH '-' FROM slug);

ALTER TABLE public.clients ALTER COLUMN slug SET NOT NULL;
