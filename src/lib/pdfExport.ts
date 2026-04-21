import jsPDF from "jspdf";
import type { Issue, Report } from "./chunking";

type ReviewState = "approved" | "dismissed" | "escalated" | null;

export interface ExportOptions {
  report: Report;
  reviewState: ReviewState[];
  moduleName: string;
  documentName: string;
}

export function exportReportPdf({ report, reviewState, moduleName, documentName }: ExportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, fontSize: number, opts: { bold?: boolean; color?: [number, number, number]; indent?: number } = {}) => {
    const { bold = false, color = [30, 30, 30], indent = 0 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2 - indent);
    for (const line of lines) {
      ensureSpace(fontSize + 4);
      doc.text(line, margin + indent, y);
      y += fontSize + 4;
    }
  };

  // Header
  writeWrapped("Safety Compliance Report", 22, { bold: true, color: [20, 30, 60] });
  y += 6;
  writeWrapped(`Regulation: ${moduleName}`, 11, { color: [80, 80, 80] });
  writeWrapped(`Document: ${documentName}`, 11, { color: [80, 80, 80] });
  writeWrapped(`Date: ${new Date().toLocaleString()}`, 11, { color: [80, 80, 80] });
  y += 8;

  // Status banner
  ensureSpace(36);
  const statusColor: Record<string, [number, number, number]> =
    report.overall_status === "Compliant"
      ? { c: [34, 139, 78] as any }
      : report.overall_status === "Partially Compliant"
      ? { c: [200, 140, 30] as any }
      : { c: [200, 50, 50] as any };
  doc.setFillColor(statusColor.c[0], statusColor.c[1], statusColor.c[2]);
  doc.rect(margin, y, pageW - margin * 2, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Overall Status: ${report.overall_status}`, margin + 12, y + 18);
  y += 40;

  writeWrapped("Summary", 14, { bold: true });
  writeWrapped(report.summary, 11);
  y += 8;

  // Escalated section
  const escalated = report.issues.filter((_, i) => reviewState[i] === "escalated");
  if (escalated.length > 0) {
    ensureSpace(40);
    doc.setFillColor(200, 50, 50);
    doc.rect(margin, y, pageW - margin * 2, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("🚨 Immediate Action Required", margin + 12, y + 16);
    y += 34;
    escalated.forEach((issue, i) => writeIssue(issue, i + 1, true));
    y += 8;
  }

  // Approved section
  const approved = report.issues.filter((_, i) => reviewState[i] === "approved");
  if (approved.length > 0) {
    writeWrapped("Approved Findings", 14, { bold: true });
    approved.forEach((issue, i) => writeIssue(issue, i + 1, false));
    y += 8;
  }

  if (escalated.length === 0 && approved.length === 0) {
    writeWrapped("No findings approved or escalated.", 11, { color: [120, 120, 120] });
    y += 8;
  }

  // Strengths
  if (report.strengths.length > 0) {
    writeWrapped("Strengths", 14, { bold: true, color: [34, 139, 78] });
    report.strengths.forEach((s) => writeWrapped(`✓ ${s}`, 11, { indent: 8 }));
    y += 8;
  }

  // Rules considered
  if (report.rules_considered.length > 0) {
    writeWrapped("Rules Considered", 14, { bold: true });
    report.rules_considered.forEach((r) => writeWrapped(`• ${r.id} — ${r.title}`, 10, { color: [80, 80, 80], indent: 8 }));
  }

  function writeIssue(issue: Issue, n: number, escalated: boolean) {
    ensureSpace(60);
    const sevColor: [number, number, number] =
      issue.severity === "High" ? [200, 50, 50] : issue.severity === "Medium" ? [200, 140, 30] : [34, 139, 78];
    if (escalated) {
      doc.setDrawColor(200, 50, 50);
      doc.setLineWidth(2);
      doc.line(margin, y - 2, margin, y + 60);
    }
    writeWrapped(`${n}. ${issue.title}  [${issue.severity}]`, 12, { bold: true, color: sevColor, indent: 6 });
    writeWrapped(`Why it matters: ${issue.why_it_matters}`, 10, { indent: 12 });
    writeWrapped(`Recommendation: ${issue.recommendation}`, 10, { indent: 12 });
    writeWrapped(`Evidence: "${issue.evidence}"`, 9, { color: [100, 100, 100], indent: 12 });
    y += 6;
  }

  doc.save(`compliance-report-${Date.now()}.pdf`);
}
