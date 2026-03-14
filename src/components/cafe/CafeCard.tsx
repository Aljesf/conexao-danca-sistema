import type { ReactNode } from "react";

type CafeCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "stats";
};

const variantClasses: Record<NonNullable<CafeCardProps["variant"]>, string> = {
  default:
    "border-slate-200/80 bg-white shadow-[0_12px_32px_-20px_rgba(15,23,42,0.22)]",
  muted:
    "border-[#eadfcd] bg-[#fffaf2] shadow-[0_10px_28px_-22px_rgba(180,126,58,0.28)]",
  stats:
    "border-[#efe4d3] bg-[linear-gradient(180deg,#fffefb_0%,#fff7ec_100%)] shadow-[0_12px_30px_-24px_rgba(180,126,58,0.34)]",
};

export default function CafeCard({
  title,
  description,
  actions,
  children,
  className,
  variant = "default",
}: CafeCardProps) {
  return (
    <section
      className={[
        "flex flex-col gap-5 rounded-[24px] border p-6",
        variantClasses[variant],
        className ?? "",
      ].join(" ")}
    >
      {title || description || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            {title ? <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
