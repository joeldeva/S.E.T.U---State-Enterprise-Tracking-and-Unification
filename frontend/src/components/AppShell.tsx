import { ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import FloatingDataAssistant from "./FloatingDataAssistant";
import type { ScreenDefinition, ScreenId } from "../types";

interface GuidedDemoState {
  enabled: boolean;
  currentIndex: number;
  total: number;
  currentLabel: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onEnd: () => void;
}

interface AppShellProps {
  screens: ScreenDefinition[];
  activeScreen: ScreenId;
  activeTitle: string;
  onNavigate: (screen: ScreenId) => void;
  guidedDemo: GuidedDemoState;
  children: ReactNode;
}

function AppShell({
  screens,
  activeScreen,
  activeTitle,
  onNavigate,
  guidedDemo,
  children,
}: AppShellProps) {
  const sections = ["Core", "Intelligence", "Governance"] as const;

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="logo" type="button" onClick={() => onNavigate("dashboard")}>
          <img className="logo-mark" src="/setu-logo-mark.svg" alt="SETU" />
          <div>
            <div className="logo-text">SETU</div>
            <div className="logo-sub">Karnataka</div>
          </div>
        </button>

        <nav className="nav" aria-label="S.E.T.U modules">
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {screens
                .filter((screen) => screen.section === section && !screen.hidden)
                .map((screen) => {
                  const Icon = screen.icon;
                  const isActive = screen.id === activeScreen;

                  return (
                    <button
                      className={`nav-item ${isActive ? "active" : ""}`}
                      type="button"
                      key={screen.id}
                      onClick={() => onNavigate(screen.id)}
                    >
                      <Icon className="nav-icon" aria-hidden="true" />
                      <span>{screen.label}</span>
                      {screen.badge ? <span className="nav-badge">{screen.badge}</span> : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="topbar-title">{activeTitle}</span>
          <div className="topbar-right">
            <label className="ubid-search" htmlFor="globalSearch">
              <Search className="search-ico" aria-hidden="true" />
              <input id="globalSearch" type="text" placeholder="Search by name, UBID, source ID" />
            </label>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => window.alert("Export placeholder for the Phase 1 frontend shell.")}
            >
              <Download size={14} aria-hidden="true" />
              Export
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => onNavigate("ingestion")}
            >
              Submit Business
            </button>
          </div>
        </header>

        {guidedDemo.enabled ? (
          <section className="guided-demo-bar" aria-label="Guided demo controls">
            <div>
              <span className="guided-step-count">
                Step {guidedDemo.currentIndex + 1} of {guidedDemo.total}
              </span>
              <strong>{guidedDemo.currentLabel}</strong>
            </div>
            <div className="guided-controls">
              <button className="btn-ghost" type="button" onClick={guidedDemo.onPrevious} disabled={!guidedDemo.canPrevious}>
                <ChevronLeft size={14} aria-hidden="true" />
                Previous
              </button>
              <button className="btn-primary" type="button" onClick={guidedDemo.onNext} disabled={!guidedDemo.canNext}>
                Next
                <ChevronRight size={14} aria-hidden="true" />
              </button>
              <button className="icon-button" type="button" onClick={guidedDemo.onEnd} aria-label="End guided demo">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        <div className="content">{children}</div>
      </main>
      <FloatingDataAssistant />
    </div>
  );
}

export default AppShell;
