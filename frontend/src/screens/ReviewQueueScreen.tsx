import { CheckCircle2, FilePlus2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAuditLogs,
  fetchMatchCandidates,
  fetchNormalizedRecords,
  fetchReviewQueue,
  fetchSourceRecords,
  fetchUbids,
  type AuditLog,
  type MatchCandidate,
  type NormalizedRecord,
  type ReviewCase,
  type ReviewDecision,
  type SourceRecord,
  type UbidRecord,
  submitReviewDecision,
} from "../lib/api";

const fallbackReviewCases: ReviewCase[] = [
  {
    _id: "review_001",
    match_candidate_id: "match_004",
    confidence: 82,
    priority: "High",
    reason: "Strong identifier hash and PIN agreement, but address variance requires officer review.",
    review_status: "pending",
    assigned_to: "Reviewer Demo",
  },
  {
    _id: "review_002",
    match_candidate_id: "match_005",
    confidence: 68,
    priority: "Medium",
    reason: "Utility activity may belong to the same business, but registration anchor is missing.",
    review_status: "pending",
    assigned_to: "Reviewer Demo",
  },
];

const fallbackCandidates: MatchCandidate[] = [
  {
    _id: "match_004",
    record_a: "src_shops_512",
    record_b: "src_kspcb_622",
    departments: ["Shops & Establishments", "KSPCB"],
    confidence: 82,
    decision_zone: "review",
    status: "pending_review",
    explanation: "Human review required because identifier hash and PIN agree, but address variance remains.",
    evidence: {
      identifier_hash_match: true,
      same_pin: true,
      name_similarity: 74,
      address_similarity: 68,
      sector_match: true,
    },
  },
  {
    _id: "match_005",
    record_a: "src_factories_901",
    record_b: "src_bescom_904",
    departments: ["Factories", "BESCOM"],
    confidence: 68,
    decision_zone: "review",
    status: "pending_review",
    explanation: "Human review required because the utility event has partial name and PIN agreement.",
    evidence: {
      same_pin: true,
      name_similarity: 69,
      address_similarity: 57,
      sector_match: false,
      registration_anchor_missing: true,
    },
  },
];

const fallbackNormalized: NormalizedRecord[] = [
  {
    _id: "norm_shops_512",
    source_record_id: "src_shops_512",
    department: "Shops & Establishments",
    normalized: {
      business_name: "ananya textiles",
      address: "44 textile market road yeshwanthpur bengaluru",
      pin_code: "560022",
      sector: "textiles",
      gstin_hash: "hash_demo_gstin_002",
      pan_hash: "hash_demo_pan_002",
    },
    quality_flags: [],
  },
  {
    _id: "norm_kspcb_622",
    source_record_id: "src_kspcb_622",
    department: "KSPCB",
    normalized: {
      business_name: "ananya textile unit",
      address: "44b industrial sub layout yeshwanthpur bengaluru",
      pin_code: "560022",
      sector: "textiles",
      gstin_hash: "hash_demo_gstin_002",
      pan_hash: null,
    },
    quality_flags: ["address_variance", "pan_missing"],
  },
  {
    _id: "norm_factories_901",
    source_record_id: "src_factories_901",
    department: "Factories",
    normalized: {
      business_name: "karnataka granite exports",
      address: "survey 18 malur road kolar",
      pin_code: "563101",
      sector: "mining",
      gstin_hash: "hash_demo_gstin_006",
      pan_hash: "hash_demo_pan_006",
    },
    quality_flags: ["review_recommended"],
  },
  {
    _id: "norm_bescom_904",
    source_record_id: "src_bescom_904",
    department: "BESCOM",
    normalized: {
      business_name: "karnataka granite export unit",
      address: "malur road industrial feeder kolar",
      pin_code: "563101",
      sector: "industrial utility",
      gstin_hash: null,
      pan_hash: null,
    },
    quality_flags: ["registration_anchor_missing"],
  },
];

function confidenceColor(confidence: number) {
  if (confidence >= 85) return "#047857";
  if (confidence >= 65) return "#B45309";
  return "#B91C1C";
}

function evidenceRows(evidence: Record<string, unknown> | undefined) {
  if (!evidence) return [];

  return Object.entries(evidence).map(([key, value]) => {
    const label = key.split("_").join(" ");
    if (typeof value === "object" && value !== null && "detail" in value) {
      const item = value as { detail?: string; points?: number; value?: unknown };
      return {
        label,
        detail: item.detail ?? String(item.value ?? ""),
        score: item.points ?? 0,
      };
    }

    return {
      label,
      detail: typeof value === "boolean" ? (value ? "Match" : "Conflict") : String(value),
      score: typeof value === "number" ? value : value ? 1 : 0,
    };
  });
}

