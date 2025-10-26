-- Habilitar RLS en tablas que lo necesitan
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_links ENABLE ROW LEVEL SECURITY;

-- Corregir funciones con search_path
CREATE OR REPLACE FUNCTION public.create_event_log(
  p_user_id uuid,
  p_event_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.event_logs (user_id, event_id, action, details)
  VALUES (p_user_id, p_event_id, p_action, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_feedback_card(
  p_user_id uuid,
  p_event_id uuid,
  p_type text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.cards (user_id, event_id, type, message)
  VALUES (p_user_id, p_event_id, p_type, p_message);
END;
$$;

-- Políticas básicas para tablas sin RLS
CREATE POLICY "Public read access" ON public.instagram_profiles FOR SELECT USING (true);
CREATE POLICY "System can manage instagram profiles" ON public.instagram_profiles FOR ALL USING (true);

CREATE POLICY "System can manage meta sync logs" ON public.meta_sync_logs FOR ALL USING (true);

CREATE POLICY "System can manage social insights" ON public.social_insights FOR ALL USING (true);

CREATE POLICY "System can manage social pages" ON public.social_pages FOR ALL USING (true);

CREATE POLICY "System can manage story links" ON public.story_links FOR ALL USING (true);