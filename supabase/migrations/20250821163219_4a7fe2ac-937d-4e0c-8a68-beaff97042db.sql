-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE public.social_mentions REPLICA IDENTITY FULL;
ALTER TABLE public.ambassador_requests REPLICA IDENTITY FULL;