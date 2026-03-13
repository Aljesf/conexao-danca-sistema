"use client";

import { LifeBuoy } from "lucide-react";
import { useState } from "react";
import type { RequireUserResult } from "@/lib/auth/requireUser";
import { SuporteModal } from "./SuporteModal";

type SuporteFabProps = {
  user?: RequireUserResult | null;
};

export default function SuporteFab({ user }: SuporteFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-3 rounded-full border border-teal-200 bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/20 transition hover:bg-teal-700"
        aria-label="Abrir suporte ao usuario"
        data-html2canvas-ignore="true"
        data-suporte-fab="true"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">Suporte</span>
      </button>

      <SuporteModal open={open} onClose={() => setOpen(false)} user={user ?? null} />
    </>
  );
}
