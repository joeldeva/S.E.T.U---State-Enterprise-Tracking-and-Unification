import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [stage, setStage] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("exit");
    }, 2500); // Wait 2.5s before exiting

    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f1c] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: stage === "enter" ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (stage === "exit") {
          onComplete();
        }
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,78,216,0.22),transparent_48%),linear-gradient(135deg,#07101f_0%,#10182c_52%,#061225_100%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] bg-[#f59e0b]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <img
            src="/karnataka-emblem.png"
            alt="Government of Karnataka"
            className="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          />
          <h2 className="mt-6 text-white text-xl md:text-2xl font-bold tracking-wider uppercase drop-shadow-md text-center leading-tight">
            Government of<br/>Karnataka
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="hidden md:block w-[2px] h-40 bg-gradient-to-b from-transparent via-white/40 to-transparent"
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <img
            src="/setu-logo-intro.svg"
            alt="SETU Logo"
            className="w-48 h-40 md:w-72 md:h-56 object-contain drop-shadow-[0_22px_50px_rgba(59,130,246,0.36)]"
          />
          <h2 className="mt-6 text-[#8bbcff] text-xl md:text-2xl font-bold tracking-widest uppercase drop-shadow-md text-center">
            S.E.T.U
          </h2>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 text-slate-400 text-sm tracking-[0.2em] uppercase"
      >
        State Enterprise Tracking and Unification
      </motion.div>
    </motion.div>
  );
}
