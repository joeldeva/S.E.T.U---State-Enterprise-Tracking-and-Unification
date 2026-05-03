import { Download, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { ScreenDefinition, ScreenId } from "../types";

interface AppShellProps {
  screens: ScreenDefinition[];
  activeScreen: ScreenId;
  activeTitle: string;
  onNavigate: (screen: ScreenId) => void;
  children: ReactNode;
}

function AppShell({ screens, activeScreen, activeTitle, onNavigate, children }: AppShellProps) {
  const sections = ["Core", "Intelligence", "Governance"] as const;

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="logo" type="button" onClick={() => onNavigate("dashboard")}>
          <div className="logo-hex">K</div>
          <div>
            <div className="logo-text">K-BIG</div>
            <div className="logo-sub">Karnataka</div>
          </div>
        </button>

        <nav className="nav" aria-label="K-BIG modules">
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {screens
                .filter((screen) => screen.section === section)
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
              onClick={() => window.alert("New UBID creation starts in a later phase.")}
            >
              New UBID
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;
