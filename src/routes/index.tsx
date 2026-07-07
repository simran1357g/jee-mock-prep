import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { CHAPTERS } from "@/data/pyq";

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            NTA-style Mock Test Generator
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">JEE Mock Test</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            75 questions · 2 hours · Real PYQs with sources · +4 / −1 marking. Choose your exam pattern and begin.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/test"
            search={{ exam: "JEE Main" }}
            className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <h2 className="text-2xl font-bold">JEE Main</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              25 Physics + 25 Chemistry + 25 Mathematics. MCQ + Numerical.
            </p>
            <p className="mt-4 text-sm font-medium text-primary group-hover:underline">
              Start Main mock →
            </p>
          </Link>
          <Link
            to="/test"
            search={{ exam: "JEE Advanced" }}
            className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:border-primary hover:shadow-md"
          >
            <h2 className="text-2xl font-bold">JEE Advanced</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Same 3-subject format, drawn from Advanced-tagged PYQs where available.
            </p>
            <p className="mt-4 text-sm font-medium text-primary group-hover:underline">
              Start Advanced mock →
            </p>
          </Link>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Syllabus coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chapters in the question bank across each subject.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {(Object.keys(CHAPTERS) as (keyof typeof CHAPTERS)[]).map((subj) => (
              <div key={subj} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">{subj}</h3>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {CHAPTERS[subj].map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Questions are curated real PYQs from JEE Main / Advanced official papers. Source citation appears under each question during review.
        </footer>
      </div>
    </div>
  );
}
