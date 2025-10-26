-- Add indexes to optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_tasks_embassador_id ON tasks(embassador_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_embassadors_organization_id ON embassadors(organization_id);
CREATE INDEX IF NOT EXISTS idx_embassadors_status ON embassadors(status);
CREATE INDEX IF NOT EXISTS idx_events_fiesta_id ON events(fiesta_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);