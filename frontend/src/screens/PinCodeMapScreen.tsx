import { motion } from "framer-motion";
import { AlertTriangle, MapPinned, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PinCodeMap from "../components/map/PinCodeMap";
import { fetchPinCodeSummary, type PinCodeSummary } from "../lib/api";

/**
 * Fallback data derived from the mock database CSV
 * (department_business_records.csv) + frontend seed businesses.
 *
 * CSV PINs (560001, 560037, 560058, 560064, 560066, 560068, 560076, 560100)
 * Seed PINs (560022, 562157, 563101, 570016, 572101)
 */
const fallbackPinData: PinCodeSummary[] = [
  // ── CSV mock-database PINs (Bengaluru cluster) ───────────────────────
  {
    pin_code: "560001",
    label: "Bengaluru Central",
    latitude: 12.9766,
    longitude: 77.5993,
    active_count: 8,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: ["BWSSB"],
  },
  {
    pin_code: "560022",
    label: "Yeshwanthpur",
    latitude: 13.0159,
    longitude: 77.5440,
    active_count: 5,
    dormant_count: 3,
    closed_count: 2,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["Factories", "Labour"],
  },
  {
    pin_code: "560037",
    label: "Jayanagar",
    latitude: 12.9279,
    longitude: 77.5828,
    active_count: 9,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: [],
  },
  {
    pin_code: "560058",
    label: "Peenya Industrial",
    latitude: 13.0314,
    longitude: 77.5149,
    active_count: 6,
    dormant_count: 3,
    closed_count: 3,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["BWSSB"],
  },
  {
    pin_code: "560064",
    label: "Rajajinagar",
    latitude: 12.9890,
    longitude: 77.5150,
    active_count: 8,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: ["KSPCB"],
  },
  {
    pin_code: "560066",
    label: "Whitefield",
    latitude: 12.9698,
    longitude: 77.7500,
    active_count: 7,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["Shops & Establishments"],
  },
  {
    pin_code: "560068",
    label: "Banaswadi",
    latitude: 13.0186,
    longitude: 77.6573,
    active_count: 9,
    dormant_count: 1,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: [],
  },
  {
    pin_code: "560076",
    label: "Bannerghatta Road",
    latitude: 12.8876,
    longitude: 77.5966,
    active_count: 7,
    dormant_count: 2,
    closed_count: 2,
    pending_review_count: 1,
    high_risk_count: 1,
    department_coverage_gaps: ["KSPCB", "Labour"],
  },
  {
    pin_code: "560100",
    label: "Electronic City",
    latitude: 12.8399,
    longitude: 77.6770,
    active_count: 10,
    dormant_count: 1,
    closed_count: 0,
    pending_review_count: 0,
    high_risk_count: 0,
    department_coverage_gaps: [],
  },
  // ── Frontend seed-business PINs ──────────────────────────────────────
  {
    pin_code: "562157",
    label: "Bengaluru Rural (Hoskote)",
    latitude: 13.0709,
    longitude: 77.7988,
    active_count: 3,
    dormant_count: 1,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: ["BWSSB"],
  },
  {
    pin_code: "563101",
    label: "Kolar",
    latitude: 13.1366,
    longitude: 78.1291,
    active_count: 4,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 2,
    high_risk_count: 1,
    department_coverage_gaps: ["Factories", "KSPCB"],
  },
  {
    pin_code: "570016",
    label: "Mysuru",
    latitude: 12.2947,
    longitude: 76.6193,
    active_count: 6,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 0,
    department_coverage_gaps: [],
  },
  {
    pin_code: "572101",
    label: "Tumakuru",
    latitude: 13.3379,
    longitude: 77.1013,
    active_count: 4,
    dormant_count: 2,
    closed_count: 1,
    pending_review_count: 1,
    high_risk_count: 1,
    department_coverage_gaps: ["Labour"],
  },
];

function totalBusinesses(s: PinCodeSummary) {
  return s.active_count + s.dormant_count + s.closed_count;
}

function PinCodeMapScreen() {
  const [pinData, setPinData] = useState<PinCodeSummary[]>(fallbackPinData);
  const [selectedPinCode, setSelectedPinCode] = useState("560058");
  const [statusText, setStatusText] = useState(
    `Showing ${fallbackPinData.length} PINs from mock database`,
  );
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    fetchPinCodeSummary()
      .then(liveRecords => {
        // Always start from the full fallback set (all 13 PINs).
        // Overlay any live backend records on top — backend may return fewer PINs
        // if it hasn't been restarted after PIN_METADATA was expanded.
        const merged: PinCodeSummary[] = fallbackPinData.map(fb => {
          const live = liveRecords.find(r => r.pin_code === fb.pin_code);
          return live ?? fb;
        });
        // Append any PIN codes the backend returned that aren't in our fallback
        liveRecords.forEach(r => {
          if (!merged.find(m => m.pin_code === r.pin_code)) merged.push(r);
        });
        merged.sort((a, b) => a.pin_code.localeCompare(b.pin_code));

        setPinData(merged);
        setSelectedPinCode(
          cur => merged.find(d => d.pin_code === cur)?.pin_code ?? merged[0].pin_code,
        );
        const liveCount = liveRecords.length;
        const fallbackCount = merged.length - liveRecords.filter(r =>
          fallbackPinData.find(f => f.pin_code === r.pin_code)
        ).length;
        setStatusText(
          liveCount > 0
            ? `Backend connected – ${liveCount} live PINs, ${merged.length - liveCount} from local data`
            : `Backend connected – all ${merged.length} PINs from local data`,
        );
        setIsFallback(false);
      })
      .catch(() => {
        setPinData(fallbackPinData);
        setStatusText(`Offline – ${fallbackPinData.length} PIN codes from mock database`);
        setIsFallback(true);
      });
  }, []);

  const selectedSummary = useMemo(
    () => pinData.find(d => d.pin_code === selectedPinCode) ?? pinData[0],
    [pinData, selectedPinCode],
  );

  const riskPins = useMemo(() => pinData.filter(p => p.high_risk_count > 0), [pinData]);

  const handleSelect = useCallback((s: PinCodeSummary) => {
    setSelectedPinCode(s.pin_code);
  }, []);

  return (
    <section className="pincode-map-screen">
      {/* Header */}
      <div className="map-screen-header">
        <div className="placeholder-hero">
          <div className="placeholder-icon">
            <MapPinned size={28} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">PIN-code intelligence · Karnataka</p>
            <h1>Interactive PIN-code Map</h1>
            <p>
              Click any marker to explore business activity, inspection gaps, and department
              coverage across Karnataka.
            </p>
          </div>
        </div>
        <label className="graph-selector">
          <span>Jump to PIN</span>
          <select value={selectedPinCode} onChange={e => setSelectedPinCode(e.target.value)}>
            {pinData.map(item => (
              <option key={item.pin_code} value={item.pin_code}>
                {item.pin_code} – {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Status */}
      <div className="resolution-status">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{statusText}</span>
        <strong>{isFallback ? "Demo data" : "Backend connected"}</strong>
      </div>

      {/* Risk alert */}
      {riskPins.length > 0 && (
        <motion.div
          className="map-risk-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <AlertTriangle size={14} />
          <span>
            <strong>{riskPins.length} PINs</strong> have high-risk inspection gaps:{" "}
            {riskPins.map(p => p.label).join(", ")}
          </span>
        </motion.div>
      )}

      {/* Map + panel */}
      <div className="map-layout">
        <div className="map-panel">
          <PinCodeMap
            data={pinData}
            selectedPinCode={selectedPinCode}
            onSelect={handleSelect}
          />
        </div>

        <aside className="pin-intel-panel">
          <motion.div
            key={selectedPinCode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28 }}
          >
            <div className="section-title">PIN-code Intelligence</div>

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
              <p>
                {selectedSummary.high_risk_count > 0
                  ? "Inspection prioritisation recommended."
                  : "No high-risk inspection gap in this PIN."}
              </p>
            </div>

            <div className="pin-coverage-card">
              <div className="section-title">Department coverage gaps</div>
              {selectedSummary.department_coverage_gaps.length ? (
                <div className="dept-chips">
                  {selectedSummary.department_coverage_gaps.map(gap => (
                    <span className="dept-chip" key={`${selectedSummary.pin_code}-${gap}`}>
                      {gap}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No coverage gaps in this PIN.</p>
              )}
            </div>

            <div className="review-refresh-note">
              Total classified businesses: {totalBusinesses(selectedSummary)}
            </div>
          </motion.div>
        </aside>
      </div>
    </section>
  );
}

function PinMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "orange";
}) {
  return (
    <div className={`pin-metric pin-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default PinCodeMapScreen;
