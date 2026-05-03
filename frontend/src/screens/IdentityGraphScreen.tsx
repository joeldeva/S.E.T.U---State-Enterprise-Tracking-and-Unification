import { GitFork, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import IdentityGraph, { type GraphSelection } from "../components/graph/IdentityGraph";
import {
  fetchActivityEvents,
  fetchMatchCandidates,
  fetchUbids,
  type ActivityEvent,
  type MatchCandidate,
  type UbidRecord,
} from "../lib/api";

const fallbackUbids: UbidRecord[] = [
  {
    _id: "KA-UBID-A92F31C8D410",
    canonical_name: "Sri Lakshmi Engineering Works",
    linked_records: ["src_factories_102", "src_labour_778", "src_shops_221", "src_kspcb_309", "src_bescom_510"],
    candidate_records: ["src_bescom_unmatched_001"],
    current_status: "Active",
    status_confidence: 94,
    review_status: "system_verified",
  },
  {
    _id: "KA-UBID-D81F9A220C77",
    canonical_name: "Ananya Textiles",
    linked_records: ["src_shops_512"],
    candidate_records: ["src_kspcb_622"],
    current_status: "Dormant",
    status_confidence: 55,
    review_status: "pending_review",
  },
];

const fallbackCandidates: MatchCandidate[] = [
  {
    _id: "match_001",
    record_a: "src_factories_102",
    record_b: "src_labour_778",
    departments: ["Factories", "Labour"],
    confidence: 96,
    decision_zone: "auto_link",
    status: "auto_linked",
    explanation: "Shared identifier hashes with strong PIN, sector, name, and address agreement.",
    evidence: {
      gstin_hash_match: true,
      pan_hash_match: true,
      same_pin: true,
      name_similarity: 88,
      address_similarity: 91,
    },
  },
  {
    _id: "match_004",
    record_a: "src_shops_512",
    record_b: "src_kspcb_622",
    departments: ["Shops & Establishments", "KSPCB"],
    confidence: 82,
    decision_zone: "review",
    status: "pending_review",
    explanation: "Identifier hash and PIN match, but address variance needs review.",
    evidence: {
      gstin_hash_match: true,
      same_pin: true,
      name_similarity: 74,
      address_similarity: 68,
    },
  },
  {
    _id: "match_rejected_demo",
    record_a: "src_factories_102",
    record_b: "src_bescom_unmatched_001",
    departments: ["Factories", "BESCOM"],
    confidence: 42,
    decision_zone: "keep_separate",
    status: "rejected_by_reviewer",
    explanation: "Reviewer rejected due to weak name/address evidence and no shared registration anchor.",
    evidence: {
      same_pin: true,
      name_similarity: 38,
      address_similarity: 44,
      registration_anchor_missing: true,
    },
  },
];

const fallbackEvents: ActivityEvent[] = [
  {
    _id: "event_001",
    ubid: "KA-UBID-A92F31C8D410",
    source: "Labour",
    event_type: "compliance_filing",
    event_date: "2026-02-11",
    joined_confidence: 94,
  },
  {
    _id: "event_002",
    ubid: "KA-UBID-A92F31C8D410",
    source: "BESCOM",
    event_type: "utility_consumption",
    event_date: "2026-04-25",
    joined_confidence: 96,
  },
];

function formatEvidence(evidence: Record<string, unknown> | undefined) {
  if (!evidence) return [];
  return Object.entries(evidence).map(([key, value]) => ({
    key: key.split("_").join(" "),
    value: typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
  }));
}

function IdentityGraphScreen() {
  const [ubids, setUbids] = useState<UbidRecord[]>(fallbackUbids);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>(fallbackCandidates);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(fallbackEvents);
  const [selectedUbid, setSelectedUbid] = useState(fallbackUbids[0]._id);
  const [selection, setSelection] = useState<GraphSelection | null>(null);
  const [statusText, setStatusText] = useState("Fallback graph data loaded");
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    Promise.all([fetchUbids(), fetchMatchCandidates(), fetchActivityEvents()])
      .then(([ubidData, candidateData, eventData]) => {
        if (ubidData.length) {
          setUbids(ubidData);
          setSelectedUbid((current) => ubidData.find((item) => item._id === current)?._id ?? ubidData[0]._id);
        }
        setMatchCandidates(candidateData);
        setActivityEvents(eventData);
        setStatusText(`Backend connected - ${ubidData.length} UBIDs loaded`);
        setIsFallback(false);
      })
      .catch(() => {
        setUbids(fallbackUbids);
        setMatchCandidates(fallbackCandidates);
        setActivityEvents(fallbackEvents);
        setSelectedUbid(fallbackUbids[0]._id);
        setStatusText("Backend offline - using fallback graph data");
        setIsFallback(true);
      });
  }, []);

  const activeUbid = useMemo(
    () => ubids.find((ubid) => ubid._id === selectedUbid) ?? ubids[0],
    [selectedUbid, ubids],
  );

  const relevantRecordIds = new Set([...(activeUbid?.linked_records ?? []), ...(activeUbid?.candidate_records ?? [])]);
  const relevantCandidates = matchCandidates.filter(
    (candidate) => relevantRecordIds.has(candidate.record_a) || relevantRecordIds.has(candidate.record_b),
  );
  const relevantEvents = activityEvents.filter((event) => event.ubid === activeUbid?._id);

  return (
    <section className="identity-graph-screen">
      <div className="graph-screen-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <GitFork size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">UBID-centered identity graph</p>
            <h1>Identity Graph</h1>
            <p>
              See how department records, candidate matches, and activity events connect to one trusted UBID.
            </p>
          </div>
        </div>
        <label className="graph-selector">
          <span>Selected UBID</span>
          <select value={selectedUbid} onChange={(event) => setSelectedUbid(event.target.value)}>
            {ubids.map((ubid) => (
              <option key={ubid._id} value={ubid._id}>
                {ubid._id} - {ubid.canonical_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="resolution-status">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{statusText}</span>
        <strong>{isFallback ? "Demo fallback" : "Backend connected"}</strong>
      </div>

      <div className="identity-graph-layout">
        <div className="identity-graph-panel">
          {activeUbid ? (
            <IdentityGraph
              ubid={activeUbid}
              matchCandidates={relevantCandidates}
              activityEvents={relevantEvents}
              onSelect={setSelection}
            />
          ) : (
            <div className="empty-state">No UBID available for graph rendering</div>
          )}
        </div>

        <aside className="graph-evidence-panel">
          <div className="section-title">Selected evidence</div>
          {selection ? (
            <>
              <div className="graph-selection-title">
                <span>{selection.type}</span>
                <strong>{selection.label}</strong>
              </div>
              {Object.entries(selection.details).map(([key, value]) => (
                <div className="evidence-row" key={key}>
                  <span>{key.split("_").join(" ")}</span>
                  <strong>{value ?? "Not available"}</strong>
                </div>
              ))}
              {selection.type === "edge" ? (
                <div className="graph-evidence-list">
                  <div className="section-title">Match evidence</div>
                  {formatEvidence(selection.evidence).length ? (
                    formatEvidence(selection.evidence).map((item) => (
                      <div className="evidence-row" key={item.key}>
                        <span>{item.key}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))
                  ) : (
                    <p>No detailed evidence attached to this edge.</p>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p>Select a node or edge to inspect evidence, confidence, and linkage status.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default IdentityGraphScreen;
