## Kya banega

Aap har chapter ke liye apni PDF upload karogi. Lovable AI us PDF me se questions, options, correct answer, year/shift auto-extract karega. Wo questions Lovable Cloud me save honge (aapke account se linked). Test start karte waqt sirf **aapki uploaded PDFs se hi** questions aayenge — built-in bank fallback nahi.

## User flow

1. Home page → chapter list ke saath har chapter ke bagal me **"Upload PDF"** button + count badge (e.g. "12 Qs uploaded").
2. PDF choose → upload progress → AI parsing (10-40 sec) → parsed questions ka preview (edit/delete kar sakti ho) → Save.
3. Chapter select karte waqt sirf woh chapters enable rahenge jinki PDF upload ho chuki hai (baaki grey).
4. Test generate → aapki DB se questions pick honge (25 P + 25 C + 25 M, chapter-wise distributed).
5. "My Question Bank" page → sabhi uploaded PDFs, per-chapter questions dekhna/delete karna.

## Technical

- **Lovable Cloud enable** karna padega (auth + storage + DB).
- **Auth**: Email/password + Google sign-in.
- **Storage bucket** `pyq-pdfs` (private) — original PDF files.
- **DB tables**:
  - `pdf_uploads` (id, user_id, subject, chapter, exam, file_path, status, created_at)
  - `user_questions` (id, user_id, upload_id, subject, chapter, exam, question, options jsonb, correct_answer, question_type, year, session, difficulty)
  - RLS: sirf owner apna data dekhe.
- **AI extraction**: server function → PDF ko base64 me Lovable AI Gateway ko bheje (`google/gemini-2.5-flash`, multimodal file input) → structured JSON output (questions array).
- **Test generator**: existing `pyq.ts` logic ko replace — ab `user_questions` table se chapter-filtered fetch karke paper banega.
- **Fallback**: agar kisi chapter me user ke paas <3 questions hain, warning dikhega ki "iss chapter me kam questions hain, aur PDF upload karo".

## Files

- New: `src/lib/pdf-extract.functions.ts`, `src/routes/_authenticated/upload.tsx`, `src/routes/_authenticated/my-questions.tsx`, `src/routes/auth.tsx`
- Migration: tables + bucket + RLS
- Edit: `src/routes/index.tsx` (chapter selector shows upload state), `src/routes/test.tsx` (fetch from DB), `src/routes/__root.tsx` (auth listener)

## Confirmations chahiye

- **Model**: `google/gemini-2.5-flash` (fast, sasta, PDF read kar sakta hai) — ok?
- **Question type per chapter**: 25/25/25 split rakhna hai ya aap decide karogi kitne per chapter?
- Agar kisi subject me total <25 uploaded questions hain to kya karein — jitne hain utne se paper banaye, ya block karein?