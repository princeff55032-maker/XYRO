"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LETTERS = ["X", "Y", "R", "O"];

export function IntroOverlay() {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<"loading" | "reveal" | "exit">("loading");

  useEffect(() => {
    if (sessionStorage.getItem("xyro-intro-seen")) {
      setShow(false);
      return;
    }

    // Ultra-smooth luxury timing curve
    const t1 = setTimeout(() => setPhase("reveal"), 400);
    const t2 = setTimeout(() => setPhase("exit"), 1800);
    const t3 = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("xyro-intro-seen", "1");
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="luxury-intro"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#F9F8F6]"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: "blur(20px)",
            transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          {/* Subtle warm background radial glow */}
          <motion.div
            className="pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[140px]"
            style={{
              background:
                "radial-gradient(circle, rgba(229,217,197,0.8) 0%, rgba(139,94,52,0.15) 50%, transparent 75%)",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={
              phase === "exit"
                ? { scale: 2.2, opacity: 0 }
                : phase === "reveal"
                ? { scale: 1.2, opacity: 1 }
                : { scale: 0.8, opacity: 0.4 }
            }
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Concentric subtle beige rings */}
          <motion.div
            className="pointer-events-none absolute h-72 w-72 rounded-full border border-[#E5D9C5]"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={
              phase === "exit"
                ? { scale: 2, opacity: 0 }
                : phase === "reveal"
                ? { scale: 1, opacity: 0.6 }
                : { scale: 0.6, opacity: 0.2 }
            }
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />

          <motion.div
            className="pointer-events-none absolute h-96 w-96 rounded-full border border-[#E5D9C5]/50"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={
              phase === "exit"
                ? { scale: 2.4, opacity: 0 }
                : phase === "reveal"
                ? { scale: 1, opacity: 0.4 }
                : { scale: 0.5, opacity: 0.1 }
            }
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />

          {/* Central Logo & Letter Reveal */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Letters with silky stagger */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {LETTERS.map((letter, i) => (
                <motion.span
                  key={letter}
                  className="inline-block font-display text-6xl font-bold tracking-[0.25em] text-[#33281E] md:text-[105px]"
                  style={{
                    textShadow: "0 4px 24px rgba(51,40,30,0.08)",
                  }}
                  initial={{ opacity: 0, y: 35, filter: "blur(14px)" }}
                  animate={
                    phase === "exit"
                      ? {
                          opacity: 0,
                          y: -15,
                          scale: 1.08,
                          filter: "blur(16px)",
                        }
                      : phase === "reveal"
                      ? {
                          opacity: 1,
                          y: 0,
                          filter: "blur(0px)",
                        }
                      : { opacity: 0, y: 35 }
                  }
                  transition={
                    phase === "exit"
                      ? { duration: 0.5, delay: i * 0.03, ease: "easeIn" }
                      : {
                          duration: 0.8,
                          delay: 0.15 + i * 0.08,
                          ease: [0.16, 1, 0.3, 1],
                        }
                  }
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Sub-tagline reveal */}
            <motion.div
              className="mt-4 flex items-center gap-3 md:mt-6"
              initial={{ opacity: 0, y: 15 }}
              animate={
                phase === "exit"
                  ? { opacity: 0, y: -8 }
                  : phase === "reveal"
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 15 }
              }
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="h-px w-8 bg-[#E5D9C5] md:w-14" />
              <span className="font-mono text-[10px] font-bold tracking-[0.4em] text-[#8B5E34] uppercase md:text-xs">
                The Intelligent Gym OS
              </span>
              <div className="h-px w-8 bg-[#E5D9C5] md:w-14" />
            </motion.div>
          </div>

          {/* Silky bottom progress line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-[#E5D9C5]/40">
            <motion.div
              className="h-full bg-[#8B5E34]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
