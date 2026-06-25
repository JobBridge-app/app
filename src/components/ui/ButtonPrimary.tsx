"use client";

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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "bg-blue-600 text-white rounded-full px-8 py-3 shadow-lg shadow-black/30",
        "font-semibold transition-[background-color,box-shadow,scale,color,border-color] duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent",
        !disabled && !loading && "hover:bg-blue-700 hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02] active:scale-[0.96]",
        (disabled || loading) && "opacity-50 cursor-not-allowed shadow-none",
        className
      )}
    >
      {loading ? "Bitte kurz warten..." : children}
    </button>
  );
}
