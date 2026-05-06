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
    let detail = `API request failed with ${response.status}`;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      // Keep the status-only message if the response is not JSON.
    }
    throw new Error(detail);
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
  linked_record_details?: LinkedRecordDetail[];
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
  legal_entity_anchor?: LegalEntityAnchor;
  establishment_identity?: EstablishmentIdentity;
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

export interface LinkedRecordDetail {
  record_id: string;
  department?: string | null;
  department_record_id?: string | null;
  active: boolean;
  link_status: "active" | "deactivated";
  deactivated_at?: string | null;
  deactivated_by?: string | null;
  deactivation_reason?: string | null;
}

export interface LegalEntityAnchor {
  pan_hash?: string | null;
  gstin_hash?: string | null;
  anchor_status: "available" | "missing" | "conflict" | "verified_mock";
}

export interface EstablishmentIdentity {
  ubid: string;
  operating_unit_name: string;
  primary_location: string;
  pin_code?: string | null;
  department_record_count: number;
}

export interface UnmatchedActivityEvent {
  event_id: string;
  department: string;
  department_record_id: string;
  business_name: string;
  event_type: string;
  event_date: string;
  possible_matches: Array<{
    ubid: string;
    canonical_name: string;
    confidence: number;
  }>;
  reason: string;
  review_status: "pending" | "in_review" | "resolved";
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
  target?: string;
  reason: string;
  timestamp: string;
  before?: unknown;
  after?: unknown;
  generated_by?: string;
}

export interface BusinessSubmissionPayload {
  business_name: string;
  business_type: "Proprietorship" | "Partnership" | "LLP" | "Pvt Ltd" | "Public Ltd" | "Other";
  pan?: string;
  gstin?: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  address_line: string;
  city?: string;
  district?: string;
  state: string;
  pin_code: string;
  business_sector?: string;
  factory_licence_number?: string;
  shop_licence_number?: string;
  kspcb_consent_number?: string;
  bescom_consumer_number?: string;
  bwssb_consumer_number?: string;
  labour_registration_number?: string;
  trade_license_number?: string;
  supporting_document_name?: string;
}

export interface MockDepartmentRecord {
  record_id: string;
  company_group_id: string;
  department: string;
  department_record_id: string;
  business_name: string;
  pan_masked?: string | null;
  gstin_masked?: string | null;
  address: string;
  pin_code: string;
  business_sector: string;
  status_in_department: string;
  last_updated: string;
  date_of_commencement?: string;
  registration_date?: string;
  renewal_date?: string;
  last_inspection_date?: string;
  active_flag?: string;
  factory_license_no?: string;
  shop_license_no?: string;
  labour_registration_no?: string;
  kspcb_consent_no?: string;
  bescom_consumer_no?: string;
  bwssb_consumer_no?: string;
  trade_license_no?: string;
}

export interface MockDatabaseSummary {
  unique_businesses: number;
  department_records: number;
  activity_events: number;
  departments: string[];
  ambiguous_or_review_cases: number;
  last_loaded_status: string;
  note: string;
  sample_records: MockDepartmentRecord[];
}

export interface BusinessSubmission {
  _id: string;
  submission_id: string;
  ubid: string;
  source_type: "self_submitted";
  business_name: string;
  business_type: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address: {
    address_line: string;
    city?: string | null;
    district?: string | null;
    state: string;
    pin_code: string;
  };
  business_sector?: string | null;
  identifiers: {
    pan_masked?: string | null;
    gstin_masked?: string | null;
    pan_hash?: string | null;
    gstin_hash?: string | null;
  };
  validation: Record<string, boolean | string>;
  validation_results: Record<string, boolean | string>;
  validation_warnings: string[];
  warnings: string[];
  status: "Provisional";
  ubid_status: "verified_mock_match" | "provisional_needs_review" | "provisional_self_submitted";
  status_label: "Verified Mock Match" | "Provisional - Needs Review" | "Provisional - Self Submitted" | "Officer Review Required";
  match_confidence: number;
  matched_records: MockDepartmentRecord[];
  matched_activity_events?: unknown[];
  match_notes?: string[];
  next_step: string;
  verification_note: string;
  created_at: string;
}

export interface IdentifierVerificationItem {
  kind: "pan" | "gstin";
  provided: boolean;
  masked_value?: string | null;
  format_valid: boolean;
  exists_in_mock_database: boolean;
  match_count: number;
  sample_matches: MockDepartmentRecord[];
  verification_source: string;
  status: "not_provided" | "invalid_format" | "exists_in_mock_database" | "not_found_in_mock_database";
  message: string;
  live_verification: {
    available: boolean;
    provider: string;
    message: string;
  };
}

