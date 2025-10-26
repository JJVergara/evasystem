-- Fix social_mentions mention_type constraint to allow 'tag'
ALTER TABLE public.social_mentions 
DROP CONSTRAINT IF EXISTS social_mentions_mention_type_check;

ALTER TABLE public.social_mentions 
ADD CONSTRAINT social_mentions_mention_type_check 
CHECK (mention_type IN ('mention', 'tag', 'hashtag', 'story', 'comment'));