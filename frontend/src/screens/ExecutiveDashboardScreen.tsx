import {
  Activity,
  ArrowRight,
  BrainCircuit,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  MapPinned,
  Send,
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
  { label: "Unmatched Events", value: "2", tone: "red" },
];

const reviewerLearning = {
  total: 42,
  approved: 26,
  rejected: 11,
  insufficient: 5,
  positivePatterns: ["same PIN + high name similarity + licence match", "same address + same owner name"],
  negativePatterns: ["same name but different PIN", "same address but conflicting GSTIN/PAN"],
};

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
  const reviewMetric = metrics.find((metric) => metric.label === "Pending verification") ?? metrics[2];
  const registryMetric = metrics.find((metric) => metric.label === "UBIDs generated") ?? metrics[1];
  const primaryMetric = Number(reviewMetric.value) > 0 ? reviewMetric : registryMetric;
  const secondaryMetrics = metrics.filter((metric) => metric.label !== primaryMetric.label);

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

      <div className="dashboard-metrics dashboard-kpi-layout">
        <article className={`dashboard-metric metric-primary metric-${primaryMetric.tone}`}>
          <span>Primary attention</span>
          <strong>{primaryMetric.value}</strong>
          <em>{primaryMetric.label}</em>
          <p>
            Non-zero review load is surfaced first so officers act before additional automated links are accepted.
          </p>
        </article>
        <div className="dashboard-secondary-metrics">
          {secondaryMetrics.map((metric) => (
            <article className={`dashboard-metric metric-${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
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

        <article className="dashboard-panel learning-panel">
          <div className="panel-header compact">
            <span className="panel-title">Reviewer Feedback Learning</span>
            <BrainCircuit size={15} aria-hidden="true" />
          </div>
          <div className="learning-card-body">
            <div className="learning-stats">
              <MiniStat label="Decisions" value={reviewerLearning.total} />
              <MiniStat label="Approved" value={reviewerLearning.approved} />
              <MiniStat label="Rejected" value={reviewerLearning.rejected} />
              <MiniStat label="Insufficient" value={reviewerLearning.insufficient} />
            </div>
            <p>
              Reviewer decisions are stored as labelled examples. In production, these recalibrate confidence weights
              and reduce future manual review load.
            </p>
            <div className="pattern-list">
              {[...reviewerLearning.positivePatterns, ...reviewerLearning.negativePatterns].map((pattern) => (
                <span key={pattern}>{pattern}</span>
              ))}
            </div>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="mini-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default ExecutiveDashboardScreen;
