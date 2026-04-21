# 🛡️ Safety Compliance Checker v2

> Upload → Analyze → Review → Export

An AI-powered compliance tool that reviews safety procedures against OSHA requirements and produces structured, actionable reports for non-technical safety managers.

---

## What's new in v2

| Feature | v1 | v2 |
|---|---|---|
| Regulations covered | Fire Extinguisher only | Fire Extinguisher + Lockout/Tagout |
| File support | `.txt`, `.md` | `.txt`, `.md`, `.pdf`, `.docx`, `.csv`, `.json` |
| Regulatory source | Hardcoded rules | Hardcoded + live eCFR fetch |
| Long documents | Not supported | Chunked analysis with progress |
| Issue highlighting | None | Inline highlights in document viewer |
| Review workflow | None | Approve / Dismiss / Escalate per finding |
| PDF export | All findings | Reviewed findings only (escalated first) |

---

## What it does

1. Select a regulation module — Fire Extinguisher (OSHA 1910.157) or Lockout/Tagout (OSHA 29 CFR 1910.147)
2. Upload or paste a safety procedure document
3. Optionally fetch the latest rule text live from eCFR
4. AI reviews the document and returns structured compliance findings
5. Reviewer actions each finding: Approve, Dismiss, or Escalate
6. Download a filtered PDF report reflecting only reviewed findings

---

## Regulations covered

### 🔥 Fire Extinguisher — OSHA 1910.157
- Monthly visual inspection
- Annual maintenance by qualified technician
- Accessibility and visibility
- Operable condition, free from damage
- Annual maintenance recordkeeping

### 🔒 Lockout/Tagout — OSHA 29 CFR 1910.147
- Written energy control program
- Written procedures per machine or equipment
- Authorized vs affected employee requirements
- Notification before lockout
- Annual inspection of energy control procedures
- Retraining when procedures change or deficiencies found
- Lockout hardware requirements

---

## Key features

### 📡 Live regulatory retrieval
Click "Fetch latest rules" to pull current regulation text directly from the eCFR API before each analysis. Falls back to hardcoded rules silently if the fetch fails.

### 📄 Multi-format file support
Accepts `.txt`, `.md`, `.pdf`, `.docx`, `.csv`, and `.json`. PDF text is extracted via PDF.js, Word documents via mammoth.js.

### 🔀 Long document chunking
Documents exceeding 8000 words are automatically split into overlapping 4000-word chunks and analyzed in sequence. Findings are merged and deduplicated before display.

### 🖊️ Inline issue highlighting
The original procedure text is displayed in a read-only viewer with evidence spans highlighted by severity — red for High, amber for Medium, green for Low. Click any highlight to jump to the corresponding finding card.

### 👤 Human-in-the-loop review
Each finding must be actioned before export:
- ✅ **Approve** — confirmed, included in PDF
- ❌ **Dismiss** — excluded from PDF, grayed out
- 🚨 **Escalate** — flagged as immediate action required, appears at top of PDF with red banner

### 📥 Filtered PDF export
The downloaded report reflects only reviewed findings. Escalated findings appear in a dedicated "Immediate Action Required" section. Dismissed findings are excluded entirely.

---

## Project structure

```bash
.
├── src/
│   ├── components/
│   │   ├── InputPanel.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── FindingCard.tsx
│   │   └── SettingsBar.tsx
│   ├── lib/
│   │   ├── gemini.ts          # Gemini API call + chunking logic
│   │   ├── extract.ts         # File text extraction (PDF, DOCX, etc.)
│   │   ├── ecfr.ts            # eCFR live rule fetching
│   │   ├── highlight.ts       # Fuzzy match evidence to source text
│   │   └── export.ts          # jsPDF report generation
│   ├── rules/
│   │   ├── fire-extinguisher.ts
│   │   └── lockout-tagout.ts
│   └── App.tsx
├── public/
├── sample_docs/
│   ├── compliant_fire.txt
│   ├── non_compliant_fire.txt
│   ├── compliant_loto.txt
│   └── non_compliant_loto.txt
├── README.md
└── package.json
```

---

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Run locally
```bash
npm run dev
```

### 3) Add your API key
Enter your Google API key in the settings bar at the top of the app. It is stored in component state only and never sent anywhere except the Gemini API.

---

## Deployment

Deploy to Vercel or Netlify by connecting the GitHub repository. No environment variables are required — the API key is entered by the user at runtime.

---

## AI model

**Google Gemini 2.5 Flash** via the Generative Language API. `responseMimeType: "application/json"` is used to enforce structured output directly from the model.

---

## Design decisions

- **Module-based rule sets** — each regulation is a self-contained rule file, making it easy to add new modules (e.g. PPE, Hazard Communication) without touching core logic
- **Live eCFR fetch as optional layer** — hardcoded rules ensure the app always works; live fetch adds recency when available
- **Chunking with overlap** — 500-word overlap between chunks prevents findings from being missed at chunk boundaries
- **Human-in-the-loop before export** — forces deliberate review rather than blind PDF download, making the tool suitable for real audit workflows
- **Client-side only** — no backend, no database, no auth. Keeps the tool lightweight and easy to deploy

---

## Trade-offs

- Rules are still partially hardcoded — live eCFR text supplements but does not fully replace them
- Fuzzy matching for highlights is approximate — very short or generic evidence strings may not match
- Chunking merges findings by title similarity, which may occasionally miss near-duplicate issues with different wording
- No persistent storage — reviewed findings are lost on page refresh

---

## Limitations

- Scoped to two OSHA regulations
- Output quality depends on document clarity and procedure specificity
- Gemini API key is client-side — not suitable for public production deployment without a backend proxy

---

## What v3 would look like

- Add PPE (OSHA 1910.132) and Hazard Communication (OSHA 1910.1200) modules
- Backend proxy to secure the API key for public deployment
- Persistent audit log with review history per document
- Side-by-side diff view comparing two versions of a procedure
- Export to Word (.docx) in addition to PDF
- Team review mode — multiple reviewers can action findings independently

---

## Positioning

This tool demonstrates how AI can be embedded into real safety workflows to:
- Reduce manual compliance review time
- Improve audit consistency across sites and reviewers
- Surface actionable gaps for non-technical safety managers
- Create a defensible, reviewable audit trail before export
