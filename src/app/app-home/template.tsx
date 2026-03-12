"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function AppHomeTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      key={pathname}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.22, ease: "easeOut" }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
