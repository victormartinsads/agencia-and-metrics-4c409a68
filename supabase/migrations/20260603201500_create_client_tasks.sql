CREATE TABLE IF NOT EXISTS public.client_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage client tasks"
ON public.client_tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
