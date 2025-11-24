-- Create brain_nodes table
CREATE TABLE IF NOT EXISTS brain_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brain_links table
CREATE TABLE IF NOT EXISTS brain_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_nodes CHECK (source_node_id != target_node_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS brain_nodes_user_id_idx ON brain_nodes(user_id);
CREATE INDEX IF NOT EXISTS brain_links_user_id_idx ON brain_links(user_id);
CREATE INDEX IF NOT EXISTS brain_links_source_idx ON brain_links(source_node_id);
CREATE INDEX IF NOT EXISTS brain_links_target_idx ON brain_links(target_node_id);

-- Enable Row Level Security
ALTER TABLE brain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_links ENABLE ROW LEVEL SECURITY;

-- Create policies for brain_nodes
CREATE POLICY "Users can view their own brain nodes"
  ON brain_nodes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brain nodes"
  ON brain_nodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brain nodes"
  ON brain_nodes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brain nodes"
  ON brain_nodes FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for brain_links
CREATE POLICY "Users can view their own brain links"
  ON brain_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brain links"
  ON brain_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brain links"
  ON brain_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brain links"
  ON brain_links FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brain_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER brain_nodes_updated_at
  BEFORE UPDATE ON brain_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_brain_nodes_updated_at();
