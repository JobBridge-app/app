"use client";

import { useEffect, useState } from "react";

function getIsPhoneDevice() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return false;
    }

    const userAgent = navigator.userAgent || "";
    const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    const navigatorWithTouch = navigator as Navigator & { maxTouchPoints?: number };
    const isIPadDesktopUserAgent = navigator.platform === "MacIntel"
        && (navigatorWithTouch.maxTouchPoints ?? 0) > 1;
    const uaLooksLikePhone = !isIPadDesktopUserAgent && (
        userAgentData?.mobile === true
        || /iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(userAgent)
        || (/Android/i.test(userAgent) && /Mobile/i.test(userAgent))
    );
    const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const noHover = window.matchMedia?.("(hover: none)").matches ?? false;
    const portraitPhoneViewport = window.innerWidth <= 767;
    const landscapePhoneViewport = window.innerWidth <= 1024 && window.innerHeight <= 600;
    const fitsPhoneViewport = portraitPhoneViewport || landscapePhoneViewport;
    const screenWidth = window.screen?.width || window.innerWidth;
    const screenHeight = window.screen?.height || window.innerHeight;
    const shortScreenEdge = Math.min(screenWidth, screenHeight);
    const longScreenEdge = Math.max(screenWidth, screenHeight);
    const hasPhoneSizedScreen = shortScreenEdge <= 540 && longScreenEdge <= 1024;

    return fitsPhoneViewport
        && (uaLooksLikePhone || (coarsePointer && noHover && hasPhoneSizedScreen));
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
            window.matchMedia?.("(max-width: 1024px)"),
            window.matchMedia?.("(max-height: 600px)"),
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
