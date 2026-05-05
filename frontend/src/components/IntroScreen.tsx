import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [stage, setStage] = useState<"enter" | "exit">("enter");
  const [showButton, setShowButton] = useState(false);

  // Pre-computed stable particles (avoid random on every render)
  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${((i * 1637 + 311) % 10000) / 100}%`,
      top: `${((i * 2741 + 173) % 10000) / 100}%`,
      delay: `${((i * 0.17) % 5).toFixed(2)}s`,
      duration: `${(3 + (i % 6)).toFixed(1)}s`,
      size: (i % 3) + 1,
      opacity: 0.2 + (i % 5) * 0.1,
    })),
  []);

  useEffect(() => {
    const t1 = setTimeout(() => setShowButton(true), 2600);
    const t2 = setTimeout(() => setStage("exit"), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      className="intro-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: stage === "enter" ? 1 : 0 }}
      transition={{ duration: stage === "enter" ? 1.0 : 1.2, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (stage === "exit") onComplete();
      }}
    >
      {/* Animated perspective grid */}
      <div className="intro-grid" aria-hidden="true" />

      {/* Radial light bloom */}
      <div className="intro-bloom" aria-hidden="true" />
      <div className="intro-bloom intro-bloom-2" aria-hidden="true" />

      {/* Star particles */}
      <div className="intro-particles" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="intro-particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="intro-stage">
        {/* Karnataka Govt block */}
        <motion.div
          className="intro-logo-block"
          initial={{ opacity: 0, scale: 0.72, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="intro-glow-halo intro-halo-amber" />
          <div className="intro-logo-frame">
            <img
              src="/karnataka-emblem.png"
              alt="Government of Karnataka"
              className="intro-emblem"
            />
          </div>
          <motion.div
            className="intro-caption"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.8 }}
          >
            <span className="intro-caption-top">Government of</span>
            <strong className="intro-caption-name">Karnataka</strong>
          </motion.div>
        </motion.div>

        {/* Animated divider */}
        <motion.div
          className="intro-sep"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="intro-sep-dot" />
          <span className="intro-sep-line" />
          <span className="intro-sep-dot" />
        </motion.div>

        {/* SETU block */}
        <motion.div
          className="intro-logo-block"
          initial={{ opacity: 0, scale: 0.72, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="intro-glow-halo intro-halo-blue" />
          <div className="intro-logo-frame intro-logo-frame-setu">
            <img
              src="/setu-logo.png"
              alt="SETU"
              className="intro-setu"
            />
          </div>
          <motion.div
            className="intro-caption"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.8 }}
          >
            <strong className="intro-caption-name intro-setu-label">S · E · T · U</strong>
            <span className="intro-caption-sub">State Enterprise Tracking &amp; Unification</span>
          </motion.div>
        </motion.div>
      </div>

      {/* CTA button */}
      <motion.div
        className="intro-cta"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: showButton ? 1 : 0, y: showButton ? 0 : 22 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <button
          type="button"
          className="intro-enter-btn"
          onClick={() => setStage("exit")}
        >
          <span>Enter Platform</span>
          <span className="intro-arrow" aria-hidden="true">→</span>
        </button>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        className="intro-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1.4 }}
      >
        Unified Business Intelligence · Government of Karnataka
      </motion.p>
    </motion.div>
  );
}
