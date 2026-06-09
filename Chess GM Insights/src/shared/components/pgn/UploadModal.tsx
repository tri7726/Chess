import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Upload, FileUp } from "lucide-react";
import { SAMPLE_GAMES, hashPgn } from "@/features/game/lib/pgn-samples";
import { toast } from "sonner";

export function UploadModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pgn, setPgn] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleAnalyze(text: string) {
    if (!text.trim()) {
      toast.error("Paste a PGN or pick a sample first");
      return;
    }
    setAnalyzing(true);
    setProgress(0);
    for (let i = 1; i <= 40; i++) {
      await new Promise((r) => setTimeout(r, 25));
      setProgress((i / 40) * 100);
    }
    const hash = hashPgn(text);
    sessionStorage.setItem(`vmax:pgn:${hash}`, text);
    setAnalyzing(false);
    setOpen(false);
    setPgn("");
    navigate({ to: "/game/$hash", params: { hash } });
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPgn(String(e.target?.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Analyze a game</DialogTitle>
          <DialogDescription>Drop a .pgn file, paste it, or pick a sample.</DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/50 p-6 transition hover:border-primary/60"
        >
          <FileUp className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drop .pgn here, or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pgn,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>

        <Textarea
          placeholder='Paste PGN here, e.g. [Event "..."] 1. e4 e5 ...'
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          className="min-h-32 font-mono text-xs"
        />

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sample games</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_GAMES.map((s) => (
              <Badge
                key={s.label}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => setPgn(s.pgn)}
              >
                {s.label}
              </Badge>
            ))}
          </div>
        </div>

        {analyzing && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Analyzing…</span>
              <span>Move {Math.floor((progress / 100) * 40)}/40</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <Button onClick={() => handleAnalyze(pgn)} disabled={analyzing} size="lg" className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {analyzing ? "Analyzing…" : "Analyze"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
