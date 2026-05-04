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
import { guidedDemoSteps } from "./data/demoContent";
import ActivityIntelligenceScreen from "./screens/ActivityIntelligenceScreen";
import AuditLogsScreen from "./screens/AuditLogsScreen";
import BiQueryEngineScreen from "./screens/BiQueryEngineScreen";
import EntityResolutionScreen from "./screens/EntityResolutionScreen";
import ExecutiveDashboardScreen from "./screens/ExecutiveDashboardScreen";
import IdentityGraphScreen from "./screens/IdentityGraphScreen";
import PlaceholderScreen from "./screens/PlaceholderScreen";
import PinCodeMapScreen from "./screens/PinCodeMapScreen";
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
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [isGuidedDemo, setIsGuidedDemo] = useState(false);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);

  const activeDefinition = useMemo(
    () => screens.find((screen) => screen.id === activeScreen) ?? screens[0],
    [activeScreen],
  );

  function navigate(screen: ScreenId) {
    setActiveScreen(screen);

    const stepIndex = guidedDemoSteps.findIndex((step) => step.id === screen);
    if (stepIndex >= 0) {
      setGuidedStepIndex(stepIndex);
    }
  }

  function startGuidedDemo() {
    setIsGuidedDemo(true);
    setGuidedStepIndex(0);
    setActiveScreen(guidedDemoSteps[0].id);
  }

  function moveGuidedDemo(delta: -1 | 1) {
    setGuidedStepIndex((current) => {
      const next = Math.max(0, Math.min(guidedDemoSteps.length - 1, current + delta));
      setActiveScreen(guidedDemoSteps[next].id);
      return next;
    });
  }

  function endGuidedDemo() {
    setIsGuidedDemo(false);
    setActiveScreen("dashboard");
  }

  const currentStep = guidedDemoSteps[guidedStepIndex];

  return (
    <AppShell
      screens={screens}
      activeScreen={activeScreen}
      activeTitle={activeDefinition.label}
      onNavigate={navigate}
      guidedDemo={{
        enabled: isGuidedDemo,
        currentIndex: guidedStepIndex,
        total: guidedDemoSteps.length,
        currentLabel: currentStep.label,
        canPrevious: guidedStepIndex > 0,
        canNext: guidedStepIndex < guidedDemoSteps.length - 1,
        onPrevious: () => moveGuidedDemo(-1),
        onNext: () => moveGuidedDemo(1),
        onEnd: endGuidedDemo,
      }}
    >
      {activeScreen === "dashboard" ? (
        <ExecutiveDashboardScreen onNavigate={navigate} onStartDemo={startGuidedDemo} />
      ) : activeScreen === "ubid" ? (
        <UbidRegistry onNavigate={navigate} />
      ) : activeScreen === "resolution" ? (
        <EntityResolutionScreen />
      ) : activeScreen === "review" ? (
        <ReviewQueueScreen />
      ) : activeScreen === "activity" ? (
        <ActivityIntelligenceScreen />
      ) : activeScreen === "queries" ? (
        <BiQueryEngineScreen />
      ) : activeScreen === "graph" ? (
        <IdentityGraphScreen />
      ) : activeScreen === "map" ? (
        <PinCodeMapScreen />
      ) : activeScreen === "audit" ? (
        <AuditLogsScreen />
      ) : (
        <PlaceholderScreen
          icon={activeDefinition.icon ?? BarChart3}
          title={activeDefinition.label}
          description={placeholderCopy[activeScreen]}
          onNavigate={navigate}
        />
      )}
    </AppShell>
  );
}

export default App;
