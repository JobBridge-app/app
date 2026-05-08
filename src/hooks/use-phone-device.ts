"use client";

import { useEffect, useState } from "react";

function getIsPhoneDevice() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
    }

    const userAgent = navigator.userAgent || "";
    const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    const uaLooksMobile = /Android|iPhone|iPod|Mobile|Windows Phone/i.test(userAgent) || userAgentData?.mobile === true;
    const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const noHover = window.matchMedia?.("(hover: none)").matches ?? false;
    const phoneWidth = window.matchMedia?.("(max-width: 767px)").matches ?? window.innerWidth <= 767;

    return phoneWidth && (uaLooksMobile || (coarsePointer && noHover));
}

export function usePhoneDevice() {
    const [isPhoneDevice, setIsPhoneDevice] = useState(false);

    useEffect(() => {
        const update = () => setIsPhoneDevice(getIsPhoneDevice());
        update();

        const mediaQueries = [
            window.matchMedia?.("(pointer: coarse)"),
            window.matchMedia?.("(hover: none)"),
            window.matchMedia?.("(max-width: 767px)"),
        ].filter(Boolean) as MediaQueryList[];

        mediaQueries.forEach((query) => query.addEventListener("change", update));
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);

        return () => {
            mediaQueries.forEach((query) => query.removeEventListener("change", update));
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
        };
    }, []);

    return isPhoneDevice;
}
