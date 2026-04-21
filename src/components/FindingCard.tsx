import { Check, X, AlertTriangle } from "lucide-react";
import type { Issue } from "@/lib/chunking";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReviewState = "approved" | "dismissed" | "escalated" | null;

interface Props {
  issue: Issue;
  index: number;
  state: ReviewState;
  active: boolean;
  onAction: (state: ReviewState) => void;
  onActivate: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

const sevStyles: Record<Issue["severity"], string> = {
  High: "bg-severity-high-bg text-severity-high border-severity-high/30",
  Medium: "bg-severity-medium-bg text-severity-medium border-severity-medium/30",
  Low: "bg-severity-low-bg text-severity-low border-severity-low/30",
};

const sevBar: Record<Issue["severity"], string> = {
  High: "bg-severity-high",
  Medium: "bg-severity-medium",
  Low: "bg-severity-low",
};

export function FindingCard({ issue, index, state, active, onAction, onActivate, registerRef }: Props) {
  const dismissed = state === "dismissed";
  return (
    <div
      ref={registerRef}
      onClick={onActivate}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-card transition-all",
        active && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        dismissed && "opacity-50",
        state === "escalated" && "border-severity-high/60"
      )}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", sevBar[issue.severity])} />
      <div className="space-y-3 p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">#{index + 1}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  sevStyles[issue.severity]
                )}
              >
                {issue.severity}
              </span>
              {state === "approved" && (
                <span className="rounded-full bg-status-compliant-bg px-2 py-0.5 text-[10px] font-semibold uppercase text-status-compliant">
                  Approved
                </span>
              )}
              {state === "escalated" && (
                <span className="rounded-full bg-severity-high-bg px-2 py-0.5 text-[10px] font-semibold uppercase text-severity-high">
                  Escalated
                </span>
              )}
              {dismissed && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  Dismissed
                </span>
              )}
            </div>
            <h4 className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{issue.title}</h4>
          </div>
        </div>

        <div className="space-y-2 text-[13px] leading-relaxed">
          <p>
            <span className="font-semibold text-foreground">Why it matters: </span>
            <span className="text-muted-foreground">{issue.why_it_matters}</span>
          </p>
          <p>
            <span className="font-semibold text-foreground">Recommendation: </span>
            <span className="text-muted-foreground">{issue.recommendation}</span>
          </p>
          {issue.evidence && !issue.evidence.toLowerCase().includes("not found") && (
            <p className="rounded-md border-l-2 border-border bg-muted/40 px-3 py-1.5 text-[12px] italic text-muted-foreground">
              "{issue.evidence}"
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant={state === "approved" ? "default" : "outline"}
            className={cn("h-8 gap-1 text-xs", state === "approved" && "bg-status-compliant text-white hover:bg-status-compliant/90")}
            onClick={(e) => {
              e.stopPropagation();
              onAction(state === "approved" ? null : "approved");
            }}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant={state === "dismissed" ? "default" : "outline"}
            className={cn("h-8 gap-1 text-xs", state === "dismissed" && "bg-muted-foreground text-white hover:bg-muted-foreground/90")}
            onClick={(e) => {
              e.stopPropagation();
              onAction(state === "dismissed" ? null : "dismissed");
            }}
          >
            <X className="h-3.5 w-3.5" /> Dismiss
          </Button>
          <Button
            size="sm"
            variant={state === "escalated" ? "default" : "outline"}
            className={cn("h-8 gap-1 text-xs", state === "escalated" && "bg-severity-high text-white hover:bg-severity-high/90")}
            onClick={(e) => {
              e.stopPropagation();
              onAction(state === "escalated" ? null : "escalated");
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Escalate
          </Button>
        </div>
      </div>
    </div>
  );
}
