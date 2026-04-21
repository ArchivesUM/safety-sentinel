export function chunkText(text: string, maxWords = 4000, overlap = 500): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 8000) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlap;
  }
  return chunks;
}

export interface Issue {
  title: string;
  severity: "High" | "Medium" | "Low";
  why_it_matters: string;
  recommendation: string;
  evidence: string;
}

export interface Report {
  overall_status: "Compliant" | "Partially Compliant" | "Non-Compliant";
  summary: string;
  issues: Issue[];
  strengths: string[];
  rules_considered: { id: string; title: string }[];
}

function similarity(a: string, b: string): number {
  const aw = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const bw = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (aw.size === 0 || bw.size === 0) return 0;
  let inter = 0;
  aw.forEach((w) => bw.has(w) && inter++);
  return inter / Math.min(aw.size, bw.size);
}

export function mergeReports(reports: Report[]): Report {
  if (reports.length === 1) return reports[0];

  const allIssues: Issue[] = [];
  for (const r of reports) {
    for (const issue of r.issues) {
      const dup = allIssues.find((existing) => similarity(existing.title, issue.title) > 0.6);
      if (!dup) allIssues.push(issue);
    }
  }

  const strengths = Array.from(new Set(reports.flatMap((r) => r.strengths)));
  const rulesMap = new Map<string, { id: string; title: string }>();
  reports.forEach((r) => r.rules_considered.forEach((rule) => rulesMap.set(rule.id, rule)));

  const statuses = reports.map((r) => r.overall_status);
  let overall: Report["overall_status"] = "Compliant";
  if (statuses.includes("Non-Compliant")) overall = "Non-Compliant";
  else if (statuses.includes("Partially Compliant")) overall = "Partially Compliant";

  return {
    overall_status: overall,
    summary: reports.map((r, i) => `Section ${i + 1}: ${r.summary}`).join(" "),
    issues: allIssues,
    strengths,
    rules_considered: Array.from(rulesMap.values()),
  };
}
