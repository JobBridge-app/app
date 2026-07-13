type AppRouteLoadingVariant = "jobs" | "activities" | "settings" | "offers";

function SkeletonBlock({ className }: { className: string }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse rounded-2xl bg-slate-200/75 dark:bg-white/[0.06] motion-reduce:animate-none ${className}`}
        />
    );
}

export function AppRouteLoading({
    title,
    variant,
}: {
    title: string;
    variant: AppRouteLoadingVariant;
}) {
    const headingClassName = variant === "settings"
        ? "text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-5xl"
        : variant === "offers"
            ? "text-4xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-6xl"
            : "text-3xl font-bold tracking-tight text-slate-950 dark:text-white";

    return (
        <div
            className="container mx-auto px-4 py-2 md:px-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={`${title} wird geladen`}
        >
            <div className="mx-auto max-w-[78rem] space-y-8">
                <div className="space-y-3">
                    <h1 className={headingClassName}>
                        {title}
                    </h1>
                    <SkeletonBlock className="h-5 w-80 max-w-full" />
                </div>

                {variant === "settings" ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <SkeletonBlock className="h-[22rem]" />
                        <SkeletonBlock className="h-[18rem]" />
                    </div>
                ) : variant === "offers" ? (
                    <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
                        <SkeletonBlock className="h-[24rem]" />
                        <SkeletonBlock className="h-[24rem]" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <SkeletonBlock className="h-10 w-28 rounded-xl" />
                            <SkeletonBlock className="h-10 w-32 rounded-xl" />
                            <SkeletonBlock className="h-10 w-28 rounded-xl" />
                        </div>
                        <div className={variant === "activities" ? "grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]" : "grid gap-5 lg:grid-cols-2"}>
                            <SkeletonBlock className="h-[18rem]" />
                            <SkeletonBlock className="h-[18rem]" />
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
