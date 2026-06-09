import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/shared/components/ui/button";
import { UploadModal } from "@/shared/components/pgn/UploadModal";
import { BarChart3, Tag, Brain, Crown } from "lucide-react";
import { EvalChart } from "@/features/analysis/components/EvalChart";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "V-Max — Analyze your chess games like a GM" },
      { name: "description", content: "Drop a PGN, get GM-grade analysis: eval chart, move labels, and spaced-repetition puzzles." },
      { property: "og:title", content: "V-Max — Chess analysis" },
      { property: "og:description", content: "Drop a PGN, get GM-grade analysis." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(900px 400px at 50% -10%, oklch(0.553 0.243 297 / 0.35), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-5xl px-4 py-24 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Crown className="h-3 w-3 text-primary" /> Powered by deep analysis
          </div>
          <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl">
            Analyze your chess games <span className="text-primary">like a GM</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Drop a PGN and V-Max shows you every turning point: eval graphs, move labels, and personalized training puzzles.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <UploadModal
              trigger={
                <Button size="lg" className="h-12 px-6 text-base">
                  Analyze a Game
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: BarChart3, title: "Eval Chart", desc: "See every turning point. Color-coded swings, click to jump." },
            { icon: Tag, title: "Move Labels", desc: "Brilliant, Best, Inaccuracy, Blunder — every move classified." },
            { icon: Brain, title: "Training Puzzles", desc: "Mistakes turn into spaced-repetition cards you actually retain." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Live demo — Sicilian Najdorf</h3>
            <span className="text-xs text-muted-foreground">Carlsen vs Nepomniachtchi</span>
          </div>
          <EvalChart />
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-3"><span className="text-muted-foreground">Accuracy White</span><div className="text-xl font-semibold">94.2%</div></div>
            <div className="rounded-lg border border-border p-3"><span className="text-muted-foreground">Accuracy Black</span><div className="text-xl font-semibold">88.1%</div></div>
            <div className="rounded-lg border border-border p-3"><span className="text-muted-foreground">Critical moments</span><div className="text-xl font-semibold">3</div></div>
          </div>
        </div>
      </section>
    </div>
  );
}
