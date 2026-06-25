function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.07] ${className}`}
    />
  );
}

export default function LegalLoading() {
  return (
    <div className="space-y-9">
      <div className="space-y-4 pb-2">
        <SkeletonBlock className="h-14 w-10/12 max-w-lg !rounded-2xl sm:h-16" />
      </div>

      <div className="space-y-5">
        <SkeletonBlock className="h-7 w-7/12 max-w-sm !rounded-2xl" />
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-10/12" />
          <SkeletonBlock className="h-4 w-8/12" />
        </div>
        <SkeletonBlock className="h-24 w-full !rounded-3xl" />
      </div>
    </div>
  );
}
