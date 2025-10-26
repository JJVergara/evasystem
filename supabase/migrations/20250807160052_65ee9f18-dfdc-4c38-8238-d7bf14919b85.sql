-- Limpieza de organizaciones duplicadas
-- Mantener solo la organización más reciente por usuario
DELETE FROM organizations 
WHERE id NOT IN (
  SELECT DISTINCT ON (created_by) id
  FROM organizations 
  ORDER BY created_by, created_at DESC
);

-- Verificar que fiestas estén asociadas a organizaciones válidas
UPDATE fiestas 
SET organization_id = (
  SELECT id FROM organizations WHERE created_by = '3b790b1f-8a3c-4ff0-bf54-daa45bc8e164' LIMIT 1
)
WHERE organization_id NOT IN (SELECT id FROM organizations);

-- Verificar que embajadores estén asociados a organizaciones válidas  
UPDATE embassadors 
SET organization_id = (
  SELECT id FROM organizations WHERE created_by = '3b790b1f-8a3c-4ff0-bf54-daa45bc8e164' LIMIT 1
)
WHERE organization_id NOT IN (SELECT id FROM organizations);