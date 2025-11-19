-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'BACKLOG',
  decision TEXT NOT NULL DEFAULT 'DO',
  priority_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_minutes INTEGER,
  source_channel TEXT NOT NULL DEFAULT 'WEB',
  category TEXT,
  email_forward_address TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT tasks_status_check CHECK (status IN ('BACKLOG', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
  CONSTRAINT tasks_decision_check CHECK (decision IN ('DO', 'DELAY', 'DELEGATE', 'DROP')),
  CONSTRAINT tasks_category_check CHECK (category IN ('WORK', 'PERSONAL') OR category IS NULL),
  CONSTRAINT tasks_source_check CHECK (source_channel IN ('WHATSAPP', 'WEB', 'EMAIL'))
);

-- Create subtasks table
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BACKLOG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  position INTEGER DEFAULT 0,
  
  CONSTRAINT subtasks_status_check CHECK (status IN ('BACKLOG', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED'))
);

-- Create attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  size BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  thumbnail TEXT,
  
  CONSTRAINT attachments_type_check CHECK (type IN ('image', 'video', 'document', 'audio', 'other'))
);

-- Create calendar_configs table
CREATE TABLE calendar_configs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  color TEXT,
  selected BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);
CREATE INDEX idx_calendar_configs_user_id ON calendar_configs(user_id);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for subtasks
CREATE POLICY "Users can view subtasks of their tasks"
  ON subtasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can insert subtasks to their tasks"
  ON subtasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can update subtasks of their tasks"
  ON subtasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can delete subtasks of their tasks"
  ON subtasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()));

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments of their tasks"
  ON attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can insert attachments to their tasks"
  ON attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can update attachments of their tasks"
  ON attachments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));

CREATE POLICY "Users can delete attachments of their tasks"
  ON attachments FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));

-- RLS Policies for calendar_configs
CREATE POLICY "Users can manage their calendar configs"
  ON calendar_configs FOR ALL
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique email forward address
CREATE OR REPLACE FUNCTION generate_email_forward_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_forward_address IS NULL THEN
    NEW.email_forward_address := 'task-' || substring(NEW.id::text from 1 for 12) || '@taskbrain.app';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate email forward address
CREATE TRIGGER set_email_forward_address
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_email_forward_address();

