export type ModuleId = "fire_extinguisher" | "loto";

export interface RuleModule {
  id: ModuleId;
  name: string;
  emoji: string;
  ecfrUrl: string;
  rules: { id: string; title: string; detail: string }[];
}

export const MODULES: Record<ModuleId, RuleModule> = {
  fire_extinguisher: {
    id: "fire_extinguisher",
    name: "Fire Extinguisher (OSHA 1910.157)",
    emoji: "🔥",
    ecfrUrl:
      "https://www.ecfr.gov/api/versioner/v1/full/current/title-29/part-1910/section-1910.157",
    rules: [
      { id: "OSHA-1910.157-monthly-inspection", title: "Monthly visual inspection", detail: "Portable fire extinguishers must be visually inspected on a monthly basis." },
      { id: "OSHA-1910.157-annual-maintenance", title: "Annual maintenance by qualified technician", detail: "Annual maintenance check of portable extinguishers is required, performed by a qualified person." },
      { id: "OSHA-1910.157-accessibility", title: "Mounted, visible, accessible", detail: "Extinguishers must be conspicuously located, readily accessible, and identified." },
      { id: "OSHA-1910.157-condition", title: "Operable condition", detail: "Extinguishers must be maintained in fully charged and operable condition, free of damage." },
      { id: "OSHA-1910.157-recordkeeping", title: "Annual maintenance records", detail: "An annual maintenance record must be kept for each extinguisher and retained for one year after the last entry or the life of the shell, whichever is less." },
    ],
  },
  loto: {
    id: "loto",
    name: "Lockout/Tagout (OSHA 29 CFR 1910.147)",
    emoji: "🔒",
    ecfrUrl:
      "https://www.ecfr.gov/api/versioner/v1/full/current/title-29/part-1910/section-1910.147",
    rules: [
      { id: "LOTO-1910.147-energy-control-program", title: "Written energy control program", detail: "Employers must establish a written program covering energy control procedures, training, and periodic inspections." },
      { id: "LOTO-1910.147-written-procedures", title: "Written procedures per machine", detail: "Specific written procedures are required for the control of hazardous energy for each machine or equipment." },
      { id: "LOTO-1910.147-authorized-employees", title: "Only authorized employees perform LOTO", detail: "Only authorized employees may apply or remove lockout/tagout devices." },
      { id: "LOTO-1910.147-affected-employees", title: "Notify affected employees", detail: "Affected employees must be notified before the controls are applied and after they are removed." },
      { id: "LOTO-1910.147-periodic-inspection", title: "Annual periodic inspection", detail: "An inspection of energy control procedures is required at least annually." },
      { id: "LOTO-1910.147-retraining", title: "Retraining requirements", detail: "Retraining is required when there is a change in job assignment, machinery, or procedures, or when inspection reveals deficiencies." },
      { id: "LOTO-1910.147-hardware", title: "Lockout devices singularly identified", detail: "Lockout devices must be singularly identified, durable, standardized, and used only for energy control." },
    ],
  },
};

export function buildRulesBlock(module: RuleModule, ecfrText?: string): string {
  const base = module.rules
    .map((r) => `- [${r.id}] ${r.title}: ${r.detail}`)
    .join("\n");
  if (ecfrText && ecfrText.trim().length > 0) {
    return `${base}\n\n--- LIVE eCFR SOURCE TEXT (authoritative; use to refine analysis) ---\n${ecfrText.slice(0, 12000)}`;
  }
  return base;
}

export async function fetchEcfrRules(module: RuleModule): Promise<string> {
  const resp = await fetch(module.ecfrUrl, { headers: { Accept: "application/xml,text/xml,*/*" } });
  if (!resp.ok) throw new Error(`eCFR fetch failed: ${resp.status}`);
  const text = await resp.text();
  // Strip XML tags for a compact text representation
  return text
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
