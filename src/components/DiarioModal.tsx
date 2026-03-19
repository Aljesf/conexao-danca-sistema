"use client";

import { useEffect } from "react";

type DiarioModalTab = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

type DiarioModalProps = {
  open: boolean;
  onClose: () => void;
  turmaNome: string;
  turmaMeta?: string | null;
  tabs?: DiarioModalTab[];
  children: React.ReactNode;
};

export default function DiarioModal(props: DiarioModalProps) {
  const { open, onClose, turmaNome, turmaMeta, tabs = [], children } = props;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Fechar diario"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto flex min-h-full w-full max-w-5xl items-start justify-center py-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={turmaNome}
            className="relative w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Diario de classe
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{turmaNome}</h2>
                  {turmaMeta ? <p className="mt-1 text-sm text-slate-500">{turmaMeta}</p> : null}
                </div>

                <button
                  type="button"
                  className="inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  onClick={onClose}
                >
                  Fechar
                </button>
              </div>

              {tabs.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={[
                        "rounded-full border px-4 py-2 text-sm transition",
                        tab.active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                      onClick={tab.onClick}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
