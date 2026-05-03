import type { LucideIcon } from "lucide-react";
import type { ScreenId } from "../types";

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onNavigate: (screen: ScreenId) => void;
}

const guardrails = [
  "Synthetic data only",
  "Source systems read-only",
  "Explainable decisions",
  "Reversible merges",
];

function PlaceholderScreen({ title, description, icon: Icon, onNavigate }: PlaceholderScreenProps) {
  return (
    <section className="placeholder-screen">
      <div className="placeholder-hero">
        <div className="placeholder-icon">
          <Icon size={28} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Judge-ready module placeholder</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="empty-state enhanced">
        <strong>Demo-ready state</strong>
        <p>
          This module is wired into the guided flow and reserved for the next implementation depth. The judge-facing
          proof, compliance guardrails, and navigation are already visible without changing source-system data.
        </p>
        <div className="empty-actions">
          <button className="btn-primary" type="button" onClick={() => onNavigate("ubid")}>
            Open UBID Registry
          </button>
          <button className="btn-ghost" type="button" onClick={() => onNavigate("queries")}>
            Open BI Query
          </button>
        </div>
      </div>

      <div className="placeholder-grid">
        {guardrails.map((item) => (
          <div className="info-tile" key={item}>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PlaceholderScreen;