function readable(value: string | undefined | null) {
  return value && value.trim() ? value : "Not available";
}

function hashStatus(value: string | undefined | null) {
  return value ? "Hash present" : "Missing";
}

function ReviewQueueScreen() {
  const [cases, setCases] = useState<ReviewCase[]>(fallbackReviewCases);
  const [candidates, setCandidates] = useState<MatchCandidate[]>(fallbackCandidates);
  const [normalizedRecords, setNormalizedRecords] = useState<NormalizedRecord[]>(fallbackNormalized);
  const [ubids, setUbids] = useState<UbidRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sourceRecords, setSourceRecords] = useState<SourceRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("review_001");
  const [reason, setReason] = useState("Same address, same sector, strong name similarity");
  const [status, setStatus] = useState("Fallback demo data loaded");
  const [isFallback, setIsFallback] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshData() {
    try {
      const [queue, matchData, normalizedData, ubidData, auditData, sourceData] = await Promise.all([
        fetchReviewQueue(),
        fetchMatchCandidates(),
        fetchNormalizedRecords(),
        fetchUbids(),
        fetchAuditLogs(),
        fetchSourceRecords(),
      ]);
      const pending = queue.filter((item) => item.review_status === "pending");
      setCases(pending);
      setCandidates(matchData);
      setNormalizedRecords(normalizedData);
      setUbids(ubidData);
      setAuditLogs(auditData);
      setSourceRecords(sourceData);
      setSelectedCaseId((current) => pending.find((item) => item._id === current)?._id ?? pending[0]?._id ?? "");
      setStatus(`Backend connected - ${pending.length} pending cases`);
      setIsFallback(false);
    } catch {
      setCases(fallbackReviewCases);
      setCandidates(fallbackCandidates);
      setNormalizedRecords(fallbackNormalized);
      setUbids([]);
      setAuditLogs([]);
      setSourceRecords([]);
      setSelectedCaseId("review_001");
      setStatus("Backend offline - using fallback demo review cases");
      setIsFallback(true);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const selectedCase = useMemo(
    () => cases.find((item) => item._id === selectedCaseId) ?? cases[0],
    [cases, selectedCaseId],
  );

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate._id === selectedCase?.match_candidate_id),
    [candidates, selectedCase],
  );

  const recordA = normalizedRecords.find((record) => record.source_record_id === selectedCandidate?.record_a);
  const recordB = normalizedRecords.find((record) => record.source_record_id === selectedCandidate?.record_b);

  async function handleDecision(decision: ReviewDecision) {
    if (!selectedCase) return;
    if (!reason.trim()) {
      setStatus("Reason is required before submitting a reviewer decision");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isFallback) {
        setCases((current) => current.filter((item) => item._id !== selectedCase._id));
        setStatus(`Fallback decision recorded locally: ${decision}`);
      } else {
        await submitReviewDecision(selectedCase._id, decision, reason.trim());
        await refreshData();
        setStatus(`Decision submitted: ${decision}. UBIDs and audit logs refreshed.`);
      }
    } catch {
      setStatus("Decision could not be submitted. Fallback demo data remains available.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="review-screen">
      <div className="review-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <ShieldAlert size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Human-governed identity decisions</p>
            <h1>Review Queue</h1>
            <p>
              Ambiguous matches stay out of auto-merge until an officer records a reasoned, reversible decision.
            </p>
          </div>
        </div>
        <button className="btn-ghost" type="button" onClick={() => void refreshData()}>
          <RefreshCw size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="resolution-status">
        <ShieldAlert size={16} aria-hidden="true" />
        <span>{status}</span>
        <strong>{isFallback ? "Demo fallback" : "Backend connected"}</strong>
      </div>

      <div className="review-layout">
        <aside className="review-case-list">
          <div className="panel-header">
            <span className="panel-title">Pending Cases</span>
            <span className="panel-count">{cases.length}</span>
          </div>
          {cases.length ? (
            cases.map((item) => (
              <button
                className={`review-case-item ${item._id === selectedCase?._id ? "selected" : ""}`}
                key={item._id}
                type="button"
                onClick={() => setSelectedCaseId(item._id)}
              >
                <div className="ri-top">
                  <span className="ri-name">{item._id}</span>
                  <span className={`status-pill ${item.priority === "High" ? "sp-review" : "sp-dormant"}`}>
                    {item.priority}
                  </span>
                </div>
                <p>{item.reason}</p>
                <div className="ri-meta">
                  <div className="conf-bar-mini">
                    <div
                      className="conf-fill-mini"
                      style={{ width: `${item.confidence}%`, background: confidenceColor(item.confidence) }}
                    />
                  </div>
                  <span className="conf-label">{item.confidence}%</span>
                </div>
              </button>
            ))
          ) : (
            <div className="empty-state">No pending review cases</div>
          )}
        </aside>

        <div className="review-detail">
          {selectedCase && selectedCandidate && recordA && recordB ? (
            <>
              <div className="review-summary-card">
                <div>
                  <p className="eyebrow">Case {selectedCase._id}</p>
                  <h2>{selectedCandidate.record_a} vs {selectedCandidate.record_b}</h2>
                  <p>{selectedCandidate.explanation}</p>
                </div>
                <div className="candidate-score">
                  <span className="status-pill sp-review">Review</span>
                  <div className="conf-bar-wide">
                    <div
                      className="conf-fill-mini"
                      style={{
                        width: `${selectedCandidate.confidence}%`,
                        background: confidenceColor(selectedCandidate.confidence),
                      }}
                    />
                  </div>
                  <span className="conf-label">{selectedCandidate.confidence}%</span>
                </div>
              </div>

              <div className="comparison-grid">
                <RecordComparison title="Record A" record={recordA} />
                <RecordComparison title="Record B" record={recordB} />
              </div>

              <div className="evidence-panel">
                <div className="section-title">Evidence breakdown</div>
                {evidenceRows(selectedCandidate.evidence).map((item) => (
                  <div className="evidence-row" key={`${selectedCandidate._id}-${item.label}`}>
                    <span>{item.label}</span>
                    <strong>{item.detail}</strong>
                  </div>
                ))}
              </div>

              <div className="decision-panel">
                <label htmlFor="reviewReason">Reviewer reason</label>
                <textarea
                  id="reviewReason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                />
                <div className="action-row">
                  <button className="btn-primary" type="button" disabled={isSubmitting} onClick={() => void handleDecision("approve_merge")}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Approve Merge
                  </button>
                  <button className="btn-ghost" type="button" disabled={isSubmitting} onClick={() => void handleDecision("reject_match")}>
                    <XCircle size={14} aria-hidden="true" />
                    Reject Match
                  </button>
                  <button className="btn-ghost" type="button" disabled={isSubmitting} onClick={() => void handleDecision("create_new_ubid")}>
                    <FilePlus2 size={14} aria-hidden="true" />
                    Create New UBID
                  </button>
                  <button className="btn-ghost" type="button" disabled={isSubmitting} onClick={() => void handleDecision("mark_insufficient_data")}>
                    Mark Insufficient Data
                  </button>
                </div>
              </div>

              <div className="review-refresh-note">
                Refreshed datasets: {ubids.length} UBIDs / {auditLogs.length} audit logs / {sourceRecords.length} source records
              </div>
            </>
          ) : (
            <div className="empty-state">Select a pending case to review</div>
          )}
        </div>
      </div>
    </section>
  );
}

