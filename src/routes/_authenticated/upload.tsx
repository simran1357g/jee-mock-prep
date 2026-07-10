import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHAPTERS, type Subject, type ExamType } from "@/data/pyq";
import { extractPdf } from "@/lib/pdf-extract.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload PYQ PDF" }] }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const extract = useServerFn(extractPdf);
  const [subject, setSubject] = useState<Subject>("Physics");
  const [chapter, setChapter] = useState<string>(CHAPTERS.Physics[0]);
  const [exam, setExam] = useState<ExamType>("JEE Main");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const onSubjectChange = (s: Subject) => {
    setSubject(s);
    setChapter(CHAPTERS[s][0]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;
    setBusy(true);
    setResult(null);
    setStatus("Uploading PDF…");
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("pyq-pdfs")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { data: row, error: rowErr } = await supabase
        .from("pdf_uploads")
        .insert({
          user_id: userId,
          subject,
          chapter,
          exam,
          file_path: path,
          file_name: file.name,
          status: "pending",
        })
        .select()
        .single();
      if (rowErr || !row) throw rowErr ?? new Error("Could not save upload record");

      setStatus("AI extracting questions… (10-40 sec)");
      const res = await extract({ data: { uploadId: row.id } });
      setResult({ count: res.count });
      setStatus(`Done — extracted ${res.count} question${res.count === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus(err instanceof Error ? `Failed: ${err.message}` : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← home
          </Link>
          <Link
            to="/my-questions"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            my question bank →
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">Upload PYQ PDF</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose subject + chapter, then upload a PDF. AI will pull out questions, options and answers.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Subject</span>
              <select
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value as Subject)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(Object.keys(CHAPTERS) as Subject[]).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Exam</span>
              <select
                value={exam}
                onChange={(e) => setExam(e.target.value as ExamType)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>JEE Main</option>
                <option>JEE Advanced</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Chapter</span>
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CHAPTERS[subject].map((ch) => (
                <option key={ch}>{ch}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-muted-foreground">PDF file</span>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Max ~20 MB. Text-based PDFs work best (scanned PDFs may miss questions).
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || !file}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working…" : "Upload & extract"}
          </button>

          {status && (
            <p className="rounded bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              {status}
            </p>
          )}

          {result && result.count > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setStatus("");
                }}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Upload another
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Back to home
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}