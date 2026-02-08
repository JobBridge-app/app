"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import clsx from "clsx";

type ChoiceTileProps = {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  disabled?: boolean;
};

export function ChoiceTile({
  children,
  onClick,
  selected = false,
  className,
  disabled = false,
}: ChoiceTileProps) {
  const interactive = !disabled && typeof onClick === "function";

  return (
    <motion.button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={interactive ? { y: -1, scale: selected ? 1.01 : 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
      className={clsx(
        "relative w-full text-left backdrop-blur-xl border rounded-3xl overflow-hidden transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70",
        selected
          ? "bg-white/10 border-cyan-300/80 ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_18px_70px_rgba(0,0,0,0.55)]"
          : "bg-white/6 border-white/10 hover:bg-white/8",
        interactive ? "cursor-pointer" : "cursor-default",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10 p-5 sm:p-6">{children}</div>
      
      {/* Selected state - Checkmark */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 h-6 w-6 rounded-full bg-cyan-400 flex items-center justify-center"
        >
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
