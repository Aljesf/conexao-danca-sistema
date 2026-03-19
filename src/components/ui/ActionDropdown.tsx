"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ActionDropdownItem = {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type Props = {
  items: ActionDropdownItem[];
  label?: string;
  className?: string;
  compact?: boolean;
};

function itemToneClass(tone: ActionDropdownItem["tone"]) {
  if (tone === "danger") {
    return "text-rose-700 hover:bg-rose-50 focus:bg-rose-50";
  }
  return "text-slate-700 hover:bg-slate-100 focus:bg-slate-100";
}

export function ActionDropdown({ items, label = "Mais acoes", className = "", compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const availableItems = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (availableItems.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        type="button"
        variant="secondary"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={compact ? "h-9 w-9 rounded-full px-0" : "h-10 w-10 rounded-full px-0"}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 min-w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
        >
          {availableItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${itemToneClass(item.tone)} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent`}
              onClick={() => {
                setOpen(false);
                if (!item.disabled) {
                  item.onSelect();
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
