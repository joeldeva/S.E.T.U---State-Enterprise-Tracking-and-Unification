import { ExternalLink, GitFork, History, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { seedBusinesses } from "../data/seedBusinesses";
import type { BusinessRecord, BusinessStatus, ScreenId } from "../types";

interface UbidRegistryProps {
  onNavigate: (screen: ScreenId) => void;
}

function statusPill(status: BusinessStatus) {
  if (status === "active") return "sp-active";
  if (status === "dormant") return "sp-dormant";
  if (status === "review") return "sp-review";
  return "sp-closed";
}

function confidenceColor(confidence: number) {
  if (confidence >= 85) return "#047857";
  if (confidence >= 65) return "#B45309";
  return "#B91C1C";
}

function displayHash(hash: string) {
  const parts = hash.split("_");
  return `HASH-${(parts[parts.length - 1] ?? "demo").toUpperCase()}`;
}

function UbidRegistry({ onNavigate }: UbidRegistryProps) {
  const [selectedId, setSelectedId] = useState(0);
  const [query, setQuery] = useState("");
  const selectedBusiness = seedBusinesses.find((business) => business.id === selectedId) ?? seedBusinesses[0];

  const filteredBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return seedBusinesses;

    return seedBusinesses.filter((business) => {
      const sourceMatch = business.sources.some((source) => source.id.toLowerCase().includes(normalizedQuery));

      return (
        business.name.toLowerCase().includes(normalizedQuery) ||
        business.ubid.toLowerCase().includes(normalizedQuery) ||
        displayHash(business.gstinHash).toLowerCase().includes(normalizedQuery) ||
        sourceMatch
      );
    });
  }, [query]);

  return (
    <div className="split">
      <aside className="left-panel">
        <div className="panel-header">
          <span className="panel-title">Results</span>
          <span className="panel-count">
            {filteredBusinesses.length} record{filteredBusinesses.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="local-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter UBIDs, names, source IDs"
            type="search"
          />
        </div>
        <div>
          {filteredBusinesses.map((business) => (
            <button
              className={`result-item ${business.id === selectedId ? "selected" : ""}`}
              key={business.ubid}
              type="button"
              onClick={() => setSelectedId(business.id)}
            >
              <div className="ri-top">
                <div className="ri-name">{business.name}</div>
              </div>
              <div className="ri-ubid">{business.ubid}</div>
              <div className="ri-meta">
                <span className={`status-pill ${statusPill(business.status)}`}>{business.status}</span>
                <div className="conf-bar-mini">
                  <div
                    className="conf-fill-mini"
                    style={{
                      width: `${business.confidence}%`,
                      background: confidenceColor(business.confidence),
                    }}
                  />
                </div>
                <span className="conf-label">{business.confidence}%</span>
              </div>
              <div className="dept-chips">
                {business.sources
                  .filter((source) => source.status === "linked")
                  .map((source) => (
                    <span className="dept-chip" key={`${business.ubid}-${source.name}`}>
                      {source.name.split(" ")[0]}
                    </span>
                  ))}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="right-panel">
        <BusinessDetail business={selectedBusiness} onNavigate={onNavigate} />
      </section>
    </div>
  );
}

interface BusinessDetailProps {
  business: BusinessRecord;
  onNavigate: (screen: ScreenId) => void;
}

function BusinessDetail({ business, onNavigate }: BusinessDetailProps) {
  const linked = business.sources.filter((source) => source.status === "linked").length;
  const partial = business.sources.filter((source) => source.status === "partial").length;
  const missing = business.sources.length - linked - partial;

  return (
    <>
      <div className="tabs">
        <button className="tab active" type="button">
          Identity record
        </button>
        <button className="tab" type="button" onClick={() => onNavigate("graph")}>
          Source links
        </button>
        <button className="tab" type="button" onClick={() => onNavigate("audit")}>
          Audit trail
        </button>
      </div>

      <div className="detail-wrap">
        <div className="governance-strip">
          <span>Synthetic data only</span>
          <span>No raw PAN/GSTIN exposed</span>
          <span>Read-only source layer</span>
          <span>Reversible merge concept</span>
        </div>

        <div className="ubid-card">
          <div className="ubid-card-top">
            <div>
              <div className="ubid-name">{business.name}</div>
              <div className="ubid-id">{business.ubid}</div>
            </div>
            <div className={`ubid-status-big status-pill ${statusPill(business.status)}`}>
              {business.status}
            </div>
          </div>

          <div className="ubid-meta-row">
            <MetaCell label="Anchor" value={business.anchorType} />
            <MetaCell label="GSTIN hash" value={displayHash(business.gstinHash)} />
            <MetaCell label="PAN hash" value={displayHash(business.panHash)} />
            <MetaCell label="Confidence" value={`${business.confidence}%`} color={confidenceColor(business.confidence)} />
            <MetaCell label="Type" value={business.type} />
            <MetaCell label="District" value={business.district} />
            <MetaCell label="Active since" value={business.since} />
            <MetaCell label="Source type" value="department_ingested" />
            <MetaCell label="UBID status" value={business.status === "review" ? "needs_review" : "verified"} />
            <MetaCell label="Review status" value={business.status === "review" ? "Officer review" : "reviewer_verified"} />
          </div>
        </div>

        <div>
          <div className="section-title">
            Department source links - {linked} linked / {partial} partial / {missing} missing
          </div>
          <div className="sources-grid">
            {business.sources.map((source) => (
              <button
                className={`source-row ${source.status}`}
                key={`${business.ubid}-${source.name}`}
                type="button"
                onClick={() => onNavigate(source.status === "partial" ? "review" : "graph")}
              >
                <div
                  className="src-icon"
                  style={{
                    background: source.status === "missing" ? "var(--surface3)" : `${source.color}22`,
                    color: source.color,
                  }}
                >
                  {source.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="src-body">
                  <div className="src-name">{source.name}</div>
                  <div className="src-id">{source.id}</div>
                </div>
                <div className="src-right">
                  {source.status !== "missing" ? (
                    <div className="src-conf" style={{ color: confidenceColor(source.confidence) }}>
                      {source.confidence}%
                    </div>
                  ) : (
                    <div className="src-conf missing-conf">None</div>
                  )}
                  <div className="src-date">{source.date}</div>
                  <div className={`src-link-badge slb-${source.status}`}>{source.status}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="two-column-detail">
          <div>
            <div className="section-title">Match explainability - why {business.confidence}% confidence?</div>
            <div className="explain-box">
              {business.explain.map((factor) => (
                <div className="explain-row" key={`${business.ubid}-${factor.factor}`}>
                  <div className="explain-factor">{factor.factor}</div>
                  <div className="explain-bar">
                    <div
                      className="explain-fill"
                      style={{
                        width: `${factor.score}%`,
                        background: factor.color,
                      }}
                    />
                  </div>
                  <div className="explain-score" style={{ color: factor.color }}>
                    {factor.score}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title">Identity graph preview</div>
            <div className="graph-wrap">
              <div className="graph-center">
                <ShieldCheck size={18} aria-hidden="true" />
                UBID
              </div>
              {business.sources.slice(0, 5).map((source, index) => (
                <div className={`graph-node node-${index + 1} ${source.status}`} key={`${business.ubid}-node-${source.name}`}>
                  {source.name.split(" ")[0]}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-title">Activity timeline</div>
          <div className="timeline">
            {business.timeline.map((item, index) => (
              <div className="tl-item" key={`${business.ubid}-${item.title}`}>
                <div className="tl-line-col">
                  <div className="tl-dot" style={{ background: item.dot }} />
                  {index < business.timeline.length - 1 ? <div className="tl-line" /> : null}
                </div>
                <div className="tl-body">
                  <div className="tl-title">{item.title}</div>
                  <div className="tl-meta">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="action-row">
          <button className="btn-ghost" type="button" onClick={() => onNavigate("audit")}>
            <History size={14} aria-hidden="true" />
            View audit log
          </button>
          <button className="btn-ghost" type="button" onClick={() => onNavigate("graph")}>
            <GitFork size={14} aria-hidden="true" />
            Identity graph
          </button>
          {business.status === "review" ? (
            <button className="btn-primary" type="button" onClick={() => onNavigate("review")}>
              <ExternalLink size={14} aria-hidden="true" />
              Open review
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

interface MetaCellProps {
  label: string;
  value: string;
  color?: string;
}

function MetaCell({ label, value, color }: MetaCellProps) {
  return (
    <div className="meta-cell">
      <div className="meta-label">{label}</div>
      <div className="meta-val" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

export default UbidRegistry;
