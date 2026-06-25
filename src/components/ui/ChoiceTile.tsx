"use client";

import { AnimatePresence, motion } from "framer-motion";
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
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
      className={clsx(
        "relative w-full text-left backdrop-blur-xl border rounded-[1.125rem] overflow-hidden transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70",
        selected
          ? "bg-[#182235] border-blue-400/50 ring-1 ring-blue-500/20 shadow-[0_0_0_1px_rgba(37,99,235,0.18),0_18px_54px_rgba(0,0,0,0.38)]"
          : "bg-white/6 border-white/10 hover:bg-white/8",
        interactive ? "cursor-pointer" : "cursor-default",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10 p-5 sm:p-6">{children}</div>
      
      {/* Selected state - Checkmark */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="selected"
            initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500"
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
      </AnimatePresence>
    </motion.button>
  );
}
