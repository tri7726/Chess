import { createFileRoute } from "@tanstack/react-router";
import { ChessBoardPlaceholder } from "@/shared/components/board/ChessBoardPlaceholder";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: [
      { title: "Puzzles — V-Max" },
      { name: "description", content: "Spaced-repetition chess puzzles from your own games." },
    ],
  }),
  component: PuzzlesPage,
});

function PuzzlesPage() {
  const { user } = useAuth();

  function rate(q: number) {
    if (!user) toast("Sign in to track your progress");
    else toast.success(`Rated quality ${q} — next review scheduled`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Training</h1>
          <p className="text-sm text-muted-foreground">Spaced repetition powered by SM-2.</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">Due Today: </span>
          <span className="font-semibold">0</span>
        </div>
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h2 className="text-lg font-semibold">No puzzles yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete an analysis to generate puzzles from your own mistakes.
        </p>
      </div>

      {/* Sample puzzle card (hidden until cards exist — kept for the layout) */}
      <div className="mt-8 grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <ChessBoardPlaceholder />
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground">Your move</p>
          <h3 className="mt-1 text-xl font-semibold">Find the best continuation</h3>
          <div className="mt-4">
            <Progress value={0} />
            <p className="mt-1 text-xs text-muted-foreground">0/0 reviewed today</p>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Rate your recall (SM-2)</p>
            <div className="grid grid-cols-6 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((q) => (
                <Button key={q} variant="outline" size="sm" onClick={() => rate(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
