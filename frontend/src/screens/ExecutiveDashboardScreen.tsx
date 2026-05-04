import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Database,
  FileSearch,
  Fingerprint,
  GitCompareArrows,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { guidedDemoSteps } from "../data/demoContent";
import { seedBusinesses } from "../data/seedBusinesses";
import type { ScreenId } from "../types";

interface ExecutiveDashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onStartDemo: () => void;
}

const metrics = [
  { label: "Total source records", value: "186", tone: "blue" },
  { label: "Departments connected", value: "5", tone: "purple" },
  { label: "UBIDs generated", value: "92", tone: "green" },
  { label: "Pending human reviews", value: "18", tone: "amber" },
  { label: "Active businesses", value: "61", tone: "green" },
  { label: "Dormant businesses", value: "22", tone: "amber" },
  { label: "Closed businesses", value: "9", tone: "red" },
  { label: "Unmatched activity events", value: "11", tone: "orange" },
];

const impactItems = [
  "One UBID across departments",
  "Active/Dormant/Closed status with evidence",
  "Ambiguous matches routed to officers",
  "Queries previously impossible are now possible",
  "Works without modifying department systems",
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
  { id: "ingestion", label: "Ingest", icon: Database },
  { id: "normalization", label: "Normalize", icon: ShieldCheck },
  { id: "resolution", label: "Resolve", icon: GitCompareArrows },
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
          <p className="eyebrow">Karnataka Business Intelligence Grid</p>
          <h1>K-BIG control room</h1>
          <p>
            A read-only intelligence layer that assigns one trusted UBID per business, explains each linkage decision,
            and classifies activity status from synthetic government events.
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-primary demo-start" type="button" onClick={onStartDemo}>
            Start Guided Demo
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button className="btn-ghost" type="button" onClick={() => onNavigate("queries")}>
            Run Karnataka Query
          </button>
        </div>
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

      <div className="demo-flow-panel">
        <div className="panel-header compact">
          <span className="panel-title">Guided Demo Flow</span>
          <span className="panel-count">10 judge scenes</span>
        </div>
        <div className="demo-flow-list">
          {guidedDemoSteps.map((step, index) => (
            <button className="demo-flow-step" key={step.id} type="button" onClick={() => onNavigate(step.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>
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
