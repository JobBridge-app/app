"use client";

import { motion } from "framer-motion";

export function LiquidBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Globales Radial-Gradient im Hintergrund - sehr subtil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_18%,rgba(37,99,235,0.055),transparent_68%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),transparent_36%)] dark:bg-none" />
      
      {/* Sanfte, globale Bewegungen - sehr niedrige Opacity */}
      <motion.div
        className="absolute left-[10%] top-[20%] h-[800px] w-[800px] rounded-full bg-gradient-radial from-blue-500/2 via-blue-500/1 to-transparent blur-[120px]"
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute right-[8%] bottom-[18%] h-[720px] w-[720px] rounded-full bg-gradient-radial from-blue-500/2 via-blue-500/1 to-transparent blur-[120px]"
        animate={{
          x: [0, -35, 0],
          y: [0, -25, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}
