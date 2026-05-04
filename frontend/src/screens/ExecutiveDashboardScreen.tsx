import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  MapPinned,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { seedBusinesses } from "../data/seedBusinesses";
import type { ScreenId } from "../types";

interface ExecutiveDashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onStartDemo: () => void;
}

const metrics = [
  { label: "Total business submissions", value: "24", tone: "blue" },
  { label: "UBIDs generated", value: "92", tone: "green" },
  { label: "Pending verification", value: "18", tone: "amber" },
  { label: "Verified UBIDs", value: "74", tone: "purple" },
  { label: "Active businesses", value: "61", tone: "green" },
  { label: "Dormant businesses", value: "22", tone: "amber" },
  { label: "Closed businesses", value: "9", tone: "red" },
];

const impactItems = [
  "One UBID across departments",
  "Active/Dormant/Closed status with evidence",
  "Ambiguous matches routed to officers",
  "Queries previously impossible are now possible",
  "Works without modifying department systems",
];

const dashboardCompliance = [
  "Synthetic Data",
  "Read-Only Source Integration",
  "Explainable Decisions",
  "Human Review",
  "Reversible Merge",
];

const priorityCases = [
  { caseId: "CASE-001", title: "Name/address match, GSTIN missing", confidence: 82, priority: "High" },
  { caseId: "CASE-002", title: "Same PIN, similar owner, partial address", confidence: 76, priority: "Medium" },
  { caseId: "CASE-003", title: "Utility event unmatched to registry", confidence: 68, priority: "Low" },
];

const statusDistribution = [
  { label: "Active", count: 61, color: "#047857" },
  { label: "Dormant", count: 22, color: "#B45309" },
  { label: "Closed", count: 9, color: "#B91C1C" },
];

const moduleShortcuts = [
  { id: "ingestion", label: "Submit Business", icon: Send },
  { id: "review", label: "Review", icon: ClipboardCheck },
  { id: "ubid", label: "Registry", icon: Fingerprint },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "queries", label: "Queries", icon: FileSearch },
  { id: "map", label: "Map", icon: MapPinned },
] satisfies Array<{ id: ScreenId; label: string; icon: LucideIcon }>;

function ExecutiveDashboardScreen({ onNavigate, onStartDemo }: ExecutiveDashboardScreenProps) {
  const featuredBusiness = seedBusinesses[0];

  return (
    <section className="dashboard-screen">
      <div className="dashboard-hero">
        <div className="dashboard-copy">
          <p className="eyebrow">State Enterprise Tracking and Unification</p>
          <h1>Executive Dashboard</h1>
          <p>
            Unified business identity, reviewer workload, activity status, and priority intelligence queries.
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-ghost demo-start" type="button" onClick={onStartDemo}>
            Walkthrough
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button className="btn-primary" type="button" onClick={() => onNavigate("queries")}>
            Run Karnataka Query
          </button>
        </div>
      </div>

      <div className="dashboard-compliance" aria-label="Prototype compliance controls">
        {dashboardCompliance.map((item) => (
          <span key={item}>
            <ShieldCheck size={13} aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>

      <div className="dashboard-metrics">
        {metrics.map((metric) => (
          <article className={`dashboard-metric metric-${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-panel impact-panel">
          <div className="panel-header compact">
            <span className="panel-title">Impact Summary</span>
          </div>
          <div className="impact-list">
            {impactItems.map((item) => (
              <div className="impact-item" key={item}>
                <ShieldCheck size={15} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel status-panel">
          <div className="panel-header compact">
            <span className="panel-title">Activity Status Mix</span>
          </div>
          <div className="status-bars">
            {statusDistribution.map((item) => (
              <div className="status-row" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="status-track">
                  <div style={{ width: `${item.count}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel featured-panel">
          <div className="panel-header compact">
            <span className="panel-title">Demo Identity</span>
            <button className="panel-link" type="button" onClick={() => onNavigate("ubid")}>
              Open UBID
            </button>
          </div>
          <div className="featured-ubid">
            <span>{featuredBusiness.ubid}</span>
            <strong>{featuredBusiness.name}</strong>
            <p>
              Confidence {featuredBusiness.confidence}% from identifier hash match, name similarity, same PIN evidence,
              and linked synthetic activity events.
            </p>
          </div>
        </article>

        <article className="dashboard-panel priority-panel">
          <div className="panel-header compact">
            <span className="panel-title">Pending Review Priority</span>
            <button className="panel-link" type="button" onClick={() => onNavigate("review")}>
              Review Queue
            </button>
          </div>
          <div className="priority-list">
            {priorityCases.map((item) => (
              <div className="priority-case" key={item.caseId}>
                <div>
                  <strong>{item.caseId}</strong>
                  <span>{item.title}</span>
                </div>
                <div>
                  <span className="conf-label">{item.confidence}%</span>
                  <span className={`status-pill ${item.priority === "High" ? "sp-closed" : "sp-review"}`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="module-shortcuts">
        {moduleShortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <button key={shortcut.id} type="button" onClick={() => onNavigate(shortcut.id)}>
              <Icon size={15} aria-hidden="true" />
              {shortcut.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ExecutiveDashboardScreen;
