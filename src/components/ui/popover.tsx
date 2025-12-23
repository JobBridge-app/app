"use client";

import * as React from "react"
import { cn } from "@/lib/utils"

const Popover = ({ children }: { children: React.ReactNode }) => {
    return <div className="relative inline-block">{children}</div>
}

const PopoverTrigger = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div className={cn("inline-flex", className)} {...props}>
            {children}
        </div>
    )
}

const PopoverContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={cn(
                "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export { Popover, PopoverTrigger, PopoverContent }
