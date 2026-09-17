"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/patients" className="text-lg font-semibold">
            MomMeds
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/patients"
              className={
                pathname.startsWith("/patients")
                  ? "font-medium text-[var(--primary)]"
                  : "text-[var(--muted)]"
              }
            >
              Patients
            </Link>
          </nav>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
