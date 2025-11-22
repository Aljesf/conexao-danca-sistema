"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const sair = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    location.href = "/login";
  };

  if (!email) return null;
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-300">
      <span className="truncate max-w-[220px]">{email}</span>
      <button onClick={sair} className="rounded border border-zinc-700 px-2 py-1 hover:bg-zinc-800">
        Sair
      </button>
    </div>
  );
}
