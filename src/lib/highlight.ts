import type { Issue } from "./chunking";

export interface HighlightSpan {
  start: number;
  end: number;
  issueIndex: number;
  severity: Issue["severity"];
}

// Find best fuzzy match for an evidence string in source text.
// Returns [start, end] or null.
export function findEvidenceSpan(source: string, evidence: string): [number, number] | null {
  if (!evidence || evidence.toLowerCase().includes("not found")) return null;
  const cleaned = evidence.trim().replace(/^["'`]|["'`]$/g, "");
  if (cleaned.length < 8) return null;

  // 1. exact substring
  const lowerSource = source.toLowerCase();
  const lowerEv = cleaned.toLowerCase();
  const exact = lowerSource.indexOf(lowerEv);
  if (exact !== -1) return [exact, exact + cleaned.length];

  // 2. try first ~60 chars
  const prefix = lowerEv.slice(0, Math.min(60, lowerEv.length));
  const prefixIdx = lowerSource.indexOf(prefix);
  if (prefixIdx !== -1) {
    return [prefixIdx, Math.min(source.length, prefixIdx + cleaned.length)];
  }

  // 3. token-overlap windowing (look for ~5 distinctive words in order)
  const tokens = cleaned
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  if (tokens.length < 3) return null;

  // build a regex of first 4 tokens loosely separated
  const sample = tokens.slice(0, 4).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(sample.join("\\W+(?:\\w+\\W+){0,4}"), "i");
  const m = source.match(re);
  if (m && m.index !== undefined) {
    return [m.index, m.index + Math.min(cleaned.length, m[0].length + 40)];
  }
  return null;
}

export function buildHighlightSpans(source: string, issues: Issue[]): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  issues.forEach((issue, idx) => {
    const span = findEvidenceSpan(source, issue.evidence);
    if (span) {
      spans.push({ start: span[0], end: span[1], issueIndex: idx, severity: issue.severity });
    }
  });
  // sort and remove overlaps (prefer earliest)
  spans.sort((a, b) => a.start - b.start);
  const filtered: HighlightSpan[] = [];
  let lastEnd = -1;
  for (const s of spans) {
    if (s.start >= lastEnd) {
      filtered.push(s);
      lastEnd = s.end;
    }
  }
  return filtered;
}
