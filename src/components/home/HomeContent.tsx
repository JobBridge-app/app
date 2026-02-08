"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/authClient";
import { Profile } from "@/lib/types";
import { LogoBadge } from "@/components/ui/LogoBadge";
import { ButtonSecondary } from "@/components/ui/ButtonSecondary";

type HomeContentProps = {
  profile: Profile;
};

export function HomeContent({ profile }: HomeContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const roleLabel =
    profile.account_type === "job_provider"
      ? (profile.provider_kind === "company" ? "Unternehmen / Organisation" : "Privatperson / Eltern / Anbieter")
      : "Jobsuchend";

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[20%] h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute right-[15%] bottom-[25%] h-80 w-80 rounded-full bg-teal-500/4 blur-3xl" />
      </div>

      <div className="relative bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl shadow-black/40 w-full max-w-2xl p-12">
        <div className="flex flex-col items-center gap-8">
          <LogoBadge size="sm" />
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Hallo, {profile.full_name || "Freund"}!
            </h1>
            <p className="text-lg text-slate-300 md:text-xl">
              {roleLabel}
            </p>
            {profile.city && (
              <p className="text-slate-400">
                {profile.city}
              </p>
            )}
          </div>
          <ButtonSecondary onClick={handleLogout} loading={loading}>
            Abmelden
          </ButtonSecondary>
        </div>
      </div>
    </div>
  );
}
