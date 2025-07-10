-- Update questions table to store attachment data as JSONB
-- This allows storing complex attachment information including Supabase and Google Drive details

ALTER TABLE questions 
ALTER COLUMN question_attachment_url TYPE JSONB USING 
  CASE 
    WHEN question_attachment_url IS NULL THEN NULL
    ELSE json_build_object('publicUrl', question_attachment_url)
  END;

ALTER TABLE questions 
ALTER COLUMN solution_attachment_url TYPE JSONB USING 
  CASE 
    WHEN solution_attachment_url IS NULL THEN NULL
    ELSE json_build_object('publicUrl', solution_attachment_url)
  END;

-- Rename columns for clarity
ALTER TABLE questions RENAME COLUMN question_attachment_url TO question_attachment;
ALTER TABLE questions RENAME COLUMN solution_attachment_url TO solution_attachment;

-- Add comments to explain the JSONB structure
COMMENT ON COLUMN questions.question_attachment IS 'JSONB object containing: {fileName, publicUrl, googleDriveId, googleDriveUrl, originalName}';
COMMENT ON COLUMN questions.solution_attachment IS 'JSONB object containing: {fileName, publicUrl, googleDriveId, googleDriveUrl, originalName}';

-- Create indexes for searching attachments
CREATE INDEX IF NOT EXISTS idx_questions_question_attachment ON questions USING gin (question_attachment);
CREATE INDEX IF NOT EXISTS idx_questions_solution_attachment ON questions USING gin (solution_attachment);

-- Create storage buckets if they don't exist (run this in Supabase dashboard)
/*
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('question-attachments', 'question-attachments', true),
  ('solution-attachments', 'solution-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for storage buckets
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id IN ('question-attachments', 'solution-attachments'));
CREATE POLICY "Allow authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('question-attachments', 'solution-attachments') AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON storage.objects FOR UPDATE USING (bucket_id IN ('question-attachments', 'solution-attachments') AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON storage.objects FOR DELETE USING (bucket_id IN ('question-attachments', 'solution-attachments') AND auth.role() = 'authenticated');
*/