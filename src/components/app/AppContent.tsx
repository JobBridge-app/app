"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { ButtonPrimary } from "@/components/ui/ButtonPrimary";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { Market, Profile } from "@/lib/types";
import { BRAND_NAME } from "@/lib/constants";

type AppContentProps = {
  profile: Profile | null;
  market?: Market | null;
};

export function AppContent({ profile, market = null }: AppContentProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-[#050816] to-[#02040a]">
      {/* Liquid Background */}
      <LiquidBackground />

      {/* Fixed Glass Header */}
      <header className="relative z-20 border-b border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LogoBadge size="sm" />
              <div>
                <h1 className="text-xl font-semibold text-white leading-tight">
                  {market?.brand_prefix || BRAND_NAME}
                </h1>
                {market?.display_name && (
                  <p className="text-xs font-medium text-indigo-400">
                    {market.display_name}
                  </p>
                )}
              </div>
            </div>
            <ButtonPrimary onClick={handleLogout} className="px-6 py-2 text-sm">
              Abmelden
            </ButtonPrimary>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-2xl"
        >
          <div className="relative bg-white/8 backdrop-blur-2xl border border-white/12 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] p-10 md:p-12 overflow-hidden">
            {/* Lichtkante */}
            <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)] opacity-70 mix-blend-screen" />
            {/* Subtile Textur */}
            <div
              className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.08) 60%, transparent 100%)",
              }}
            />
            <div className="relative z-10">
              <div className="text-center space-y-6">
                <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                  Du bist angemeldet.
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Hier entsteht deine JobBridge-Plattform. Bald kannst du Jobs suchen oder anbieten.
                </p>
                {profile?.full_name && (
                  <p className="text-sm text-slate-400">
                    Willkommen, {profile.full_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Zone */}
      <footer className="relative z-20 border-t border-white/5 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <p className="text-xs text-white/40 text-center">
            Ein Projekt der Ray Group
          </p>
        </div>
      </footer>
    </div>
  );
}
