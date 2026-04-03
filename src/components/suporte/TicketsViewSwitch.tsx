"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type SuporteTicketView } from "@/lib/suporte/constants";

const VIEW_OPTIONS: Array<{ value: SuporteTicketView; label: string }> = [
  { value: "abertos", label: "Em aberto" },
  { value: "resolvidos", label: "Resolvidos" },
  { value: "todos", label: "Todos" },
];

export function TicketsViewSwitch({ value }: { value: SuporteTicketView }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function atualizarView(nextView: SuporteTicketView) {
    if (nextView === value) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="inline-flex w-full flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 sm:w-auto">
      {VIEW_OPTIONS.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => atualizarView(option.value)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-200"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
