"use client";

import { useId, useState } from "react";

export function FieldHelp({ text, label = "Ajuda" }: { text: string; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>

      {open ? (
        <div
          id={id}
          role="tooltip"
          className="absolute left-0 top-6 z-50 w-[320px] rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg"
        >
          {text}
        </div>
      ) : null}
    </span>
  );
}
