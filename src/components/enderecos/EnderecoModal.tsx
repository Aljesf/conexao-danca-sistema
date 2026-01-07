"use client";

import { ReactNode } from "react";

export function EnderecoModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="text-lg font-semibold">{title}</div>
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
