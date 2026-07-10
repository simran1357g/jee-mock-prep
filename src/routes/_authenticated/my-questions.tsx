import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-questions")({
  head: () => ({ meta: [{ title: "My Question Bank" }] }),
  component: MyQuestionsPage,
});

interface UploadRow {
  id: string;
  subject: string;
  chapter: string;
  exam: string;
  file_name: string;
  status: string;
  question_count: number;
  error_message: string | null;
  created_at: string;
}

function MyQuestionsPage() {
  const [rows, setRows] = useState<UploadRow[] | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("pdf_uploads")
      .select("id, subject, chapter, exam, file_name, status, question_count, error_message, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as UploadRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this upload and all its extracted questions?")) return;
    await supabase.from("pdf_uploads").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← home
          </Link>
          <Link
            to="/upload"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            + Upload PDF
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold">My question bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every PDF you uploaded and how many PYQs were extracted from it.
        </p>

        {rows === null ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">No PDFs uploaded yet.</p>
            <Link
              to="/upload"
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Upload your first PDF
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.file_name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.subject} · {r.chapter} · {r.exam}
                  </div>
                  {r.status === "failed" && r.error_message && (
                    <div className="mt-1 text-xs text-red-600">Error: {r.error_message}</div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      r.status === "done"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : r.status === "failed"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {r.status}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.question_count} Qs</div>
                </div>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}