import { ChevronDown, FileSearch, Play, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchPrebuiltQueries,
  runActiveFactoriesNoInspectionQuery,
  type ActiveFactoriesQueryResponse,
  type PrebuiltQuery,
  type QueryResultRow,
} from "../lib/api";

const fallbackQueries: PrebuiltQuery[] = [
  {
    id: "active-factories-no-inspection",
    title: "Active factories in PIN code 560058 with no inspection in 18 months",
    description: "Find active factory-linked UBIDs in a priority industrial PIN where inspection evidence is stale or missing.",
    risk_focus: "Inspection prioritization",
  },
  {
    id: "dormant-valid-pollution-consent",
    title: "Dormant businesses with valid pollution consent",
    description: "Identify businesses that look dormant but still carry active environmental consent.",
    risk_focus: "Consent cleanup",
  },
  {
    id: "utility-usage-expired-license",
    title: "Businesses with utility usage but expired license",
    description: "Spot live operations that may be running after registration or license expiry.",
    risk_focus: "Compliance anomaly",
  },
  {
    id: "active-in-one-missing-another",
    title: "Businesses active in one department but missing from another",
    description: "Find coverage gaps where one department sees activity and another has no linked record.",
    risk_focus: "Department coverage gap",
  },
  {
    id: "high-confidence-duplicate-clusters",
    title: "High-confidence duplicate clusters",
    description: "Review strong duplicate clusters before or after automatic UBID creation.",
    risk_focus: "Identity quality",
  },
  {
    id: "unmatched-activity-events",
    title: "Unmatched activity events",
    description: "Surface utility or compliance events that could not be joined to a UBID.",
    risk_focus: "Unregistered activity",
  },
];

const fallbackResponse: ActiveFactoriesQueryResponse = {
  query_id: "active-factories-no-inspection",
  title: "Active factories in PIN code 560058 with no inspection in the last 18 months",
  result_count: 1,
  results: [
    {
      ubid: "KA-UBID-A92F31C8D410",
      canonical_name: "Sri Lakshmi Engineering Works",
      pin_code: "560058",
      departments_linked: ["BESCOM", "Factories", "KSPCB", "Labour", "Shops & Establishments"],
      current_status: "Active",
      last_inspection_date: null,
      months_since_inspection: null,
      risk_level: "High",
      evidence: [
        "Current status is Active.",
        "Linked to Factories via src_factories_102.",
        "PIN 560058 found in normalized department records.",
        "No inspection event found for this UBID.",
      ],
    },
  ],
};

function riskClass(risk: QueryResultRow["risk_level"]) {
  if (risk === "High") return "sp-closed";
  if (risk === "Medium") return "sp-dormant";
  return "sp-active";
}

function BiQueryEngineScreen() {
  const [queries, setQueries] = useState<PrebuiltQuery[]>(fallbackQueries);
  const [selectedQuery, setSelectedQuery] = useState("active-factories-no-inspection");
  const [queryResponse, setQueryResponse] = useState<ActiveFactoriesQueryResponse>(fallbackResponse);
  const [expandedUbid, setExpandedUbid] = useState<string | null>(fallbackResponse.results[0].ubid);
  const [statusText, setStatusText] = useState("Fallback demo query loaded");
  const [isFallback, setIsFallback] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchPrebuiltQueries()
      .then((records) => {
        setQueries(records);
        setStatusText("Backend connected - prebuilt queries loaded");
        setIsFallback(false);
      })
      .catch(() => {
        setQueries(fallbackQueries);
        setStatusText("Backend offline - using fallback BI queries");
        setIsFallback(true);
      });
  }, []);

  async function handleRunQuery() {
    setIsRunning(true);
    setStatusText("Running government intelligence query...");

    try {
      const result = await runActiveFactoriesNoInspectionQuery();
      setQueryResponse(result);
      setExpandedUbid(result.results[0]?.ubid ?? null);
      setStatusText(`${result.result_count} result${result.result_count === 1 ? "" : "s"} returned from backend`);
      setIsFallback(false);
    } catch {
      setQueryResponse(fallbackResponse);
      setExpandedUbid(fallbackResponse.results[0].ubid);
      setStatusText("Backend offline - fallback query result preserved");
      setIsFallback(true);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="query-screen">
      <div className="query-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <FileSearch size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Government intelligence queries</p>
            <h1>BI Query Engine</h1>
            <p>
              Ask cross-department questions that only become possible after UBID linkage and explainable activity status.
            </p>
          </div>
        </div>
        <button className="btn-primary" type="button" onClick={() => void handleRunQuery()} disabled={isRunning}>
          <Play size={14} aria-hidden="true" />
          {isRunning ? "Running..." : "Run Query"}
        </button>
      </div>

      <div className="resolution-status">
        <ShieldAlert size={16} aria-hidden="true" />
        <span>{statusText}</span>
        <strong>{isFallback ? "Demo fallback" : "Backend connected"}</strong>
      </div>

      <div className="query-card-grid">
        {queries.map((query) => (
          <button
            className={`query-card ${query.id === selectedQuery ? "selected" : ""}`}
            key={query.id}
            type="button"
            onClick={() => setSelectedQuery(query.id)}
          >
            <span>{query.risk_focus}</span>
            <strong>{query.title}</strong>
            <p>{query.description}</p>
          </button>
        ))}
      </div>

      <div className="query-results-panel">
        <div className="panel-header">
          <span className="panel-title">{queryResponse.title}</span>
          <span className="panel-count">{queryResponse.result_count} result{queryResponse.result_count === 1 ? "" : "s"}</span>
        </div>
        <div className="query-table">
          <div className="query-table-head">
            <span>UBID</span>
            <span>Business</span>
            <span>PIN</span>
            <span>Status</span>
            <span>Last Inspection</span>
            <span>Risk</span>
          </div>
          {queryResponse.results.map((row) => (
            <div className={`query-result ${row.risk_level === "High" ? "high-risk" : ""}`} key={row.ubid}>
              <button
                className="query-table-row"
                type="button"
                onClick={() => setExpandedUbid((current) => (current === row.ubid ? null : row.ubid))}
              >
                <span className="mono-cell">{row.ubid}</span>
                <span>{row.canonical_name}</span>
                <span>{row.pin_code}</span>
                <span>{row.current_status}</span>
                <span>{row.last_inspection_date ?? "No inspection found"}</span>
                <span className={`status-pill ${riskClass(row.risk_level)}`}>{row.risk_level}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {expandedUbid === row.ubid ? (
                <div className="query-evidence">
                  <div>
                    <span className="section-title">Departments linked</span>
                    <div className="dept-chips">
                      {row.departments_linked.map((department) => (
                        <span className="dept-chip" key={`${row.ubid}-${department}`}>
                          {department}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="section-title">Evidence</span>
                    {row.evidence.map((item) => (
                      <p key={`${row.ubid}-${item}`}>{item}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {!queryResponse.results.length ? <div className="empty-state">No results for this query</div> : null}
        </div>
      </div>
    </section>
  );
}

export default BiQueryEngineScreen;