export interface IdentifierVerificationResponse {
  pan: IdentifierVerificationItem;
  gstin: IdentifierVerificationItem;
  gstin_pan_consistent: boolean;
  warnings: string[];
  privacy_note: string;
  production_note: string;
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

export interface ReviewFeedbackSummary {
  total_decisions: number;
  approved_matches: number;
  rejected_matches: number;
  insufficient_data: number;
  top_positive_patterns: string[];
  top_negative_patterns: string[];
  system_learning_status: string;
}

export interface MatchingThresholds {
  auto_link: {
    label: string;
    range: string;
    min: number;
    max: number;
    description: string;
  };
  human_review: {
    label: string;
    range: string;
    min: number;
    max: number;
    description: string;
  };
  keep_separate: {
    label: string;
    range: string;
    min: number;
    max: number;
    description: string;
  };
  evidence_weights: Array<{
    signal: string;
    weight: string;
  }>;
  principle: string;
}

export interface DeactivateLinkResponse {
  status: string;
  ubid: string;
  record_id: string;
  link: LinkedRecordDetail;
}

export interface AssistantColumn {
  key: string;
  label: string;
}

export interface AssistantSource {
  id: string;
  title: string;
  department: string;
  source_type: "department_record" | "activity_event";
  score: number;
  why: string;
}

export interface AssistantContext {
  dataset: "department_records" | "activity_events";
  intent: string;
  pin_codes: string[];
  departments: string[];
  statuses: string[];
  terms: string[];
}

export interface AssistantResponse {
  answer: string;
  intent: string;
  dataset: "department_records" | "activity_events";
  filters: string[];
  total_matches: number;
  returned_count: number;
  columns: AssistantColumn[];
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  summary: Record<string, unknown>;
  sources: AssistantSource[];
  context: AssistantContext;
  retrieval_mode: string;
  suggestions: string[];
  privacy_note: string;
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

export function fetchUnmatchedActivityEvents(): Promise<UnmatchedActivityEvent[]> {
  return apiFetch<UnmatchedActivityEvent[]>("/api/activity/unmatched-events");
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

export function runPrebuiltQuery(queryId: string): Promise<ActiveFactoriesQueryResponse> {
  return apiFetch<ActiveFactoriesQueryResponse>(`/api/queries/${encodeURIComponent(queryId)}`);
}

export function fetchPinCodeSummary(): Promise<PinCodeSummary[]> {
  return apiFetch<PinCodeSummary[]>("/api/map/pincode-summary");
}

export function submitBusinessInformation(payload: BusinessSubmissionPayload): Promise<BusinessSubmission> {
  return apiFetch<BusinessSubmission>("/api/ingestion/business-submission", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchBusinessSubmissions(): Promise<BusinessSubmission[]> {
  return apiFetch<BusinessSubmission[]>("/api/ingestion/business-submissions");
}

export function fetchMockDatabaseSummary(): Promise<MockDatabaseSummary> {
  return apiFetch<MockDatabaseSummary>("/api/mock-database/summary");
}

export function fetchMockDatabaseRecords(limit = 500): Promise<MockDepartmentRecord[]> {
  return apiFetch<MockDepartmentRecord[]>(`/api/mock-database/records?limit=${limit}`);
}

export function verifyBusinessIdentifiers(
  payload: Pick<BusinessSubmissionPayload, "pan" | "gstin">,
): Promise<IdentifierVerificationResponse> {
  return apiFetch<IdentifierVerificationResponse>("/api/ingestion/identifier-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchReviewFeedbackSummary(): Promise<ReviewFeedbackSummary> {
  return apiFetch<ReviewFeedbackSummary>("/api/review-feedback/summary");
}

export function fetchMatchingThresholds(): Promise<MatchingThresholds> {
  return apiFetch<MatchingThresholds>("/api/matching/thresholds");
}

export function askDataAssistant(
  message: string,
  limit = 500,
  context?: AssistantContext | null,
): Promise<AssistantResponse> {
  return apiFetch<AssistantResponse>("/api/assistant/query", {
    method: "POST",
    body: JSON.stringify({ message, limit, context }),
  });
}

export function deactivateUbidLink(
  ubid: string,
  recordId: string,
  actor: string,
  reason: string,
): Promise<DeactivateLinkResponse> {
  return apiFetch<DeactivateLinkResponse>(
    `/api/ubids/${encodeURIComponent(ubid)}/links/${encodeURIComponent(recordId)}/deactivate`,
    {
      method: "POST",
      body: JSON.stringify({ actor, reason }),
    },
  );
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
