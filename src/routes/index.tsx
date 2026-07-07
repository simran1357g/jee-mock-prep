import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CHAPTERS, type Subject, type ExamType } from "@/data/pyq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JEE Mock Test Generator — NTA-style PYQ Papers" },
      { name: "description", content: "Generate a full 2-hour, 75-question JEE Main / Advanced mock test built from real Previous Year Questions with cited sources." },
      { property: "og:title", content: "JEE Mock Test Generator" },
      { property: "og:description", content: "Full 2-hour NTA-style JEE mock tests from real PYQs with sources." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamType>("JEE Main");
  const [selected, setSelected] = useState<Record<Subject, string[]>>({
    Physics: [...CHAPTERS.Physics],
    Chemistry: [...CHAPTERS.Chemistry],
    Mathematics: [...CHAPTERS.Mathematics],
  });

  const toggleChapter = (subj: Subject, ch: string) => {
    setSelected((s) => ({
      ...s,
      [subj]: s[subj].includes(ch) ? s[subj].filter((c) => c !== ch) : [...s[subj], ch],
    }));
  };
  const setAll = (subj: Subject, all: boolean) =>
    setSelected((s) => ({ ...s, [subj]: all ? [...CHAPTERS[subj]] : [] }));

  const totalSelected =
    selected.Physics.length + selected.Chemistry.length + selected.Mathematics.length;

  const startTest = () => {
    sessionStorage.setItem("jee-mock-config", JSON.stringify({ exam, chapters: selected }));
    navigate({ to: "/test", search: { exam } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            NTA-style Mock Test Generator
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">JEE Mock Test</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            75 questions · 2 hours · Real PYQs with sources · +4 / −1 marking.
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
                Uncheck to exclude. Selected: <b>{totalSelected}</b> chapters.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(Object.keys(CHAPTERS) as Subject[]).map((subj) => {
              const all = selected[subj].length === CHAPTERS[subj].length;
              const none = selected[subj].length === 0;
              return (
                <div key={subj} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{subj}</h3>
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => setAll(subj, true)}
                        disabled={all}
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
                  <div className="mt-3 space-y-1.5">
                    {CHAPTERS[subj].map((ch) => {
                      const checked = selected[subj].includes(ch);
                      return (
                        <label
                          key={ch}
                          className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChapter(subj, ch)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className={checked ? "" : "text-muted-foreground line-through"}>
                            {ch}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            onClick={startTest}
            disabled={totalSelected === 0}
            className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-40"
          >
            Start {exam} Mock →
          </button>
          <p className="text-xs text-muted-foreground">
            {totalSelected === 0
              ? "Select at least one chapter to start."
              : "Paper: 25 Physics · 25 Chemistry · 25 Mathematics · 2 hours"}
          </p>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Curated real PYQs from JEE Main / Advanced official papers. Source appears under each question in review.
        </footer>
      </div>
    </div>
  );
}
