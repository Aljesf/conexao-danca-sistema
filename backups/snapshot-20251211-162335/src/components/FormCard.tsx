"use client";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function FormCard({
  title,
  description,
  actions,
  children,
  className,
}: Props) {
  return (
    <div
      className={`rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
