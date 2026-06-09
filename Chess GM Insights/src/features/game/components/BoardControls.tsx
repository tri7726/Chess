import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Flame, Eye, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

interface BoardControlsProps {
  ply: number;
  total: number;
  heatmap: boolean;
  onHeatmapChange: (v: boolean) => void;
  multiPv?: boolean;
  onMultiPvChange?: (v: boolean) => void;
  onFirst?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLast?: () => void;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
}

export function BoardControls({
  ply, total, heatmap, onHeatmapChange,
  multiPv = false, onMultiPvChange,
  onFirst, onPrev, onNext, onLast,
  isPlaying = false, onPlayToggle,
}: BoardControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onFirst} disabled={ply === 0}>
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onPrev} disabled={ply === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {onPlayToggle && (
          <Button size="icon" variant="ghost" onClick={onPlayToggle}>
            {isPlaying ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={onNext} disabled={ply >= total}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onLast} disabled={ply >= total}>
          <ChevronLast className="h-4 w-4" />
        </Button>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        Move: {ply}/{total}
      </div>
      <div className="flex items-center gap-2">
        <Toggle pressed={heatmap} onPressedChange={onHeatmapChange} size="sm" aria-label="Heatmap">
          <Flame className="mr-1 h-3 w-3" />
          Heatmap
        </Toggle>
        {onMultiPvChange && (
          <Toggle pressed={multiPv} onPressedChange={onMultiPvChange} size="sm" aria-label="Candidate Moves">
            <Eye className="mr-1 h-3 w-3" />
            Live Lines
          </Toggle>
        )}
      </div>
    </div>
  );
}
