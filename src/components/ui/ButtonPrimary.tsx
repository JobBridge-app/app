"use client";

import { motion } from "framer-motion";
import { ReactNode, MouseEventHandler } from "react";
import clsx from "clsx";

type ButtonPrimaryProps = {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  loading?: boolean;
};

export function ButtonPrimary({
  children,
  onClick,
  disabled = false,
  type = "button",
  className,
  loading = false,
}: ButtonPrimaryProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      className={clsx(
        "bg-blue-500 text-white rounded-full px-8 py-3 shadow-lg shadow-black/30",
        "font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent",
        !disabled && !loading && "hover:bg-blue-600 hover:shadow-xl hover:shadow-black/30",
        (disabled || loading) && "opacity-50 cursor-not-allowed shadow-none",
        className
      )}
    >
      {loading ? "Bitte kurz warten..." : children}
    </motion.button>
  );
}

