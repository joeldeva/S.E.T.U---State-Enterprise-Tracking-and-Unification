import { MapPinned, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PinCodeMap from "../components/map/PinCodeMap";
import { fetchPinCodeSummary, type PinCodeSummary } from "../lib/api";

const fallbackPinData: PinCodeSummary[] = [
  {
    pin_code: "560058",
    label: "Peenya",
    latitude: 13.0314,
    longitude: 77.5149,
    active_count: 1,
    dormant_count: 0,
    closed_count: 0,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["BWSSB"],
  },
  {
    pin_code: "560001",
    label: "Bengaluru Central",
    latitude: 12.9766,
    longitude: 77.5993,
    active_count: 4,
    dormant_count: 1,
    closed_count: 0,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: ["Factories"],
  },
  {
    pin_code: "560076",
    label: "Bannerghatta Road",
    latitude: 12.8876,
    longitude: 77.5966,
    active_count: 2,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 1,
    department_coverage_gaps: ["KSPCB", "Labour"],
  },
  {
    pin_code: "560100",
    label: "Electronic City",
    latitude: 12.8399,
    longitude: 77.677,
    active_count: 5,
    dormant_count: 1,
    closed_count: 0,
    pending_review_count: 0,
    high_risk_count: 0,
    department_coverage_gaps: [],
  },
  {
    pin_code: "560066",
    label: "Whitefield",
    latitude: 12.9698,
    longitude: 77.75,
    active_count: 3,
    dormant_count: 1,
    closed_count: 1,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["Shops & Establishments"],
  },
];

function totalBusinesses(summary: PinCodeSummary) {
  return summary.active_count + summary.dormant_count + summary.closed_count;
}

function PinCodeMapScreen() {
  const [pinData, setPinData] = useState<PinCodeSummary[]>(fallbackPinData);
  const [selectedPinCode, setSelectedPinCode] = useState("560058");
  const [statusText, setStatusText] = useState("Fallback synthetic PIN-code map loaded");
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    fetchPinCodeSummary()
      .then((records) => {
        const data = records.length ? records : fallbackPinData;
        setPinData(data);
        setSelectedPinCode((current) => data.find((item) => item.pin_code === current)?.pin_code ?? data[0].pin_code);
        setStatusText(`Backend connected - ${data.length} PIN summaries loaded`);
        setIsFallback(false);
      })
      .catch(() => {
        setPinData(fallbackPinData);
        setSelectedPinCode("560058");
        setStatusText("Backend offline - using fallback synthetic PIN-code summaries");
        setIsFallback(true);
      });
  }, []);

  const selectedSummary = useMemo(
    () => pinData.find((item) => item.pin_code === selectedPinCode) ?? pinData[0],
    [pinData, selectedPinCode],
  );

  return (
    <section className="pincode-map-screen">
      <div className="map-screen-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <MapPinned size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">PIN-code intelligence only</p>
            <h1>PIN-code Map</h1>
            <p>
              View synthetic PIN-level business activity, review pressure, high-risk inspection gaps, and department coverage gaps.
            </p>
          </div>
        </div>
        <label className="graph-selector">
          <span>Selected PIN</span>
          <select value={selectedPinCode} onChange={(event) => setSelectedPinCode(event.target.value)}>
            {pinData.map((item) => (
              <option key={item.pin_code} value={item.pin_code}>
                {item.pin_code} - {item.label}
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

      <div className="map-layout">
        <div className="map-panel">
          <PinCodeMap
            data={pinData}
            selectedPinCode={selectedPinCode}
            onSelect={(summary) => setSelectedPinCode(summary.pin_code)}
          />
        </div>

        <aside className="pin-intel-panel">
          <div className="section-title">PIN-code intelligence</div>
          <div className="pin-title">
            <span>{selectedSummary.pin_code}</span>
            <strong>{selectedSummary.label}</strong>
          </div>

          <div className="pin-metric-grid">
            <PinMetric label="Active" value={selectedSummary.active_count} tone="green" />
            <PinMetric label="Dormant" value={selectedSummary.dormant_count} tone="amber" />
            <PinMetric label="Closed" value={selectedSummary.closed_count} tone="red" />
            <PinMetric label="Pending Review" value={selectedSummary.pending_review_count} tone="orange" />
          </div>

          <div className="pin-risk-card">
            <span>No-inspection risk count</span>
            <strong>{selectedSummary.high_risk_count}</strong>
            <p>{selectedSummary.high_risk_count > 0 ? "Inspection prioritization recommended." : "No high-risk inspection gap in this PIN."}</p>
          </div>

          <div className="pin-coverage-card">
            <div className="section-title">Department coverage gaps</div>
            {selectedSummary.department_coverage_gaps.length ? (
              <div className="dept-chips">
                {selectedSummary.department_coverage_gaps.map((gap) => (
                  <span className="dept-chip" key={`${selectedSummary.pin_code}-${gap}`}>
                    {gap}
                  </span>
                ))}
              </div>
            ) : (
              <p>No obvious coverage gaps in synthetic summary.</p>
            )}
          </div>

          <div className="review-refresh-note">
            Total classified businesses in PIN: {totalBusinesses(selectedSummary)}
          </div>
        </aside>
      </div>
    </section>
  );
}

function PinMetric({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "orange" }) {
  return (
    <div className={`pin-metric pin-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default PinCodeMapScreen;
