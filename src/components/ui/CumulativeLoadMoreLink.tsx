import Link from "next/link";
import { ChevronDown } from "lucide-react";

type SearchParams = Record<string, string | string[] | undefined>;

function buildHref(
    pathname: string,
    searchParams: SearchParams,
    pageParam: string,
    nextPage: number,
) {
    const params = new URLSearchParams();

    for (const key of Object.keys(searchParams).sort()) {
        if (key === pageParam) continue;
        const value = searchParams[key];
        if (Array.isArray(value)) {
            for (const item of value) params.append(key, item);
        } else if (value !== undefined) {
            params.set(key, value);
        }
    }

    params.set(pageParam, String(nextPage));
    return `${pathname}?${params.toString()}`;
}

export function CumulativeLoadMoreLink({
    pathname,
    searchParams,
    pageParam,
    nextPage,
    label,
}: {
    pathname: string;
    searchParams: SearchParams;
    pageParam: string;
    nextPage: number;
    label: string;
}) {
    return (
        <div className="flex justify-center pt-2">
            <Link
                href={buildHref(pathname, searchParams, pageParam, nextPage)}
                scroll={false}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-solid)] px-5 text-sm font-semibold text-[var(--text-default)] shadow-sm outline-none transition-[background-color,border-color,transform] duration-150 ease-out hover:border-[var(--brand-border)] hover:bg-[var(--surface-muted)] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
                {label}
                <ChevronDown aria-hidden="true" size={16} />
            </Link>
        </div>
    );
}
