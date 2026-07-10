import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { GeneratedPaper } from "@/data/pyq";

const searchSchema = z.object({
  exam: z.enum(["JEE Main", "JEE Advanced"]).default("JEE Main"),
  seed: z.number().optional(),
});

export const Route = createFileRoute("/test")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Mock Test in Progress" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestPage,
});

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SUBJECT_RANGES = [
  { label: "Physics", start: 0, end: 25 },
  { label: "Chemistry", start: 25, end: 50 },
  { label: "Mathematics", start: 50, end: 75 },
];

function TestPage() {
  const { exam } = Route.useSearch();
  const navigate = useNavigate();

  // Generate paper on the client only to avoid SSR/CSR hydration mismatch
  // (Date.now() seed + sessionStorage-based chapter filter differ between SSR and hydration).
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60);

  useEffect(() => {
    const raw = sessionStorage.getItem("jee-mock-paper");
    if (!raw) {
      navigate({ to: "/" });
      return;
    }
    try {
      const p = JSON.parse(raw) as GeneratedPaper;
      setPaper(p);
      setTimeLeft(p.durationSec);
    } catch {
      navigate({ to: "/" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const submit = () => {
    if (!paper) return;
    sessionStorage.setItem(
      "jee-mock-result",
      JSON.stringify({ paper, answers, timeUsed: paper.durationSec - timeLeft }),
    );
    navigate({ to: "/results" });
  };

  useEffect(() => {
    if (paper && timeLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, paper]);

  if (!paper) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Preparing your paper…
      </div>
    );
  }

  const q = paper.questions[current];
  const subjectOfCurrent =
    SUBJECT_RANGES.find((s) => current >= s.start && current < s.end)?.label ?? "";

  const setAnswer = (val: string) =>
    setAnswers((a) => ({ ...a, [current]: val }));

  const statusFor = (idx: number): string => {
    const answered = answers[idx] !== undefined && answers[idx] !== "";
    const mark = marked[idx];
    if (answered && mark) return "bg-purple-500 text-white";
    if (answered) return "bg-green-600 text-white";
    if (mark) return "bg-purple-400 text-white";
    return "bg-muted text-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              {exam} · Mock Test
            </div>
            <div className="text-sm font-medium">
              Section: {subjectOfCurrent}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`rounded-md px-4 py-2 font-mono text-lg font-bold tabular-nums ${
                timeLeft < 300 ? "bg-destructive text-destructive-foreground" : "bg-secondary"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={submit}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[1fr_280px]">
        {/* Question panel */}
        <main className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Question {current + 1} of {paper.questions.length} · {q.type} ·{" "}
              <span className="font-medium text-foreground">{q.chapter}</span>
            </div>
            <button
              onClick={() => setMarked((m) => ({ ...m, [current]: !m[current] }))}
              className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              {marked[current] ? "Unmark" : "Mark for review"}
            </button>
          </div>

          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {q.question}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-secondary px-2 py-0.5">
              Source: {q.exam} · {q.session}
            </span>
            {q.difficulty && (
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  q.difficulty === "Hard"
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                    : q.difficulty === "Medium"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                }`}
              >
                {q.difficulty}
              </span>
            )}
          </div>

          {q.type === "MCQ" && q.options ? (
            <div className="mt-6 space-y-2">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const selected = answers[current] === letter;
                return (
                  <label
                    key={letter}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${current}`}
                      value={letter}
                      checked={selected}
                      onChange={() => setAnswer(letter)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-semibold">{letter}.</span> {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-6">
              <label className="text-sm text-muted-foreground">Your answer (numeric)</label>
              <input
                type="text"
                inputMode="decimal"
                value={answers[current] ?? ""}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-base"
                placeholder="e.g. 2 or 0.33"
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              onClick={() => setAnswers((a) => ({ ...a, [current]: "" }))}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear response
            </button>
            <button
              disabled={current === paper.questions.length - 1}
              onClick={() =>
                setCurrent((c) => Math.min(paper.questions.length - 1, c + 1))
              }
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
            >
              Save & Next →
            </button>
          </div>
        </main>

        {/* Palette */}
        <aside className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Question Palette</h3>
          {SUBJECT_RANGES.map((sec) => (
            <div key={sec.label} className="mb-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {sec.label}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: sec.end - sec.start }, (_, i) => sec.start + i).map(
                  (idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrent(idx)}
                      className={`h-8 rounded text-xs font-medium ${statusFor(idx)} ${
                        current === idx ? "ring-2 ring-primary ring-offset-1" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div><span className="inline-block h-3 w-3 rounded bg-green-600 align-middle" /> Answered</div>
            <div><span className="inline-block h-3 w-3 rounded bg-purple-400 align-middle" /> Marked</div>
            <div><span className="inline-block h-3 w-3 rounded bg-muted align-middle" /> Not visited/answered</div>
          </div>
        </aside>
      </div>
    </div>
  );
}