"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "jobbridge_create_job_draft";

export type JobDraftData = {
    title: string;
    description: string;
    wage: string;
    location?: {
        address: string;
        lat?: number;
        lng?: number;
        city?: string;
        zip?: string;
        label?: string; // For "My Location" vs "Custom"
        isDefault?: boolean;
    };
    category?: string;
    paymentType?: string;
    isDefaultLocation?: boolean;
};

export function useJobFormPersistence() {
    const [draft, setDraft] = useState<JobDraftData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setDraft(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load job draft", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save to storage
    const saveDraft = (data: Partial<JobDraftData>) => {
        try {
            const current = draft || {};
            const updated = { ...current, ...data };
            setDraft(updated as JobDraftData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save job draft", e);
        }
    };

    // Clear storage
    const clearDraft = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setDraft(null);
        } catch (e) {
            console.error("Failed to clear job draft", e);
        }
    };

    return { draft, isLoaded, saveDraft, clearDraft };
}
