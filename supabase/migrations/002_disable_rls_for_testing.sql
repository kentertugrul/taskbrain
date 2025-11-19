-- Temporarily disable Row Level Security for testing
-- Run this in Supabase SQL Editor to allow unauthenticated access

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_configs DISABLE ROW LEVEL SECURITY;

-- Note: This is for TESTING ONLY
-- For production, you should either:
-- 1. Add authentication (Supabase Auth)
-- 2. Or create a service role policy for your specific use case

