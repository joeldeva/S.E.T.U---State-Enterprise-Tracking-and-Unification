import { Activity, RefreshCw, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchActivityEvents,
  fetchAuditLogs,
  fetchUbids,
  runActivityIntelligence,
  type ActivityEvent,
  type ActivityRunResponse,
  type ActivityStatus,
  type AuditLog,
  type UbidRecord,
} from "../lib/api";

const fallbackStatuses: ActivityStatus[] = [
  {
    ubid: "KA-UBID-A92F31C8D410",
    status: "Active",
    confidence: 75,
    activity_score: 75,
    last_activity_date: "2026-04-25",
    unmatched_event_count: 0,
    evidence_timeline: [
      {
        event_id: "event_002",
        event_type: "electricity_usage",
        event_date: "2026-04-25",
        source: "BESCOM",
        score: 20,
        reason: "Electricity or water usage signal in the last 6 months.",
      },
      {
        event_id: "event_001",
        event_type: "compliance_filing",
        event_date: "2026-02-11",
        source: "Labour",
        score: 25,
        reason: "Compliance filing in the last 12 months.",
      },
      {
        event_id: "event_003",
        event_type: "renewal",
        event_date: "2026-01-30",
        source: "Factories",
        score: 30,
        reason: "Renewal signal in the last 12 months.",
      },
    ],
    scoring_breakdown: [
      {
        event_id: "event_002",
        event_type: "electricity_usage",
        event_date: "2026-04-25",
        source: "BESCOM",
        rule: "utility_usage_in_last_6_months",
        score: 20,
        reason: "Electricity or water usage signal in the last 6 months.",
      },
      {
        event_id: "event_001",
        event_type: "compliance_filing",
        event_date: "2026-02-11",
        source: "Labour",
        rule: "compliance_filing_in_last_12_months",
        score: 25,
        reason: "Compliance filing in the last 12 months.",
      },
      {
        event_id: "event_003",
        event_type: "renewal",
        event_date: "2026-01-30",
        source: "Factories",
        rule: "renewal_in_last_12_months",
        score: 30,
        reason: "Renewal signal in the last 12 months.",
      },
    ],
  },
  {
    ubid: "KA-UBID-D81F9A220C77",
    status: "Dormant",
    confidence: 55,
    activity_score: 20,
    last_activity_date: "2026-03-20",
    unmatched_event_count: 0,
    evidence_timeline: [
      {
        event_id: "event_004",
        event_type: "electricity_usage",
        event_date: "2026-03-20",
        source: "BESCOM",
        score: 20,
        reason: "Electricity or water usage signal in the last 6 months.",
      },
    ],
    scoring_breakdown: [
      {
        event_id: "event_004",
        event_type: "electricity_usage",
        event_date: "2026-03-20",
        source: "BESCOM",
        rule: "utility_usage_in_last_6_months",
        score: 20,
        reason: "Electricity or water usage signal in the last 6 months.",
      },
    ],
  },
  {
    ubid: "KA-UBID-9F03AD1C6B55",
    status: "Closed",
    confidence: 100,
    activity_score: 0,
    last_activity_date: "2026-01-18",
    unmatched_event_count: 0,
    evidence_timeline: [
      {
        event_id: "event_008",
        event_type: "closure_application",
        event_date: "2026-01-18",
        source: "Factories",
        score: 0,
        reason: "Closure event forces Closed status.",
      },
    ],
    scoring_breakdown: [
      {
        event_id: "event_008",
        event_type: "closure_application",
        event_date: "2026-01-18",
        source: "Factories",
        rule: "closure_override",
        score: 0,
        reason: "Closure event forces Closed status.",
      },
    ],
  },
  {
    ubid: "KA-UBID-3B5E61C90A22",
    status: "Insufficient Data",
    confidence: 35,
    activity_score: -40,
    last_activity_date: "2024-03-15",
    unmatched_event_count: 0,
    evidence_timeline: [
      {
        event_id: "event_005",
        event_type: "consent_lapsed",
        event_date: "2024-03-15",
        source: "KSPCB",
        score: 0,
        reason: "Event does not match an active scoring rule.",
      },
    ],
    scoring_breakdown: [
      {
        event_id: null,
        event_type: "no_strong_event",
        event_date: null,
        source: "system",
        rule: "no_strong_event_for_18_months",
        score: -40,
        reason: "No strong activity signal found in the last 18 months.",
      },
    ],
  },
];

const fallbackUnmatched: ActivityEvent[] = [
  {
    _id: "event_007",
    ubid: null,
    source: "BESCOM",
    source_record_id: "src_bescom_unmatched_001",
    event_type: "electricity_usage",
    event_date: "2026-04-29",
    activity_score: 20,
    joined_confidence: 0,
  },
];