interface RecordComparisonProps {
  title: string;
  record: NormalizedRecord;
}

function RecordComparison({ title, record }: RecordComparisonProps) {
  return (
    <div className="comparison-card">
      <div className="comparison-title">
        <span>{title}</span>
        <strong>{record.department}</strong>
      </div>
      <ComparisonField label="Source record" value={record.source_record_id} />
      <ComparisonField label="Name" value={readable(record.normalized.business_name)} />
      <ComparisonField label="Address" value={readable(record.normalized.address ?? record.normalized.address_tokens?.join(" "))} />
      <ComparisonField label="PIN" value={readable(record.normalized.pin_code)} />
      <ComparisonField label="Sector" value={readable(record.normalized.sector)} />
      <ComparisonField label="GSTIN" value={hashStatus(record.normalized.gstin_hash)} />
      <ComparisonField label="PAN" value={hashStatus(record.normalized.pan_hash)} />
      <div className="dept-chips">
        {(record.quality_flags ?? []).map((flag) => (
          <span className="dept-chip" key={`${record._id}-${flag}`}>
            {flag.split("_").join(" ")}
          </span>
        ))}
      </div>
    </div>
  );
}

function ComparisonField({ label, value }: { label: string; value: string }) {
  return (
    <div className="comparison-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ReviewQueueScreen;
