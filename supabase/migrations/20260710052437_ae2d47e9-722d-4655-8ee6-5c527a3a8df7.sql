
CREATE TABLE public.pdf_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  exam TEXT NOT NULL DEFAULT 'JEE Main',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_uploads TO authenticated;
GRANT ALL ON public.pdf_uploads TO service_role;
ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own uploads select" ON public.pdf_uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own uploads insert" ON public.pdf_uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own uploads update" ON public.pdf_uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own uploads delete" ON public.pdf_uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.user_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  upload_id UUID REFERENCES public.pdf_uploads ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  exam TEXT NOT NULL DEFAULT 'JEE Main',
  question TEXT NOT NULL,
  options JSONB,
  answer TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'MCQ',
  year INTEGER,
  session TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_questions TO authenticated;
GRANT ALL ON public.user_questions TO service_role;
ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own qs select" ON public.user_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own qs insert" ON public.user_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own qs update" ON public.user_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own qs delete" ON public.user_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX user_questions_user_subj_ch_idx ON public.user_questions (user_id, subject, chapter);
CREATE INDEX pdf_uploads_user_subj_ch_idx ON public.pdf_uploads (user_id, subject, chapter);

-- Storage RLS: users manage only their own folder inside pyq-pdfs bucket
CREATE POLICY "own pdf read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pyq-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own pdf insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pyq-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own pdf delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pyq-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
