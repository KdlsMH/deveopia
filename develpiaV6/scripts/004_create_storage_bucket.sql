-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for project files
CREATE POLICY "Users can view files in their projects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id::text FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id::text FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files from their projects"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id::text FROM project_members WHERE user_id = auth.uid()
  )
);
