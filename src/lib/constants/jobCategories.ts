import {
    Flower2,
    Sparkles,
    Baby,
    BookOpen,
    MonitorSmartphone,
    Box,
    Dog,
    ShoppingBag,
    MoreHorizontal,
    LucideIcon
} from "lucide-react";

export type PaymentType = "hourly" | "fixed";

export interface JobCategory {
    id: string;
    label: string;
    icon: LucideIcon;
    defaultPaymentType: PaymentType;
    recommendedWage: {
        min: number;
        max: number;
    };
    hint?: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
    {
        id: "garden",
        label: "Gartenarbeit",
        icon: Flower2,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 14, max: 20 },
        hint: "Körperlich anstrengender, meist 14-20 €/h."
    },
    {
        id: "household",
        label: "Haushaltshilfe",
        icon: Sparkles,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 13, max: 18 },
        hint: "Putzen, Aufräumen, Fensterputzen etc."
    },
    {
        id: "babysitting",
        label: "Babysitting",
        icon: Baby,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 12, max: 16 },
        hint: "Abhängig von Alter und Anzahl der Kinder."
    },
    {
        id: "tutoring",
        label: "Nachhilfe",
        icon: BookOpen,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 15, max: 25 },
        hint: "Je nach Schulstufe und Fach."
    },
    {
        id: "it_help",
        label: "IT-Hilfe",
        icon: MonitorSmartphone,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 15, max: 25 },
        hint: "Smartphone/PC-Einrichtung, Problemlösung."
    },
    {
        id: "moving",
        label: "Umzug & Tragen",
        icon: Box,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 15, max: 22 },
        hint: "Schwere körperliche Arbeit."
    },
    {
        id: "pets",
        label: "Haustierbetreuung",
        icon: Dog,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 10, max: 15 },
        hint: "Hund ausführen, Katze füttern etc."
    },
    {
        id: "shopping",
        label: "Einkaufshilfe",
        icon: ShoppingBag,
        defaultPaymentType: "fixed",
        recommendedWage: { min: 10, max: 20 },
        hint: "Meist pauschal für einen Einkaufsgang."
    },
    {
        id: "other",
        label: "Sonstiges",
        icon: MoreHorizontal,
        defaultPaymentType: "hourly",
        recommendedWage: { min: 12, max: 18 },
        hint: "Allgemeine Tätigkeiten."
    }
];

export function getCategoryById(id: string | null | undefined): JobCategory | undefined {
    if (!id) return JOB_CATEGORIES[8]; // Default to 'other'
    return JOB_CATEGORIES.find(c => c.id === id);
}
