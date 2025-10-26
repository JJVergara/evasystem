
-- Eliminar todas las tablas existentes (en orden para evitar errores de dependencias)
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS event_logs CASCADE;
DROP TABLE IF EXISTS import_logs CASCADE;
DROP TABLE IF EXISTS meta_sync_logs CASCADE;
DROP TABLE IF EXISTS social_insights CASCADE;
DROP TABLE IF EXISTS social_pages CASCADE;
DROP TABLE IF EXISTS instagram_profiles CASCADE;
DROP TABLE IF EXISTS story_links CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS leaderboards CASCADE;
DROP TABLE IF EXISTS embassador_events CASCADE;
DROP TABLE IF EXISTS event_checklists CASCADE;
DROP TABLE IF EXISTS event_instagram_accounts CASCADE;
DROP TABLE IF EXISTS event_phases CASCADE;
DROP TABLE IF EXISTS invitation_tokens CASCADE;
DROP TABLE IF EXISTS user_organization_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS embassadors CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS generate_auto_cards_for_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_event_log(uuid, uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_feedback_card(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Eliminar tipos personalizados existentes
DROP TYPE IF EXISTS embassador_category CASCADE;
DROP TYPE IF EXISTS embassador_status CASCADE;
DROP TYPE IF EXISTS performance_status CASCADE;
DROP TYPE IF EXISTS checklist_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS cyclic_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_type CASCADE;
DROP TYPE IF EXISTS import_status CASCADE;
DROP TYPE IF EXISTS import_source CASCADE;
DROP TYPE IF EXISTS import_type CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS target_type CASCADE;

-- PASO 1: Crear estructura básica para organizaciones
-- Una organización representa una productora de eventos
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS para organizaciones
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden crear organizaciones
CREATE POLICY "Users can create organizations" 
ON organizations FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Los usuarios pueden ver solo las organizaciones que crearon
CREATE POLICY "Users can view own organizations" 
ON organizations FOR SELECT 
USING (auth.uid() = created_by);

-- Los usuarios pueden actualizar solo las organizaciones que crearon
CREATE POLICY "Users can update own organizations" 
ON organizations FOR UPDATE 
USING (auth.uid() = created_by);

-- PASO 2: Crear tabla de usuarios del sistema (perfil extendido)
-- Esto complementa auth.users con información específica del sistema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para usuarios
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden crear su propio perfil
CREATE POLICY "Users can create own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = auth_user_id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = auth_user_id);

-- PASO 3: Crear tabla de eventos/fiestas
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Habilitar RLS para eventos
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Solo los usuarios pueden crear eventos para sus organizaciones
CREATE POLICY "Users can create events for own organization" 
ON events FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Los usuarios pueden ver eventos de sus organizaciones
CREATE POLICY "Users can view own organization events" 
ON events FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Los usuarios pueden actualizar eventos de sus organizaciones
CREATE POLICY "Users can update own organization events" 
ON events FOR UPDATE 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- PASO 4: Crear tabla básica de embajadores
CREATE TABLE embassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  instagram_user TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active'
);

-- Habilitar RLS para embajadores
ALTER TABLE embassadors ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden crear embajadores para sus organizaciones
CREATE POLICY "Users can create embassadors for own organization" 
ON embassadors FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Los usuarios pueden ver embajadores de sus organizaciones
CREATE POLICY "Users can view own organization embassadors" 
ON embassadors FOR SELECT 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);

-- Los usuarios pueden actualizar embajadores de sus organizaciones
CREATE POLICY "Users can update own organization embassadors" 
ON embassadors FOR UPDATE 
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE created_by = auth.uid()
  )
);
