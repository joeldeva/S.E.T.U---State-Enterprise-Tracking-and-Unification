import type { LucideIcon } from "lucide-react";

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

const guardrails = [
  "Synthetic data only",
  "Source systems read-only",
  "Explainable decisions",
  "Reversible merges",
];

function PlaceholderScreen({ title, description, icon: Icon }: PlaceholderScreenProps) {
  return (
    <section className="placeholder-screen">
      <div className="placeholder-hero">
        <div className="placeholder-icon">
          <Icon size={28} aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Phase 1 route placeholder</p>
          <h1>{title}</h1>
          <p>{description}</p>
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
