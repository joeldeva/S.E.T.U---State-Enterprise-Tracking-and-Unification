import { GitCompareArrows, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchMatchCandidates,
  type MatchCandidate,
  type MatchingRunResponse,
  runEntityResolution,
} from "../lib/api";

const fallbackCandidates: MatchCandidate[] = [
  {
    _id: "match_demo_auto",
    record_a: "src_factories_102",
    record_b: "src_labour_778",
    departments: ["Factories", "Labour"],
    confidence: 100,
    decision_zone: "auto_link",
    explanation:
      "Auto-link recommended at 100% confidence based on GSTIN hash, PAN hash, same PIN, address similarity, and category match.",
  },
  {
    _id: "match_demo_review",
    record_a: "src_shops_512",
    record_b: "src_kspcb_622",
    departments: ["Shops & Establishments", "KSPCB"],
    confidence: 70,
    decision_zone: "review",
    explanation:
      "Human review required at 70% confidence because identifier hash and PIN agree, but name and address similarity are not strong enough.",
  },
  {
    _id: "match_demo_separate",
    record_a: "src_factories_901",
    record_b: "src_bescom_unmatched_001",
    departments: ["Factories", "BESCOM"],
    confidence: 0,
    decision_zone: "keep_separate",
    explanation:
      "Keep separate because there is no shared identifier hash, PIN differs, and normalized name/address evidence is weak.",
  },
];

const fallbackCounts = {
  auto_link: 4,
  review: 3,
  keep_separate: 32,
};

function zoneLabel(zone: MatchCandidate["decision_zone"]) {
  if (zone === "auto_link") return "Auto-link";
  if (zone === "review" || zone === "human_review") return "Review";
  return "Keep separate";
}

function zoneClass(zone: MatchCandidate["decision_zone"]) {
  if (zone === "auto_link") return "sp-active";
  if (zone === "review" || zone === "human_review") return "sp-review";
  return "sp-closed";
}

function confidenceColor(confidence: number) {
  if (confidence >= 90) return "#22B888";
  if (confidence >= 65) return "#F5A623";
  return "#E74C3C";
}

function EntityResolutionScreen() {
  const [candidates, setCandidates] = useState<MatchCandidate[]>(fallbackCandidates);
  const [counts, setCounts] = useState(fallbackCounts);
  const [status, setStatus] = useState("Fallback demo data loaded");
  const [isRunning, setIsRunning] = useState(false);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    fetchMatchCandidates()
      .then((records) => {
        if (records.length) {
          setCandidates(records.slice(0, 25));
          setCounts({
            auto_link: records.filter((candidate) => candidate.decision_zone === "auto_link").length,
            review: records.filter((candidate) => candidate.decision_zone === "review" || candidate.decision_zone === "human_review").length,
            keep_separate: records.filter((candidate) => candidate.decision_zone === "keep_separate").length,
          });
          setStatus("Loaded match candidates from backend");
          setIsFallback(false);
        }
      })
      .catch(() => {
        setStatus("Backend offline - using fallback demo data");
        setIsFallback(true);
      });
  }, []);

  async function handleRun() {
    setIsRunning(true);
    setStatus("Running local explainable matching...");

    try {
      const result: MatchingRunResponse = await runEntityResolution();
      setCandidates(result.match_candidates);
      setCounts(result.counts);
      setStatus(`Matching completed. ${result.summary.match_candidates} candidates scored locally.`);
      setIsFallback(false);
    } catch (error) {
      setCandidates(fallbackCandidates);
      setCounts(fallbackCounts);
      setStatus("Backend offline - fallback demo data preserved");
      setIsFallback(true);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="resolution-screen">
      <div className="resolution-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <GitCompareArrows size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Local deterministic + fuzzy scoring</p>
            <h1>Entity Resolution</h1>
            <p>
              Run explainable matching across synthetic department records. Strong matches auto-link, ambiguous
              candidates route to review, and weak evidence stays separate.
            </p>
          </div>
        </div>
        <button className="btn-primary" type="button" onClick={handleRun} disabled={isRunning}>
          <RefreshCw size={14} aria-hidden="true" className={isRunning ? "spin" : ""} />
          {isRunning ? "Running..." : "Run Entity Resolution"}
        </button>
      </div>

      <div className="governance-strip">
        <span>No hosted LLM calls</span>
        <span>No raw PAN/GSTIN exposed</span>
        <span>Explainable score breakdown</span>
        <span>Reviewer route for uncertainty</span>
      </div>

      <div className="resolution-status">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{status}</span>
        {isFallback ? <strong>Demo fallback</strong> : <strong>Backend connected</strong>}
      </div>

      <div className="resolution-metrics">
        <MetricCard label="Auto-link" value={counts.auto_link} tone="green" />
        <MetricCard label="Human review" value={counts.review} tone="amber" />
        <MetricCard label="Keep separate" value={counts.keep_separate} tone="red" />
      </div>

      <div className="candidate-panel">
        <div className="panel-header">
          <span className="panel-title">Match Candidates</span>
          <span className="panel-count">{candidates.length} shown</span>
        </div>
        <div className="candidate-list">
          {candidates.map((candidate) => (
            <article className="candidate-row" key={candidate._id}>
              <div className="candidate-main">
                <div className="candidate-records">
                  <span>{candidate.record_a}</span>
                  <span>{candidate.record_b}</span>
                </div>
                <p>{candidate.explanation}</p>
                {candidate.departments?.length ? (
                  <div className="dept-chips">
                    {candidate.departments.map((department) => (
                      <span className="dept-chip" key={`${candidate._id}-${department}`}>
                        {department}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="candidate-score">
                <span className={`status-pill ${zoneClass(candidate.decision_zone)}`}>
                  {zoneLabel(candidate.decision_zone)}
                </span>
                <div className="conf-bar-wide">
                  <div
                    className="conf-fill-mini"
                    style={{
                      width: `${candidate.confidence}%`,
                      background: confidenceColor(candidate.confidence),
                    }}
                  />
                </div>
                <span className="conf-label">{candidate.confidence}%</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
}

function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default EntityResolutionScreen;
