function isPerfDebugEnabled() {
  return typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_PERF === "true";
}

export function startPerfMark(name: string) {
  if (!isPerfDebugEnabled() || typeof performance === "undefined") return;
  performance.mark(`${name}:start`);
}

export function endPerfMark(name: string) {
  if (!isPerfDebugEnabled() || typeof performance === "undefined") return;

  const startMark = `${name}:start`;
  const endMark = `${name}:end`;

  try {
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name);
    const latestEntry = entries[entries.length - 1];
    if (latestEntry) {
      console.debug(`[perf] ${name}: ${latestEntry.duration.toFixed(1)}ms`);
    }
  } catch {
    // ignore missing start marks
  } finally {
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(name);
  }
}
