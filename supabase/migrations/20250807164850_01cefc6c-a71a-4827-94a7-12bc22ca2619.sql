-- Crear datos de prueba para Analytics usando solo valores válidos
-- Usar solo 'bronze' para evitar errores de constraint
INSERT INTO public.embassadors (
  first_name, 
  last_name, 
  email, 
  instagram_user, 
  organization_id,
  status,
  global_points,
  performance_status,
  events_participated,
  completed_tasks,
  failed_tasks,
  follower_count
) VALUES 
-- Embajadores de alto rendimiento
('María', 'González', 'maria.gonzalez@example.com', '@maria_glez', 
 (SELECT id FROM organizations LIMIT 1), 'active', 156, 'exclusivo', 3, 12, 1, 8500),

('Carlos', 'Rodríguez', 'carlos.rodriguez@example.com', '@carlos_rod', 
 (SELECT id FROM organizations LIMIT 1), 'active', 134, 'cumple', 2, 10, 2, 5200),

('Ana', 'Martínez', 'ana.martinez@example.com', '@ana_mart', 
 (SELECT id FROM organizations LIMIT 1), 'active', 89, 'cumple', 2, 7, 3, 3800),

-- Embajadores de rendimiento medio
('Diego', 'López', 'diego.lopez@example.com', '@diego_lp', 
 (SELECT id FROM organizations LIMIT 1), 'active', 67, 'advertencia', 1, 5, 4, 2100),

('Sofía', 'Hernández', 'sofia.hernandez@example.com', '@sofia_hdz', 
 (SELECT id FROM organizations LIMIT 1), 'active', 45, 'cumple', 1, 4, 2, 1900),

-- Embajadores de bajo rendimiento
('Luis', 'Torres', 'luis.torres@example.com', '@luis_torres', 
 (SELECT id FROM organizations LIMIT 1), 'active', 23, 'no_cumple', 1, 2, 6, 890),

('Carmen', 'Vega', 'carmen.vega@example.com', '@carmen_vg', 
 (SELECT id FROM organizations LIMIT 1), 'active', 34, 'advertencia', 1, 3, 4, 1200),

('Roberto', 'Sánchez', 'roberto.sanchez@example.com', '@rob_sanchez', 
 (SELECT id FROM organizations LIMIT 1), 'active', 78, 'cumple', 2, 6, 2, 4100);

-- Crear tareas de ejemplo para estos embajadores
WITH ambassador_event_pairs AS (
  SELECT e.id as embassador_id, ev.id as event_id
  FROM embassadors e 
  CROSS JOIN events ev
  WHERE e.organization_id = (SELECT id FROM organizations LIMIT 1)
    AND ev.fiesta_id = (SELECT id FROM fiestas LIMIT 1)
)
INSERT INTO public.tasks (
  embassador_id,
  event_id,
  task_type,
  status,
  points_earned,
  reach_count,
  engagement_score,
  created_at,
  upload_time,
  platform
) 
SELECT 
  embassador_id,
  event_id,
  'story' as task_type,
  CASE WHEN random() < 0.6 THEN 'completed'
       WHEN random() < 0.8 THEN 'pending'
       ELSE 'invalid' END as status,
  CASE WHEN random() < 0.6 THEN floor(random() * 3 + 2)
       ELSE 0 END as points_earned,
  floor(random() * 2000 + 100) as reach_count,
  random() * 10 as engagement_score,
  now() - (random() * interval '30 days') as created_at,
  now() - (random() * interval '25 days') as upload_time,
  'instagram'
FROM ambassador_event_pairs
CROSS JOIN generate_series(1, 3); -- 3 tareas por embajador

-- Actualizar estadísticas reales basadas en las tareas creadas
UPDATE embassadors 
SET 
  completed_tasks = (
    SELECT COUNT(*) 
    FROM tasks t 
    WHERE t.embassador_id = embassadors.id 
    AND t.status = 'completed'
  ),
  failed_tasks = (
    SELECT COUNT(*) 
    FROM tasks t 
    WHERE t.embassador_id = embassadors.id 
    AND t.status = 'invalid'
  ),
  global_points = (
    SELECT COALESCE(SUM(t.points_earned), 0)
    FROM tasks t 
    WHERE t.embassador_id = embassadors.id 
    AND t.status = 'completed'
  )
WHERE organization_id = (SELECT id FROM organizations LIMIT 1);