function statusClass(status: ActivityStatus["status"]) {
  if (status === "Active") return "sp-active";
  if (status === "Dormant") return "sp-dormant";
  if (status === "Closed") return "sp-closed";
  return "sp-review";
}

function confidenceColor(confidence: number) {
  if (confidence >= 70) return "#047857";
  if (confidence >= 45) return "#B45309";
  return "#B91C1C";
}

function countStatuses(statuses: ActivityStatus[]) {
  return {
    Active: statuses.filter((item) => item.status === "Active").length,
    Dormant: statuses.filter((item) => item.status === "Dormant").length,
    Closed: statuses.filter((item) => item.status === "Closed").length,
    "Insufficient Data": statuses.filter((item) => item.status === "Insufficient Data").length,
  };
}

function ActivityIntelligenceScreen() {
  const [statuses, setStatuses] = useState<ActivityStatus[]>(fallbackStatuses);
  const [unmatchedEvents, setUnmatchedEvents] = useState<ActivityEvent[]>(fallbackUnmatched);
  const [ubids, setUbids] = useState<UbidRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUbid, setSelectedUbid] = useState(fallbackStatuses[0].ubid);
  const [statusText, setStatusText] = useState("Fallback demo data loaded");
  const [isFallback, setIsFallback] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  async function refreshData() {
    try {
      const [ubidData, eventData, auditData] = await Promise.all([
        fetchUbids(),
        fetchActivityEvents(),
        fetchAuditLogs(),
      ]);
      const activityStatuses = ubidData.map((ubid) => ({
        ubid: ubid._id,
        status: (ubid.current_status ?? "Insufficient Data") as ActivityStatus["status"],
        confidence: ubid.status_confidence ?? 0,
        activity_score: ubid.activity_score ?? 0,
        evidence_timeline: ubid.activity_evidence_timeline ?? [],
        scoring_breakdown: ubid.activity_scoring_breakdown ?? [],
        last_activity_date: ubid.last_activity_date ?? null,
        unmatched_event_count: ubid.unmatched_event_count ?? 0,
      }));
      if (activityStatuses.length) {
        setStatuses(activityStatuses);
        setSelectedUbid((current) => activityStatuses.find((item) => item.ubid === current)?.ubid ?? activityStatuses[0].ubid);
      }
      setUnmatchedEvents(eventData.filter((event) => !event.ubid));
      setUbids(ubidData);
      setAuditLogs(auditData);
      setStatusText(`Backend connected - ${activityStatuses.length} UBIDs loaded`);
      setIsFallback(false);
    } catch {
      setStatuses(fallbackStatuses);
      setUnmatchedEvents(fallbackUnmatched);
      setUbids([]);
      setAuditLogs([]);
      setSelectedUbid(fallbackStatuses[0].ubid);
      setStatusText("Backend offline - using fallback activity intelligence");
      setIsFallback(true);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  async function handleRun() {
    setIsRunning(true);
    setStatusText("Running local activity scoring...");
    try {
      const result: ActivityRunResponse = await runActivityIntelligence();
      setStatuses(result.statuses);
      setUnmatchedEvents(result.unmatched_events);
      setSelectedUbid((current) => result.statuses.find((item) => item.ubid === current)?.ubid ?? result.statuses[0]?.ubid ?? "");
      const [ubidData, auditData] = await Promise.all([fetchUbids(), fetchAuditLogs()]);
      setUbids(ubidData);
      setAuditLogs(auditData);
      setStatusText(`Activity classification complete. ${result.audit_logs_written} audit logs written.`);
      setIsFallback(false);
    } catch {
      setStatuses(fallbackStatuses);
      setUnmatchedEvents(fallbackUnmatched);
      setStatusText("Backend offline - fallback activity intelligence preserved");
      setIsFallback(true);
    } finally {
      setIsRunning(false);
    }
  }

  const selectedStatus = useMemo(
    () => statuses.find((status) => status.ubid === selectedUbid) ?? statuses[0],
    [statuses, selectedUbid],
  );
  const counts = countStatuses(statuses);

  return (
    <section className="activity-screen">
      <div className="activity-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <Activity size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Explainable activity classification</p>
            <h1>Activity Intelligence</h1>
            <p>
              Classify each UBID as Active, Dormant, Closed, or Insufficient Data from filings, renewals,
              inspections, utility usage, and closure events.
            </p>
          </div>
        </div>
        <button className="btn-primary" type="button" onClick={() => void handleRun()} disabled={isRunning}>
          <RefreshCw size={14} aria-hidden="true" className={isRunning ? "spin" : ""} />
          {isRunning ? "Running..." : "Run Activity Intelligence"}
        </button>
      </div>

      <div className="resolution-status">
        <Zap size={16} aria-hidden="true" />
        <span>{statusText}</span>
        <strong>{isFallback ? "Demo fallback" : "Backend connected"}</strong>
      </div>

      <div className="activity-metrics">
        <ActivityMetric label="Active" value={counts.Active} className="metric-green" />
        <ActivityMetric label="Dormant" value={counts.Dormant} className="metric-amber" />
        <ActivityMetric label="Closed" value={counts.Closed} className="metric-red" />
        <ActivityMetric label="Insufficient" value={counts["Insufficient Data"]} className="metric-blue" />
      </div>

      <div className="activity-layout">
        <aside className="activity-ubid-list">
          <div className="panel-header">
            <span className="panel-title">UBID Statuses</span>
            <span className="panel-count">{statuses.length}</span>
          </div>
          {statuses.map((item) => (
            <button
              className={`activity-ubid-item ${item.ubid === selectedStatus?.ubid ? "selected" : ""}`}
              key={item.ubid}
              type="button"
              onClick={() => setSelectedUbid(item.ubid)}
            >
              <div className="ri-top">
                <span className="ri-ubid">{item.ubid}</span>
                <span className={`status-pill ${statusClass(item.status)}`}>{item.status}</span>
              </div>
              <div className="ri-meta">
                <div className="conf-bar-mini">
                  <div
                    className="conf-fill-mini"
                    style={{ width: `${item.confidence}%`, background: confidenceColor(item.confidence) }}
                  />
                </div>
                <span className="conf-label">{item.confidence}%</span>
                <span className="conf-label">score {item.activity_score}</span>
              </div>
            </button>
          ))}
        </aside>

        <div className="activity-detail">
          {selectedStatus ? (
            <>
              <div className="activity-status-card">
                <div>
                  <p className="eyebrow">Selected UBID</p>
                  <h2>{selectedStatus.ubid}</h2>
                  <p>
                    Last activity: {selectedStatus.last_activity_date ?? "No dated signal"} / Score:
                    {" "}{selectedStatus.activity_score}
                  </p>
                </div>
                <span className={`status-pill ${statusClass(selectedStatus.status)}`}>{selectedStatus.status}</span>
              </div>

              <div className="activity-columns">
                <div className="activity-panel">
                  <div className="section-title">Evidence timeline</div>
                  {selectedStatus.evidence_timeline.length ? (
                    selectedStatus.evidence_timeline.map((event) => (
                      <div className="activity-event-row" key={`${selectedStatus.ubid}-${event.event_id ?? event.reason}`}>
                        <span>{event.event_date ?? "No date"}</span>
                        <strong>{event.source} / {event.event_type.split("_").join(" ")}</strong>
                        <p>{event.reason}</p>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No matched activity events</div>
                  )}
                </div>

                <div className="activity-panel">
                  <div className="section-title">Scoring breakdown</div>
                  {selectedStatus.scoring_breakdown.map((item) => (
                    <div className="score-row" key={`${selectedStatus.ubid}-${item.rule}-${item.event_id ?? "system"}`}>
                      <div>
                        <strong>{item.rule.split("_").join(" ")}</strong>
                        <p>{item.reason}</p>
                      </div>
                      <span className={item.score >= 0 ? "score-positive" : "score-negative"}>
                        {item.score > 0 ? `+${item.score}` : item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">No UBID status selected</div>
          )}
        </div>
      </div>

      <div className="unmatched-panel">
        <div className="panel-header">
          <span className="panel-title">Unmatched Activity Events</span>
          <span className="panel-count">{unmatchedEvents.length}</span>
        </div>
        {unmatchedEvents.map((event) => (
          <div className="unmatched-event" key={event._id}>
            <span>{event.source}</span>
            <strong>{event.event_type.split("_").join(" ")}</strong>
            <span>{event.event_date}</span>
            <span>{event.source_record_id ?? "No source record"}</span>
          </div>
        ))}
        {!unmatchedEvents.length ? <div className="empty-state">No unmatched events</div> : null}
      </div>

      <div className="review-refresh-note">
        Refreshed datasets: {ubids.length} UBIDs / {auditLogs.filter((log) => log.action === "activity_status_updated").length} activity audit logs
      </div>
    </section>
  );
}

function ActivityMetric({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`metric-card ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ActivityIntelligenceScreen;
