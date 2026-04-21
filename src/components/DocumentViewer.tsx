import { useMemo } from "react";
import type { Issue } from "@/lib/chunking";
import { buildHighlightSpans } from "@/lib/highlight";

interface Props {
  text: string;
  issues: Issue[];
  activeIssueIndex: number | null;
  onHighlightClick: (issueIndex: number) => void;
}

const sevClass: Record<Issue["severity"], string> = {
  High: "highlight-high",
  Medium: "highlight-medium",
  Low: "highlight-low",
};

export function DocumentViewer({ text, issues, activeIssueIndex, onHighlightClick }: Props) {
  const spans = useMemo(() => buildHighlightSpans(text, issues), [text, issues]);

  const segments = useMemo(() => {
    if (!text) return [];
    const out: Array<{ kind: "plain" | "hl"; text: string; issueIndex?: number; severity?: Issue["severity"] }> = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) out.push({ kind: "plain", text: text.slice(cursor, span.start) });
      out.push({
        kind: "hl",
        text: text.slice(span.start, span.end),
        issueIndex: span.issueIndex,
        severity: span.severity,
      });
      cursor = span.end;
    }
    if (cursor < text.length) out.push({ kind: "plain", text: text.slice(cursor) });
    return out;
  }, [text, spans]);

  if (!text) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        Upload or paste a procedure to see the document viewer here.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Document viewer</h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <LegendDot className="bg-severity-high/40 border-severity-high" label="High" />
          <LegendDot className="bg-severity-medium/40 border-severity-medium" label="Medium" />
          <LegendDot className="bg-severity-low/40 border-severity-low" label="Low" />
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto px-5 py-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
        {segments.map((seg, i) =>
          seg.kind === "plain" ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <span
              key={i}
              className={`${sevClass[seg.severity!]} ${activeIssueIndex === seg.issueIndex ? "highlight-active" : ""}`}
              onClick={() => onHighlightClick(seg.issueIndex!)}
              title={`Finding #${(seg.issueIndex ?? 0) + 1}`}
            >
              {seg.text}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm border ${className}`} />
      {label}
    </span>
  );
}
