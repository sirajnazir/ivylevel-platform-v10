-- Jenny v3 Lexical Search Support (Fixed)
-- This migration adds the missing student_id column for FTS filtering

-- First, let's drop the materialized view and recreate it as a table
DROP MATERIALIZED VIEW IF EXISTS interactions_fts;

-- Create the FTS table with proper structure
CREATE TABLE IF NOT EXISTS interactions_fts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  snippet TEXT NOT NULL,
  vector tsvector,
  created_ts timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_interactions_fts_vector ON interactions_fts USING GIN (vector);
CREATE INDEX IF NOT EXISTS idx_interactions_fts_student ON interactions_fts(student_id);

-- Function to generate tsvector from text
CREATE OR REPLACE FUNCTION generate_fts_vector(text_content TEXT)
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', COALESCE(text_content, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate interactions_fts from existing interactions
INSERT INTO interactions_fts (id, student_id, snippet, vector)
SELECT 
  snippet_id,
  student_id,
  COALESCE(user_ask, '') || ' ' || COALESCE(jenny_reply, ''),
  generate_fts_vector(COALESCE(user_ask, '') || ' ' || COALESCE(jenny_reply, ''))
FROM interactions
ON CONFLICT (id) DO NOTHING;

-- Trigger to keep FTS table in sync
CREATE OR REPLACE FUNCTION sync_interactions_fts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM interactions_fts WHERE id = OLD.snippet_id;
    RETURN OLD;
  ELSE
    INSERT INTO interactions_fts (id, student_id, snippet, vector)
    VALUES (
      NEW.snippet_id,
      NEW.student_id,
      COALESCE(NEW.user_ask, '') || ' ' || COALESCE(NEW.jenny_reply, ''),
      generate_fts_vector(COALESCE(NEW.user_ask, '') || ' ' || COALESCE(NEW.jenny_reply, ''))
    )
    ON CONFLICT (id) DO UPDATE SET
      student_id = EXCLUDED.student_id,
      snippet = EXCLUDED.snippet,
      vector = EXCLUDED.vector;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_interactions_fts_trigger ON interactions;
CREATE TRIGGER sync_interactions_fts_trigger
AFTER INSERT OR UPDATE OR DELETE ON interactions
FOR EACH ROW
EXECUTE FUNCTION sync_interactions_fts();