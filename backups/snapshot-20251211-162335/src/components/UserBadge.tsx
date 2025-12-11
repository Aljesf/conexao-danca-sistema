"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function UserBadge() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      setLoading(false);
    }
    load();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return null;

  if (!email) {
    return (
      <div className="px-4 py-3 text-xs text-slate-500">
        Não autenticado
      </div>
    );
  }

  return (
    <div className="px-4 py-3 text-xs">
      <div className="truncate max-w-[220px] font-medium">{email}</div>
      <button
        onClick={sair}
        className="mt-2 rounded border border-slate-300 px-3 py-1 text-[11px] hover:bg-slate-100"
      >
        Sair
      </button>
    </div>
  );
}
