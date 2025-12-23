"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { Moon, Sun, Lock } from "lucide-react";
import Link from "next/link";

export default function ProfileSettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Einstellungen</h1>
                <p className="text-muted-foreground mb-8">Passe dein Erlebnis auf JobBridge an.</p>

                <div className="space-y-6">
                    {/* Theme Section */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-medium text-foreground mb-4">Darstellung</h3>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
                            >
                                <Sun size={24} />
                                <span className="text-sm font-medium">Hell</span>
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}
                            >
                                <Moon size={24} />
                                <span className="text-sm font-medium">Dunkel</span>
                            </button>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-medium text-foreground mb-4">Sicherheit</h3>
                        <Link href="/auth/update-password">
                            <div className="w-full flex items-center justify-between p-4 rounded-xl bg-background border border-border hover:bg-muted transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <Lock size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-foreground">Passwort ändern</p>
                                        <p className="text-xs text-muted-foreground">Aktualisiere dein Passwort</p>
                                    </div>
                                </div>
                                <div className="text-sm text-blue-500 group-hover:translate-x-1 transition-transform">
                                    Öffnen &rarr;
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
