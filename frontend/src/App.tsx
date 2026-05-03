import {
  Activity,
  BarChart3,
  ClipboardCheck,
  Database,
  FileSearch,
  Fingerprint,
  GitCompareArrows,
  GitFork,
  LayoutDashboard,
  MapPinned,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import ActivityIntelligenceScreen from "./screens/ActivityIntelligenceScreen";
import BiQueryEngineScreen from "./screens/BiQueryEngineScreen";
import EntityResolutionScreen from "./screens/EntityResolutionScreen";
import PlaceholderScreen from "./screens/PlaceholderScreen";
import ReviewQueueScreen from "./screens/ReviewQueueScreen";
import UbidRegistry from "./screens/UbidRegistry";
import type { ScreenDefinition, ScreenId } from "./types";

const screens: ScreenDefinition[] = [
  { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard, section: "Core" },
  { id: "ubid", label: "UBID Registry", icon: Fingerprint, section: "Core" },
  { id: "ingestion", label: "Department Ingestion", icon: Database, section: "Core" },
  { id: "normalization", label: "Normalization Engine", icon: SlidersHorizontal, section: "Core" },
  { id: "resolution", label: "Entity Resolution", icon: GitCompareArrows, section: "Core" },
  { id: "review", label: "Review Queue", icon: ClipboardCheck, section: "Governance", badge: "12" },
  { id: "activity", label: "Activity Intelligence", icon: Activity, section: "Intelligence" },
  { id: "queries", label: "BI Query Engine", icon: FileSearch, section: "Intelligence" },
  { id: "graph", label: "Identity Graph", icon: GitFork, section: "Intelligence" },
  { id: "map", label: "PIN-code Map", icon: MapPinned, section: "Intelligence" },
  { id: "audit", label: "Audit Logs", icon: ScrollText, section: "Governance" },
];

const placeholderCopy: Record<Exclude<ScreenId, "ubid">, string> = {
  dashboard: "State-wide business intelligence summary with source counts, status mix, confidence distribution, and review pressure.",
  ingestion: "Read-only department feeds, raw previews, schema mapping status, and quality warnings.",
  normalization: "Before-and-after cleaning for names, addresses, PIN codes, phone/email fields, and hashed identifiers.",
  resolution: "Explainable match candidates using deterministic anchors, fuzzy scores, conflict checks, and decision zones.",
  review: "Officer workflow for ambiguous cases with approve, reject, attach, create UBID, and audit actions.",
  activity: "Active, Dormant, Closed, and Insufficient Data classification from filings, renewals, inspections, and utility signals.",
  queries: "Government intelligence questions such as active factories in PIN 560058 with no inspection in the last 18 months.",
  graph: "UBID-centered identity graph with department records as explainable linked nodes.",
  map: "PIN-code level business density, status clusters, inspection gaps, and department coverage gaps.",
  audit: "Append-only trail for automated decisions, reviewer actions, reversals, and status changes.",
};

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("ubid");

  const activeDefinition = useMemo(
    () => screens.find((screen) => screen.id === activeScreen) ?? screens[1],
    [activeScreen],
  );

  return (
    <AppShell
      screens={screens}
      activeScreen={activeScreen}
      activeTitle={activeDefinition.label}
      onNavigate={setActiveScreen}
    >
      {activeScreen === "ubid" ? (
        <UbidRegistry onNavigate={setActiveScreen} />
      ) : activeScreen === "resolution" ? (
        <EntityResolutionScreen />
      ) : activeScreen === "review" ? (
        <ReviewQueueScreen />
      ) : activeScreen === "activity" ? (
        <ActivityIntelligenceScreen />
      ) : activeScreen === "queries" ? (
        <BiQueryEngineScreen />
      ) : (
        <PlaceholderScreen
          icon={activeDefinition.icon ?? BarChart3}
          title={activeDefinition.label}
          description={placeholderCopy[activeScreen]}
        />
      )}
    </AppShell>
  );
}

export default App;
