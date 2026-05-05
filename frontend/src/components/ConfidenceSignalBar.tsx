import type { CSSProperties } from "react";

export interface ConfidenceSignal {
  label: string;
  points: number;
  maxPoints: number;
  color: string;
}

export interface ConfidenceSignalDraft {
  label: string;
  maxPoints: number;
  ratio: number;
  color: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildNormalizedSignals(drafts: ConfidenceSignalDraft[], targetScore: number): ConfidenceSignal[] {
  const totalMax = drafts.reduce((sum, signal) => sum + signal.maxPoints, 0);
  const target = Math.round(clamp(targetScore, 0, totalMax));
  const points = drafts.map((signal) =>
    Math.round(clamp(signal.ratio, 0, 1) * signal.maxPoints),
  );

  let current = points.reduce((sum, value) => sum + value, 0);
  let guard = 0;

  while (current < target && guard < 300) {
    const next = drafts
      .map((signal, index) => ({
        index,
        headroom: signal.maxPoints - points[index],
        priority: clamp(signal.ratio, 0, 1),
      }))
      .filter((signal) => signal.headroom > 0)
      .sort((a, b) => b.priority - a.priority || b.headroom - a.headroom)[0];

    if (!next) break;
    points[next.index] += 1;
    current += 1;
    guard += 1;
  }

  while (current > target && guard < 600) {
    const next = drafts
      .map((signal, index) => ({
        index,
        points: points[index],
        priority: clamp(signal.ratio, 0, 1),
      }))
      .filter((signal) => signal.points > 0)
      .sort((a, b) => a.priority - b.priority || b.points - a.points)[0];

    if (!next) break;
    points[next.index] -= 1;
    current -= 1;
    guard += 1;
  }

  return drafts.map((signal, index) => ({
    label: signal.label,
    maxPoints: signal.maxPoints,
    points: points[index],
    color: signal.color,
  }));
}

interface ConfidenceSignalBarProps {
  score: number;
  signals: ConfidenceSignal[];
  title?: string;
  compact?: boolean;
}

function ConfidenceSignalBar({ score, signals, title = "Confidence evidence", compact = false }: ConfidenceSignalBarProps) {
  const totalMax = signals.reduce((sum, signal) => sum + signal.maxPoints, 0) || 100;
  const roundedScore = Math.round(score);
  const label = signals
    .map((signal) => `${signal.label} ${signal.points} of ${signal.maxPoints}`)
    .join(", ");

  return (
    <div
      className={`signal-breakdown ${compact ? "compact" : ""}`}
      aria-label={`${title}: ${roundedScore} out of ${totalMax}. ${label}`}
    >
      <div className="signal-header">
        <span>{title}</span>
        <strong>{roundedScore}/{totalMax}</strong>
      </div>
      <div className="signal-track" aria-hidden="true">
        {signals.map((signal) => {
          const style = {
            "--signal-color": signal.color,
            "--signal-fill": `${clamp((signal.points / signal.maxPoints) * 100, 0, 100)}%`,
            flexBasis: `${(signal.maxPoints / totalMax) * 100}%`,
          } as CSSProperties & {
            "--signal-color": string;
            "--signal-fill": string;
          };

          return (
            <div
              className={`signal-segment ${signal.points === 0 ? "empty" : ""}`}
              key={signal.label}
              style={style}
            >
              <div className="signal-fill" />
              <span className="signal-label">{signal.label}</span>
            </div>
          );
        })}
      </div>
      <div className="signal-legend">
        {signals.map((signal) => (
          <span className="signal-chip" key={`${signal.label}-legend`}>
            <i style={{ background: signal.color }} aria-hidden="true" />
            {signal.label} {signal.points}pts
          </span>
        ))}
      </div>
    </div>
  );
}

export default ConfidenceSignalBar;
