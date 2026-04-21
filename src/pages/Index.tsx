import { useMemo, useRef, useState } from "react";
import { Shield, Upload, Loader2, FileText, Download, Radio, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, buildRulesBlock, fetchEcfrRules, type ModuleId } from "@/lib/rules";
import { extractTextFromFile } from "@/lib/extractText";
import { chunkText, mergeReports, type Report } from "@/lib/chunking";
import { exportReportPdf } from "@/lib/pdfExport";
import { DocumentViewer } from "@/components/DocumentViewer";
import { FindingCard, type ReviewState } from "@/components/FindingCard";
import { cn } from "@/lib/utils";

const Index = () => {
  const [moduleId, setModuleId] = useState<ModuleId>("fire_extinguisher");
  const [procedureText, setProcedureText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [strict, setStrict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [ecfrText, setEcfrText] = useState<string | null>(null);
  const [ecfrLoading, setEcfrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const module = MODULES[moduleId];

  const reviewedCount = reviewState.filter(Boolean).length;
  const allReviewed = report && reviewedCount === report.issues.length && report.issues.length > 0;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await extractTextFromFile(f);
      setProcedureText(text);
      setFileName(f.name);
      toast({ title: "File loaded", description: `${f.name} (${text.length.toLocaleString()} chars)` });
    } catch (err) {
      toast({ title: "Could not read file", description: String(err), variant: "destructive" });
    }
  }

  async function handleFetchEcfr() {
    setEcfrLoading(true);
    try {
      const text = await fetchEcfrRules(module);
      setEcfrText(text);
      toast({ title: "Rules updated from eCFR", description: `${text.length.toLocaleString()} chars loaded.` });
    } catch {
      setEcfrText(null);
      toast({ title: "Could not reach eCFR", description: "Falling back to built-in rules.", variant: "destructive" });
    } finally {
      setEcfrLoading(false);
    }
  }

  async function runAnalyze() {
    if (!procedureText.trim()) {
      toast({ title: "No procedure text", description: "Paste or upload a procedure first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setReport(null);
    setReviewState([]);
    setActiveIndex(null);

    try {
      const rulesBlock = buildRulesBlock(module, ecfrText ?? undefined);
      const chunks = chunkText(procedureText);
      const partials: Report[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) setProgressLabel(`Analyzing chunk ${i + 1} of ${chunks.length}...`);
        else setProgressLabel("Reviewing against OSHA requirements...");

        const { data, error } = await supabase.functions.invoke("analyze-compliance", {
          body: {
            procedureText: chunks[i],
            rulesBlock,
            strictMode: strict,
            moduleName: module.name,
          },
        });

        if (error) {
          const msg = (error as any)?.context?.body
            ? await (async () => {
                try {
                  const txt = await (error as any).context.text();
                  return JSON.parse(txt).error ?? txt;
                } catch {
                  return error.message;
                }
              })()
            : error.message;
          throw new Error(msg);
        }
        if ((data as any)?.error) throw new Error((data as any).error);
        partials.push(data as Report);
      }

      const merged = mergeReports(partials);
      setReport(merged);
      setReviewState(new Array(merged.issues.length).fill(null));
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
      setProgressLabel(null);
    }
  }

  function handleHighlightClick(idx: number) {
    setActiveIndex(idx);
    const el = cardRefs.current.get(idx);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleExport() {
    if (!report) return;
    exportReportPdf({
      report,
      reviewState,
      moduleName: module.name,
      documentName: fileName ?? "Pasted procedure",
    });
  }

  const statusBadge = useMemo(() => {
    if (!report) return null;
    const map = {
      Compliant: { label: "Compliant", cls: "bg-status-compliant-bg text-status-compliant border-status-compliant/30" },
      "Partially Compliant": { label: "Partially Compliant", cls: "bg-status-partial-bg text-status-partial border-status-partial/30" },
      "Non-Compliant": { label: "Non-Compliant", cls: "bg-status-noncompliant-bg text-status-noncompliant border-status-noncompliant/30" },
    } as const;
    const m = map[report.overall_status];
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide", m.cls)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {m.label}
      </span>
    );
  }, [report]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-card">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">Safety Compliance Checker</h1>
              <p className="text-[11px] text-muted-foreground">Upload → Analyze → Review → Export</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
            v2 • AI-powered
          </span>
        </div>
      </header>

      <main className="container py-6 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: input + viewer */}
          <section className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Regulation module
                    </label>
                    <Select value={moduleId} onValueChange={(v) => { setModuleId(v as ModuleId); setEcfrText(null); }}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MODULES).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.emoji} {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-1.5"
                    onClick={handleFetchEcfr}
                    disabled={ecfrLoading}
                    title="Fetch latest regulation text from eCFR"
                  >
                    {ecfrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                    <span className="hidden sm:inline">Fetch latest</span>
                  </Button>
                </div>

                {ecfrText && (
                  <div className="flex items-center gap-1.5 rounded-md bg-status-compliant-bg px-2.5 py-1.5 text-[11px] font-medium text-status-compliant">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Rules updated from eCFR
                  </div>
                )}

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Procedure text
                    </label>
                    {fileName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileText className="h-3 w-3" /> {fileName}
                      </span>
                    )}
                  </div>
                  <Textarea
                    placeholder="Paste your safety procedure here, or upload a document below…"
                    className="min-h-[180px] resize-y font-mono text-[13px] leading-relaxed"
                    value={procedureText}
                    onChange={(e) => setProcedureText(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf,.docx,.csv,.json"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" /> Upload file
                  </Button>
                  <label className="ml-auto flex items-center gap-2 text-xs">
                    <Switch checked={strict} onCheckedChange={setStrict} />
                    <span className="font-medium">Strict mode</span>
                    <span className="text-muted-foreground">— flag vague language aggressively</span>
                  </label>
                </div>

                <Button
                  className="h-11 w-full gap-2 bg-gradient-hero text-base font-semibold shadow-elevated hover:opacity-95"
                  onClick={runAnalyze}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {progressLabel ?? "Analyzing…"}
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Analyze Compliance
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DocumentViewer
              text={procedureText}
              issues={report?.issues ?? []}
              activeIssueIndex={activeIndex}
              onHighlightClick={handleHighlightClick}
            />
          </section>

          {/* RIGHT: results */}
          <section>
            {!report ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">Your compliance report will appear here</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Select a regulation, paste or upload a procedure, and run the analysis to see structured findings with inline highlights.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Overall status</p>
                      <div className="mt-1.5">{statusBadge}</div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <div className="font-mono text-base font-bold text-foreground">
                        {reviewedCount}/{report.issues.length}
                      </div>
                      findings reviewed
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-foreground">{report.summary}</p>
                </div>

                {report.issues.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Findings ({report.issues.length})
                    </h3>
                    {report.issues.map((issue, i) => (
                      <FindingCard
                        key={i}
                        issue={issue}
                        index={i}
                        state={reviewState[i] ?? null}
                        active={activeIndex === i}
                        onAction={(s) => {
                          setReviewState((prev) => {
                            const next = [...prev];
                            next[i] = s;
                            return next;
                          });
                        }}
                        onActivate={() => setActiveIndex(i)}
                        registerRef={(el) => {
                          if (el) cardRefs.current.set(i, el);
                          else cardRefs.current.delete(i);
                        }}
                      />
                    ))}
                  </div>
                )}

                {report.strengths.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-status-compliant">Strengths</h3>
                    <ul className="space-y-2">
                      {report.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-compliant" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.rules_considered.length > 0 && (
                  <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5 shadow-card">
                    <AccordionItem value="rules" className="border-0">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                        Rules considered ({report.rules_considered.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1.5 pb-2">
                          {report.rules_considered.map((r) => (
                            <li key={r.id} className="text-[12px]">
                              <span className="font-mono text-muted-foreground">{r.id}</span>{" "}
                              <span className="text-foreground">— {r.title}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                <Button
                  className="h-11 w-full gap-2 text-base font-semibold"
                  variant={allReviewed ? "default" : "outline"}
                  disabled={!allReviewed}
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                  {allReviewed ? "Download PDF report" : `Review all findings to enable export (${reviewedCount}/${report.issues.length})`}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
