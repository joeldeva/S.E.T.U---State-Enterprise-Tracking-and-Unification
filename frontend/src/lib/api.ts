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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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
  review_status?: string;
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
