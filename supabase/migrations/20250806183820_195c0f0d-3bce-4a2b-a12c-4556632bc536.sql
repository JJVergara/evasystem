
-- Limpiar todas las tablas para empezar desde cero
DELETE FROM cards;
DELETE FROM event_logs;
DELETE FROM tasks;
DELETE FROM embassador_events;
DELETE FROM event_checklists;
DELETE FROM event_instagram_accounts;
DELETE FROM event_phases;
DELETE FROM leaderboards;
DELETE FROM embassadors;
DELETE FROM events;
DELETE FROM import_logs;
DELETE FROM notifications;
DELETE FROM invitation_tokens;
DELETE FROM user_organization_roles;
DELETE FROM profiles;
DELETE FROM users;
DELETE FROM organizations;

-- Reiniciar las secuencias si las hay
DELETE FROM meta_sync_logs;
DELETE FROM social_insights;
ALTER SEQUENCE IF EXISTS meta_sync_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS social_insights_id_seq RESTART WITH 1;

-- Limpiar también las tablas de Instagram y social
DELETE FROM instagram_profiles;
DELETE FROM social_pages;
DELETE FROM story_links;
