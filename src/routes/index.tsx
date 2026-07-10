import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHAPTERS, type Subject, type ExamType, type PYQ } from "@/data/pyq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JEE Mock Test Generator — NTA-style PYQ Papers" },
      { name: "description", content: "Generate a full 2-hour, 75-question JEE Main / Advanced mock test built from real Previous Year Questions with cited sources." },
      { property: "og:title", content: "JEE Mock Test Generator — NTA-style PYQ Papers" },
      { property: "og:description", content: "Generate a full 2-hour, 75-question JEE Main / Advanced mock test built from real Previous Year Questions with cited sources." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamType>("JEE Main");
  const [selected, setSelected] = useState<Record<Subject, string[]>>({
    Physics: [],
    Chemistry: [],
    Mathematics: [],
  });
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Record<Subject, Record<string, number>>>({
    Physics: {},
    Chemistry: {},
    Mathematics: {},
  });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!userData.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("user_questions")
        .select("subject, chapter");
      if (cancelled) return;
      const next: Record<Subject, Record<string, number>> = {
        Physics: {},
        Chemistry: {},
        Mathematics: {},
      };
      (data ?? []).forEach((r) => {
        const s = r.subject as Subject;
        if (!next[s]) return;
        next[s][r.chapter] = (next[s][r.chapter] ?? 0) + 1;
      });
      setCounts(next);
      // pre-select all chapters that have questions
      setSelected({
        Physics: Object.keys(next.Physics),
        Chemistry: Object.keys(next.Chemistry),
        Mathematics: Object.keys(next.Mathematics),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleChapter = (subj: Subject, ch: string) => {
    setSelected((s) => ({
      ...s,
      [subj]: s[subj].includes(ch) ? s[subj].filter((c) => c !== ch) : [...s[subj], ch],
    }));
  };
  const setAll = (subj: Subject, all: boolean) =>
    setSelected((s) => ({
      ...s,
      [subj]: all ? Object.keys(counts[subj]) : [],
    }));

  const totalSelected =
    selected.Physics.length + selected.Chemistry.length + selected.Mathematics.length;
  const totalQs = (["Physics", "Chemistry", "Mathematics"] as Subject[]).reduce(
    (acc, s) => acc + Object.values(counts[s]).reduce((a, b) => a + b, 0),
    0,
  );

  const buildPaper = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const pickSubject = async (subj: Subject, want: number): Promise<PYQ[]> => {
        const chaps = selected[subj];
        if (chaps.length === 0) return [];
        const { data, error } = await supabase
          .from("user_questions")
          .select("*")
          .eq("subject", subj)
          .in("chapter", chaps);
        if (error) throw error;
        const rows = (data ?? []).map(
          (r): PYQ => ({
            id: r.id,
            subject: r.subject as Subject,
            chapter: r.chapter,
            exam: r.exam as ExamType,
            year: r.year ?? 0,
            session: r.session ?? "",
            type: r.question_type === "Numerical" ? "Numerical" : "MCQ",
            difficulty:
              r.difficulty === "Easy" || r.difficulty === "Medium" || r.difficulty === "Hard"
                ? r.difficulty
                : undefined,
            question: r.question,
            options: Array.isArray(r.options) ? (r.options as string[]) : undefined,
            answer: r.answer,
            sourceUrl: "",
            sourceLabel: `${r.exam}${r.year ? ` ${r.year}` : ""}${r.session ? ` · ${r.session}` : ""}`,
          }),
        );
        // shuffle
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rows[i], rows[j]] = [rows[j], rows[i]];
        }
        const out: PYQ[] = [];
        if (rows.length === 0) return [];
        for (let i = 0; i < want; i++) out.push(rows[i % rows.length]);
        return out;
      };

      const [p, c, m] = await Promise.all([
        pickSubject("Physics", 25),
        pickSubject("Chemistry", 25),
        pickSubject("Mathematics", 25),
      ]);
      const questions = [...p, ...c, ...m];
      if (questions.length === 0) {
        setStartError("No questions in your bank for the selected chapters. Upload some PDFs first.");
        return;
      }
      const paper = {
        seed: Date.now(),
        exam,
        questions,
        totalMarks: questions.length * 4,
        durationSec: 2 * 60 * 60,
      };
      sessionStorage.setItem("jee-mock-paper", JSON.stringify(paper));
      navigate({ to: "/test", search: { exam } });
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            NTA-style Mock Test Generator
          </p>
          <h1 className="mt-2 text-3xl font-bold">JEE Mock Test</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload your own PYQ PDFs — AI extracts the questions — build 2-hour, 75-Q mock tests from your own bank.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign in to start
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-6 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Your bank: <b className="text-foreground">{totalQs}</b> questions
          </span>
          <div className="flex gap-2">
            <Link
              to="/upload"
              className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90"
            >
              + Upload PDF
            </Link>
            <Link
              to="/my-questions"
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
            >
              My bank
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            NTA-style Mock Test Generator
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">JEE Mock Test</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built from <b>your own</b> uploaded PYQ PDFs · 2 hours · +4 / −1 marking.
          </p>
        </div>

        {/* Exam picker */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            1. Exam pattern
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(["JEE Main", "JEE Advanced"] as ExamType[]).map((e) => (
              <button
                key={e}
                onClick={() => setExam(e)}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  exam === e
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-lg font-bold">{e}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {e === "JEE Main"
                    ? "Broad PYQ pool across all sessions."
                    : "Advanced-tagged questions where available."}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chapter picker */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                2. Select chapters
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only chapters with uploaded PDFs are shown. Selected: <b>{totalSelected}</b> chapters.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(Object.keys(CHAPTERS) as Subject[]).map((subj) => {
              const availableChapters = Object.keys(counts[subj]).sort();
              const all =
                availableChapters.length > 0 &&
                selected[subj].length === availableChapters.length;
              const none = selected[subj].length === 0;
              return (
                <div key={subj} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {subj}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {availableChapters.length} ch · {Object.values(counts[subj]).reduce((a, b) => a + b, 0)} Qs
                      </span>
                    </h3>
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => setAll(subj, true)}
                        disabled={all || availableChapters.length === 0}
                        className="rounded border border-border px-2 py-0.5 hover:bg-accent disabled:opacity-40"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setAll(subj, false)}
                        disabled={none}
                        className="rounded border border-border px-2 py-0.5 hover:bg-accent disabled:opacity-40"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  {availableChapters.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No PDFs uploaded for {subj}.{" "}
                      <Link to="/upload" className="text-primary underline">
                        Upload one
                      </Link>
                    </p>
                  ) : (
                    <div className="mt-3 space-y-1.5">
                      {availableChapters.map((ch) => {
                        const checked = selected[subj].includes(ch);
                        return (
                          <label
                            key={ch}
                            className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleChapter(subj, ch)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className={checked ? "" : "text-muted-foreground line-through"}>
                                {ch}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {counts[subj][ch]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={buildPaper}
            disabled={totalSelected === 0 || starting}
            className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            {starting ? "Building paper…" : `Start ${exam} Mock →`}
          </button>
          <p className="text-xs text-muted-foreground">
            {totalSelected === 0
              ? "Upload PDFs and select at least one chapter to start."
              : "Paper: 25 Physics · 25 Chemistry · 25 Mathematics · 2 hours"}
          </p>
          {startError && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {startError}
            </p>
          )}
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Every question comes from PDFs you uploaded. Source appears under each question in review.
        </footer>
      </div>
    </div>
  );
}
