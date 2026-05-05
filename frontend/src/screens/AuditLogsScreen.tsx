import {
  CalendarDays,
  CheckCircle2,
  GitMerge,
  History,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs, type AuditLog } from "../lib/api";

const fallbackAuditLogs: AuditLog[] = [
  {
    _id: "audit_001",
    action: "seed_loaded",
    actor: "system",
    reason: "Synthetic demo data loaded for backend verification.",
    timestamp: "2026-05-03T10:15:00Z",
  },
  {
    _id: "audit_002",
    action: "auto_link_created",
    actor: "system",
    reason: "Shared identifier hashes with high name and address confidence.",
    timestamp: "2026-05-03T10:16:00Z",
  },
  {
    _id: "audit_003",
    action: "review_case_created",
    actor: "system",
    case_id: "review_001",
    match_candidate_id: "match_004",
    reason: "Ambiguous match routed to human review.",
    timestamp: "2026-05-03T10:20:00Z",
  },
  {
    _id: "audit_004",
    action: "activity_status_updated",
    actor: "system",
    reason: "Recent compliance filing, utility signal, and license event support Active status.",
    timestamp: "2026-05-03T10:22:00Z",
  },
];

function formatAction(action: string) {
  return action.split("_").join(" ");
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function dateGroupLabel(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function actionTone(action: string) {
  if (/deactivated|rollback|reject|closed|conflict/i.test(action)) return "audit-red";
  if (/auto|approve|link|created|verified/i.test(action)) return "audit-green";
  if (/review|pending|updated|activity/i.test(action)) return "audit-amber";
  return "audit-blue";
}

function actionIcon(action: string): LucideIcon {
  if (/deactivated|rollback/i.test(action)) return RotateCcw;
  if (/reject|closed|conflict/i.test(action)) return XCircle;
  if (/auto|link|merge/i.test(action)) return GitMerge;
  if (/approve|verified/i.test(action)) return CheckCircle2;
  if (/review|pending/i.test(action)) return ShieldAlert;
  return Zap;
}

function stringifySnapshot(value: unknown) {
  if (value === undefined || value === null) return "No state snapshot recorded for this demo entry.";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>(fallbackAuditLogs);
  const [selectedId, setSelectedId] = useState(fallbackAuditLogs[0]._id);
  const [statusText, setStatusText] = useState("Fallback audit logs loaded");
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    fetchAuditLogs()
      .then((records) => {
        const data = records.length ? records : fallbackAuditLogs;
        setLogs(data);
        setSelectedId((current) => data.find((item) => item._id === current)?._id ?? data[0]._id);
        setStatusText(`Backend connected - ${data.length} audit logs loaded`);
        setIsFallback(false);
      })
      .catch(() => {
        setLogs(fallbackAuditLogs);
        setSelectedId(fallbackAuditLogs[0]._id);
        setStatusText("Backend offline - using fallback audit trail");
        setIsFallback(true);
      });
  }, []);

  const selectedLog = useMemo(
    () => logs.find((log) => log._id === selectedId) ?? logs[0],
    [logs, selectedId],
  );

  const groupedLogs = useMemo(() => {
    const groups = new Map<string, AuditLog[]>();
    [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .forEach((log) => {
        const group = dateGroupLabel(log.timestamp);
        groups.set(group, [...(groups.get(group) ?? []), log]);
      });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [logs]);

  return (
    <section className="audit-screen">
      <div className="review-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <History size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Append-only decision trail</p>
            <h1>Audit Logs</h1>
            <p>
              Inspect automated and reviewer actions with actor, reason, timestamp, and linked case context.
            </p>
          </div>
        </div>
      </div>

      <div className="resolution-status">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{statusText}</span>
        <strong>{isFallback ? "Demo fallback" : "Backend connected"}</strong>
      </div>

      <div className="review-layout audit-layout">
        <aside className="review-case-list">
          <div className="panel-header">
            <span className="panel-title">Audit Timeline</span>
            <span className="panel-count">{logs.length}</span>
          </div>
          {logs.length ? (
            <div className="audit-timeline">
              {groupedLogs.map((group) => (
                <div className="audit-date-group" key={group.label}>
                  <div className="audit-date-label">
                    <CalendarDays size={13} aria-hidden="true" />
                    {group.label}
                  </div>
                  {group.items.map((log) => {
                    const Icon = actionIcon(log.action);

                    return (
                      <button
                        className={`audit-entry ${actionTone(log.action)} ${log._id === selectedLog?._id ? "selected" : ""}`}
                        key={log._id}
                        type="button"
                        onClick={() => setSelectedId(log._id)}
                      >
                        <span className="audit-dot">
                          <Icon size={13} aria-hidden="true" />
                        </span>
                        <span className="audit-entry-main">
                          <span className="audit-entry-title">{formatAction(log.action)}</span>
                          <span className="audit-entry-reason">{log.reason}</span>
                          <span className="audit-entry-meta">{formatTimestamp(log.timestamp)} / {log.actor}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No audit entries available</div>
          )}
        </aside>

        <div className="review-detail">
          {selectedLog ? (
            <>
              <div className="review-summary-card">
                <div>
                  <p className="eyebrow">Audit entry</p>
                  <h2>{formatAction(selectedLog.action)}</h2>
                  <p>{selectedLog.reason}</p>
                </div>
                <div className="candidate-score">
                  <span className="status-pill sp-review">{selectedLog.actor}</span>
                </div>
              </div>

              <div className="evidence-panel">
                <div className="section-title">Audit metadata</div>
                <div className="evidence-row">
                  <span>Entry ID</span>
                  <strong>{selectedLog._id}</strong>
                </div>
                <div className="evidence-row">
                  <span>Timestamp</span>
                  <strong>{selectedLog.timestamp}</strong>
                </div>
                <div className="evidence-row">
                  <span>Actor</span>
                  <strong>{selectedLog.actor}</strong>
                </div>
                <div className="evidence-row">
                  <span>Case ID</span>
                  <strong>{selectedLog.case_id ?? "Not linked"}</strong>
                </div>
                <div className="evidence-row">
                  <span>Match candidate</span>
                  <strong>{selectedLog.match_candidate_id ?? "Not linked"}</strong>
                </div>
                <div className="evidence-row">
                  <span>Target</span>
                  <strong>{selectedLog.target ?? "Not linked"}</strong>
                </div>
                <div className="evidence-row">
                  <span>Generated by</span>
                  <strong>{selectedLog.generated_by ?? "SETU prototype"}</strong>
                </div>
              </div>

              <div className="audit-record-panels">
                <details open>
                  <summary>After state</summary>
                  <pre className="audit-json">{stringifySnapshot(selectedLog.after)}</pre>
                </details>
                <details>
                  <summary>Before state</summary>
                  <pre className="audit-json">{stringifySnapshot(selectedLog.before)}</pre>
                </details>
              </div>
            </>
          ) : (
            <div className="empty-state">Select an audit entry to inspect the decision trail</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AuditLogsScreen;
