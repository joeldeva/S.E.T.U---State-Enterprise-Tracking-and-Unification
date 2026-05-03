import type { ScreenId } from "../types";

export interface DemoStep {
  id: ScreenId;
  label: string;
}

export interface ModuleNarrative {
  proves: string;
  matters: string;
  satisfies: string;
}

export const complianceBadges = [
  "Synthetic Data Only",
  "Source Systems Read-Only",
  "No Hosted LLM for Matching",
  "Explainable Decisions",
  "Reversible Merges",
  "Human Governed",
];

export const guidedDemoSteps: DemoStep[] = [
  { id: "ingestion", label: "Department data ingestion" },
  { id: "normalization", label: "Normalization" },
  { id: "resolution", label: "Entity resolution" },
  { id: "review", label: "Reviewer queue" },
  { id: "ubid", label: "UBID registry" },
  { id: "activity", label: "Activity intelligence" },
  { id: "queries", label: "BI query engine" },
  { id: "graph", label: "Identity graph" },
  { id: "map", label: "PIN-code map" },
  { id: "audit", label: "Audit logs" },
];

export const moduleNarratives: Record<ScreenId, ModuleNarrative> = {
  dashboard: {
    proves: "K-BIG is a control-room layer, not just a table of duplicate records.",
    matters: "Decision makers can see linked identities, status mix, review pressure, and policy risk in one place.",
    satisfies: "The dashboard makes synthetic data, read-only integration, human review, and reversibility visible from the first screen.",
  },
  ingestion: {
    proves: "Department systems remain untouched while K-BIG reads synthetic source extracts beside them.",
    matters: "Karnataka can connect Shops, Factories, Labour, KSPCB, BESCOM, and BWSSB without re-platforming.",
    satisfies: "Raw records are preserved, schema mapping is explicit, and source-system change is marked as not required.",
  },
  normalization: {
    proves: "Messy business names, addresses, PIN codes, and identifiers become comparable without exposing raw PAN or GSTIN.",
    matters: "Better normalization reduces false matches and keeps officer review focused on genuinely ambiguous cases.",
    satisfies: "Identifier values are masked or hashed, every transformation is inspectable, and matching remains local.",
  },
  resolution: {
    proves: "One business can receive one UBID through explainable deterministic anchors and fuzzy evidence.",
    matters: "Wrong merges are more dangerous than missed merges, so uncertainty is routed to officers.",
    satisfies: "Each candidate includes confidence, evidence, decision zone, and conflict-aware routing.",
  },
  review: {
    proves: "Ambiguous matches are governed by human decisions instead of silent automation.",
    matters: "Officers can approve, reject, create, or defer identity decisions with reasons.",
    satisfies: "Reviewer actions write audit logs and preserve reversible merge history.",
  },
  ubid: {
    proves: "A stable internal UBID can unify records across departments without revealing PAN or GSTIN.",
    matters: "A single trusted identity lets Karnataka understand the real business ecosystem across silos.",
    satisfies: "Linked sources, confidence, evidence, timeline, audit trail, and reversal concept are shown per UBID.",
  },
  activity: {
    proves: "Business status is inferred from explainable events, not guessed.",
    matters: "Active, Dormant, Closed, and Insufficient Data labels help prioritize inspections and cleanup.",
    satisfies: "Each status shows score, confidence, evidence timeline, unmatched events, and audit updates.",
  },
  queries: {
    proves: "UBID linkage unlocks cross-department intelligence queries that were previously hard to ask.",
    matters: "Government teams can find inspection gaps, ghost activity, coverage gaps, and duplicate clusters.",
    satisfies: "The primary query returns risk-ranked results with evidence, not opaque answers.",
  },
  graph: {
    proves: "A UBID identity can be inspected as a graph of linked, pending, and rejected department records.",
    matters: "Visual linkage helps reviewers and judges understand why records are connected.",
    satisfies: "Edges carry confidence and status so every relationship remains explainable.",
  },
  map: {
    proves: "K-BIG can summarize business intelligence at PIN-code level without exposing exact locations.",
    matters: "Policy users can identify active clusters, dormant pockets, and high-risk inspection zones.",
    satisfies: "Only synthetic coordinates and aggregate counts are shown, keeping raw addresses out of the map.",
  },
  audit: {
    proves: "Automated and reviewer decisions are traceable after the fact.",
    matters: "A government identity layer needs accountability, rollback context, and governance evidence.",
    satisfies: "Every merge, rejection, status update, and reversal concept is tied to actor, reason, and timestamp.",
  },
};
