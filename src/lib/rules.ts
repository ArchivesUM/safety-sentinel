export type ModuleId = "fire_extinguisher" | "loto";

export interface Rule {
  id: string;
  title: string;
  detail: string;
  /** Direct link to the relevant paragraph on eCFR */
  sourceUrl: string;
  /** Human-readable citation, e.g. "29 CFR 1910.157(e)(2)" */
  citation: string;
}

export interface RuleModule {
  id: ModuleId;
  name: string;
  emoji: string;
  ecfrUrl: string;
  /** Public, human-readable eCFR page for the whole section */
  ecfrPageUrl: string;
  rules: Rule[];
}

const FE_BASE = "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-L/section-1910.157";
const LOTO_BASE = "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-J/section-1910.147";

export const MODULES: Record<ModuleId, RuleModule> = {
  fire_extinguisher: {
    id: "fire_extinguisher",
    name: "Fire Extinguisher (OSHA 1910.157)",
    emoji: "🔥",
    ecfrUrl:
      "https://www.ecfr.gov/api/versioner/v1/full/current/title-29/part-1910/section-1910.157",
    ecfrPageUrl: FE_BASE,
    rules: [
      { id: "OSHA-1910.157-monthly-inspection", title: "Monthly visual inspection", detail: "Portable fire extinguishers must be visually inspected on a monthly basis.", citation: "29 CFR 1910.157(e)(2)", sourceUrl: `${FE_BASE}#p-1910.157(e)(2)` },
      { id: "OSHA-1910.157-annual-maintenance", title: "Annual maintenance by qualified technician", detail: "Annual maintenance check of portable extinguishers is required, performed by a qualified person.", citation: "29 CFR 1910.157(e)(3)", sourceUrl: `${FE_BASE}#p-1910.157(e)(3)` },
      { id: "OSHA-1910.157-accessibility", title: "Mounted, visible, accessible", detail: "Extinguishers must be conspicuously located, readily accessible, and identified.", citation: "29 CFR 1910.157(c)(1)", sourceUrl: `${FE_BASE}#p-1910.157(c)(1)` },
      { id: "OSHA-1910.157-condition", title: "Operable condition", detail: "Extinguishers must be maintained in fully charged and operable condition, free of damage.", citation: "29 CFR 1910.157(c)(4)", sourceUrl: `${FE_BASE}#p-1910.157(c)(4)` },
      { id: "OSHA-1910.157-recordkeeping", title: "Annual maintenance records", detail: "An annual maintenance record must be kept for each extinguisher and retained for one year after the last entry or the life of the shell, whichever is less.", citation: "29 CFR 1910.157(e)(3)", sourceUrl: `${FE_BASE}#p-1910.157(e)(3)` },
    ],
  },
  loto: {
    id: "loto",
    name: "Lockout/Tagout (OSHA 29 CFR 1910.147)",
    emoji: "🔒",
    ecfrUrl:
      "https://www.ecfr.gov/api/versioner/v1/full/current/title-29/part-1910/section-1910.147",
    ecfrPageUrl: LOTO_BASE,
    rules: [
      { id: "LOTO-1910.147-energy-control-program", title: "Written energy control program", detail: "Employers must establish a written program covering energy control procedures, training, and periodic inspections.", citation: "29 CFR 1910.147(c)(1)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(1)` },
      { id: "LOTO-1910.147-written-procedures", title: "Written procedures per machine", detail: "Specific written procedures are required for the control of hazardous energy for each machine or equipment.", citation: "29 CFR 1910.147(c)(4)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(4)` },
      { id: "LOTO-1910.147-authorized-employees", title: "Only authorized employees perform LOTO", detail: "Only authorized employees may apply or remove lockout/tagout devices.", citation: "29 CFR 1910.147(c)(8)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(8)` },
      { id: "LOTO-1910.147-affected-employees", title: "Notify affected employees", detail: "Affected employees must be notified before the controls are applied and after they are removed.", citation: "29 CFR 1910.147(c)(9)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(9)` },
      { id: "LOTO-1910.147-periodic-inspection", title: "Annual periodic inspection", detail: "An inspection of energy control procedures is required at least annually.", citation: "29 CFR 1910.147(c)(6)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(6)` },
      { id: "LOTO-1910.147-retraining", title: "Retraining requirements", detail: "Retraining is required when there is a change in job assignment, machinery, or procedures, or when inspection reveals deficiencies.", citation: "29 CFR 1910.147(c)(7)(iii)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(7)(iii)` },
      { id: "LOTO-1910.147-hardware", title: "Lockout devices singularly identified", detail: "Lockout devices must be singularly identified, durable, standardized, and used only for energy control.", citation: "29 CFR 1910.147(c)(5)", sourceUrl: `${LOTO_BASE}#p-1910.147(c)(5)` },
    ],
  },
};

/** Look up source URL for any rule id across all modules */
export function findRuleSource(ruleId: string): { url: string; citation: string } | null {
  for (const mod of Object.values(MODULES)) {
    const r = mod.rules.find((x) => x.id === ruleId);
    if (r) return { url: r.sourceUrl, citation: r.citation };
  }
  return null;
}

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
