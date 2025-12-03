-- Function to create default channels for new projects
CREATE OR REPLACE FUNCTION public.create_default_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.channels (project_id, name)
  VALUES
    (NEW.id, 'general'),
    (NEW.id, 'development'),
    (NEW.id, 'design');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_channels();
