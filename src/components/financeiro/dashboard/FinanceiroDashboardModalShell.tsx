"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type FinanceiroDashboardModalShellProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  actionSlot?: ReactNode;
  topContent?: ReactNode;
  children: ReactNode;
};

type DialogSize = {
  width: number;
  height: number;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function FinanceiroDashboardModalShell({
  open,
  title,
  description,
  actionSlot,
  topContent,
  children,
}: FinanceiroDashboardModalShellProps) {
  const [maximizado, setMaximizado] = useState(false);
  const [tamanhoRestaurado, setTamanhoRestaurado] = useState<DialogSize | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setMaximizado(false);
      setTamanhoRestaurado(null);
    }
  }, [open]);

  function alternarMaximizacao() {
    if (!maximizado && dialogRef.current) {
      setTamanhoRestaurado({
        width: dialogRef.current.offsetWidth,
        height: dialogRef.current.offsetHeight,
      });
    }

    setMaximizado((valorAtual) => !valorAtual);
  }

  const dialogStyle = maximizado
    ? {
        width: "100vw",
        height: "100vh",
        maxWidth: "100vw",
        maxHeight: "100vh",
        minWidth: "100vw",
        minHeight: "100vh",
      }
    : tamanhoRestaurado
      ? {
          width: `${tamanhoRestaurado.width}px`,
          height: `${tamanhoRestaurado.height}px`,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100vh - 2rem)",
        }
      : undefined;

  return (
    <DialogContent
      ref={dialogRef}
      style={dialogStyle}
      className={cn(
        "border border-slate-200/80 bg-white p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]",
        maximizado
          ? "!fixed !inset-0 !m-0 !max-w-none !rounded-none !border-0"
          : "!h-[88vh] !w-[90vw] !max-w-[1400px] resize overflow-hidden rounded-[28px] md:!min-h-[680px] md:!min-w-[800px]",
      )}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex-none border-b border-slate-200/80 px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <DialogHeader className="pb-0 text-left">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {actionSlot}
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={alternarMaximizacao}
                aria-label={maximizado ? "Restaurar modal" : "Maximizar modal"}
                title={maximizado ? "Restaurar" : "Maximizar"}
              >
                {maximizado ? "Restaurar" : "Maximizar"}
              </button>
            </div>
          </div>

          {topContent ? <div className="mt-4">{topContent}</div> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {!maximizado ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 rounded-bl-sm border-b-2 border-r-2 border-slate-300/90"
          />
        ) : null}
      </div>
    </DialogContent>
  );
}

export default FinanceiroDashboardModalShell;
