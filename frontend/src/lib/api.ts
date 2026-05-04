export interface MatchCandidate {
  _id: string;
  record_a: string;
  record_b: string;
  departments?: string[];
  confidence: number;
  decision_zone: "auto_link" | "review" | "human_review" | "keep_separate";
  explanation: string;
  evidence?: Record<string, unknown>;
  status?: string;
}

export interface MatchingRunResponse {
  status: string;
  mode: string;
  hosted_llm_used: boolean;
  collections_updated: Record<string, number>;
  counts: {
    auto_link: number;
    review: number;
    keep_separate: number;
  };
  summary: Record<string, number>;
  match_candidates: MatchCandidate[];
  review_queue: unknown[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function runEntityResolution(): Promise<MatchingRunResponse> {
  return apiFetch<MatchingRunResponse>("/api/matching/run", {
    method: "POST",
  });
}

export function fetchMatchCandidates(): Promise<MatchCandidate[]> {
  return apiFetch<MatchCandidate[]>("/api/match-candidates");
}

export interface ReviewCase {
  _id: string;
  match_candidate_id: string;
  confidence: number;
  priority: string;
  reason: string;
  review_status: string;
  assigned_to?: string;
}

export interface NormalizedRecord {
  _id: string;
  source_record_id: string;
  department: string;
  normalized: {
    business_name?: string;
    address?: string;
    address_tokens?: string[];
    pin_code?: string;
    sector?: string;
    gstin_hash?: string | null;
    pan_hash?: string | null;
    phone_hash?: string | null;
    email_hash?: string | null;
  };
  quality_flags?: string[];
}

export interface SourceRecord {
  _id: string;
  department: string;
  source_record_id: string;
  raw: Record<string, unknown>;
  read_only_source: boolean;
}

export interface UbidRecord {
  _id: string;
  canonical_name: string;
  linked_records: string[];
  candidate_records?: string[];
  current_status?: string;
  status_confidence?: number;
  match_confidence?: number;
  activity_score?: number;
  activity_evidence_timeline?: ActivityTimelineEvent[];
  activity_scoring_breakdown?: ActivityScoringBreakdown[];
  last_activity_date?: string | null;
  unmatched_event_count?: number;
  review_status?: string;
}

export interface ActivityEvent {
  _id: string;
  ubid?: string | null;
  source: string;
  source_record_id?: string;
  event_type: string;
  event_date: string;
  activity_score?: number;
  joined_confidence?: number;
}

export interface ActivityTimelineEvent {
  event_id?: string;
  event_type: string;
  event_date: string | null;
  source: string;
  score: number;
  reason: string;
}

export interface ActivityScoringBreakdown {
  event_id?: string | null;
  event_type: string;
  event_date: string | null;
  source: string;
  rule: string;
  score: number;
  reason: string;
}

export interface ActivityStatus {
  ubid: string;
  status: "Active" | "Dormant" | "Closed" | "Insufficient Data";
  confidence: number;
  activity_score: number;
  evidence_timeline: ActivityTimelineEvent[];
  scoring_breakdown: ActivityScoringBreakdown[];
  last_activity_date: string | null;
  unmatched_event_count: number;
}

export interface ActivityRunResponse {
  status: string;
  mode: string;
  hosted_llm_used: boolean;
  counts: Record<"Active" | "Dormant" | "Closed" | "Insufficient Data", number>;
  statuses: ActivityStatus[];
  unmatched_events: ActivityEvent[];
  unmatched_event_count: number;
  audit_logs_written: number;
}

export interface PrebuiltQuery {
  id: string;
  title: string;
  description: string;
  risk_focus: string;
}

export interface QueryResultRow {
  ubid: string;
  canonical_name: string;
  pin_code: string;
  departments_linked: string[];
  current_status: string;
  last_inspection_date: string | null;
  months_since_inspection: number | null;
  risk_level: "High" | "Medium" | "Low";
  evidence: string[];
}

export interface ActiveFactoriesQueryResponse {
  query_id: string;
  title: string;
  result_count: number;
  results: QueryResultRow[];
}

export interface PinCodeSummary {
  pin_code: string;
  label: string;
  latitude: number;
  longitude: number;
  active_count: number;
  dormant_count: number;
  closed_count: number;
  pending_review_count: number;
  high_risk_count: number;
  department_coverage_gaps: string[];
}

export interface AuditLog {
  _id: string;
  action: string;
  actor: string;
  case_id?: string;
  match_candidate_id?: string;
  reason: string;
  timestamp: string;
}

export type ReviewDecision =
  | "approve_merge"
  | "reject_match"
  | "create_new_ubid"
  | "attach_to_existing_ubid"
  | "mark_insufficient_data";

export interface ReviewDecisionResponse {
  status: string;
  decision: ReviewDecision;
  case_id: string;
  match_candidate_id: string;
  ubid: string | null;
}

export function fetchReviewQueue(): Promise<ReviewCase[]> {
  return apiFetch<ReviewCase[]>("/api/review-queue");
}

export function fetchNormalizedRecords(): Promise<NormalizedRecord[]> {
  return apiFetch<NormalizedRecord[]>("/api/normalized-records");
}

export function fetchSourceRecords(): Promise<SourceRecord[]> {
  return apiFetch<SourceRecord[]>("/api/source-records");
}

export function fetchUbids(): Promise<UbidRecord[]> {
  return apiFetch<UbidRecord[]>("/api/ubids");
}

export function fetchAuditLogs(): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>("/api/audit-logs");
}

export function fetchActivityEvents(): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>("/api/activity-events");
}

export function runActivityIntelligence(): Promise<ActivityRunResponse> {
  return apiFetch<ActivityRunResponse>("/api/activity/run", {
    method: "POST",
  });
}

export function fetchPrebuiltQueries(): Promise<PrebuiltQuery[]> {
  return apiFetch<PrebuiltQuery[]>("/api/queries/prebuilt");
}

export function runActiveFactoriesNoInspectionQuery(): Promise<ActiveFactoriesQueryResponse> {
  return apiFetch<ActiveFactoriesQueryResponse>("/api/queries/active-factories-no-inspection");
}

export function fetchPinCodeSummary(): Promise<PinCodeSummary[]> {
  return apiFetch<PinCodeSummary[]>("/api/map/pincode-summary");
}

export function submitReviewDecision(
  caseId: string,
  decision: ReviewDecision,
  reason: string,
): Promise<ReviewDecisionResponse> {
  return apiFetch<ReviewDecisionResponse>(`/api/review-queue/${caseId}/decision`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      reviewer: "Reviewer Demo",
      reason,
    }),
  });
}
