import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { scorePaper, type GeneratedPaper, type PYQ } from "@/data/pyq";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Mock Test Results" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

interface Stored {
  paper: GeneratedPaper;
  answers: Record<number, string>;
  timeUsed: number;
}

function ResultsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("jee-mock-result");
    if (!raw) {
      navigate({ to: "/" });
      return;
    }
    setData(JSON.parse(raw));
  }, [navigate]);

  if (!data) return null;
  const { paper, answers, timeUsed } = data;
  const score = scorePaper(paper, answers);
  const percentage = ((score.marks / paper.totalMarks) * 100).toFixed(1);

  const timeStr = `${Math.floor(timeUsed / 60)} min ${timeUsed % 60} sec`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {paper.exam} — Result
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {score.marks} <span className="text-muted-foreground">/ {paper.totalMarks}</span>
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">{percentage}%</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Correct" value={score.correct} tone="text-green-600" />
          <Stat label="Wrong" value={score.wrong} tone="text-destructive" />
          <Stat label="Unattempted" value={score.unattempted} tone="text-muted-foreground" />
          <Stat label="Time used" value={timeStr} tone="text-foreground" />
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Home
          </Link>
          <Link
            to="/test"
            search={{ exam: paper.exam }}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Take another mock
          </Link>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-bold">Review — answers &amp; sources</h2>
          <div className="space-y-4">
            {paper.questions.map((q, idx) => (
              <ReviewCard key={idx} q={q} idx={idx} userAnswer={answers[idx]} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function ReviewCard({ q, idx, userAnswer }: { q: PYQ; idx: number; userAnswer?: string }) {
  const attempted = userAnswer !== undefined && userAnswer !== "";
  const correct =
    attempted && userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
  const tone = !attempted
    ? "border-border"
    : correct
      ? "border-green-500"
      : "border-destructive";

  return (
    <div className={`rounded-xl border-2 bg-card p-5 ${tone}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Q{idx + 1}.</span>
        <span className="rounded bg-secondary px-2 py-0.5">{q.subject}</span>
        <span className="rounded bg-secondary px-2 py-0.5">{q.chapter}</span>
        <span className="rounded bg-secondary px-2 py-0.5">{q.type}</span>
      </div>
      <p className="whitespace-pre-wrap">{q.question}</p>

      {q.options && (
        <ol className="mt-3 space-y-1 text-sm">
          {q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isCorrect = letter === q.answer;
            const isUser = letter === userAnswer;
            return (
              <li
                key={letter}
                className={`rounded px-2 py-1 ${
                  isCorrect
                    ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100"
                    : isUser
                      ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                      : ""
                }`}
              >
                <span className="font-semibold">{letter}.</span> {opt}
                {isCorrect && <span className="ml-2 text-xs">✓ Correct</span>}
                {isUser && !isCorrect && <span className="ml-2 text-xs">✗ Your answer</span>}
              </li>
            );
          })}
        </ol>
      )}

      {q.type === "Numerical" && (
        <div className="mt-3 flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Your answer: </span>
            <span className={correct ? "text-green-600" : "text-destructive"}>
              {attempted ? userAnswer : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Correct: </span>
            <span className="font-semibold text-green-600">{q.answer}</span>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Source: </span>
        {q.sourceLabel} ·{" "}
        <a
          href={q.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80"
        >
          {q.sourceUrl}
        </a>
      </div>
    </div>
  );
}