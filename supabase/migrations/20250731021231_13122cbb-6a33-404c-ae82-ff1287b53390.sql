-- Crear tabla profiles para datos extendidos de usuarios
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone text,
  social_links jsonb DEFAULT '{}',
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Crear tabla cards para feedback UX
CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
  message text NOT NULL,
  read_status boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear tabla event_logs para historial de acciones
CREATE TABLE public.event_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Políticas para cards
CREATE POLICY "Users can view their own cards" 
ON public.cards 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "System can create cards" 
ON public.cards 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own cards" 
ON public.cards 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Políticas para event_logs
CREATE POLICY "Users can view org event logs" 
ON public.event_logs 
FOR SELECT 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can create event logs" 
ON public.event_logs 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear logs automáticamente
CREATE OR REPLACE FUNCTION public.create_event_log(
  p_user_id uuid,
  p_event_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.event_logs (user_id, event_id, action, details)
  VALUES (p_user_id, p_event_id, p_action, p_details);
END;
$$;

-- Función para crear cards de feedback
CREATE OR REPLACE FUNCTION public.create_feedback_card(
  p_user_id uuid,
  p_event_id uuid,
  p_type text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cards (user_id, event_id, type, message)
  VALUES (p_user_id, p_event_id, p_type, p_message);
END;
$$;