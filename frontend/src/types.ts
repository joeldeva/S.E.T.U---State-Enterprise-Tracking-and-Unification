import type { LucideIcon } from "lucide-react";

export type BusinessStatus = "active" | "dormant" | "closed" | "review";
export type SourceStatus = "linked" | "partial" | "missing";
export type ScreenId =
  | "dashboard"
  | "ubid"
  | "ingestion"
  | "spreadsheet"
  | "normalization"
  | "resolution"
  | "review"
  | "activity"
  | "assistant"
  | "queries"
  | "graph"
  | "map"
  | "audit";

export interface DepartmentSource {
  name: string;
  id: string;
  sourceRecordId?: string;
  confidence: number;
  date: string;
  status: SourceStatus;
  color: string;
}

export interface EvidenceFactor {
  factor: string;
  score: number;
  color: string;
}

export interface ActivityTimelineItem {
  dot: string;
  title: string;
  meta: string;
}

export interface BusinessRecord {
  id: number;
  name: string;
  ubid: string;
  gstinHash: string;
  panHash: string;
  anchorType: "GSTIN" | "PAN" | "Synthetic";
  status: BusinessStatus;
  confidence: number;
  type: string;
  district: string;
  pinCode: string;
  since: string;
  sources: DepartmentSource[];
  explain: EvidenceFactor[];
  timeline: ActivityTimelineItem[];
}

export interface ScreenDefinition {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  section: "Core" | "Intelligence" | "Governance";
  badge?: string;
  hidden?: boolean;
}
