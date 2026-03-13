import Link from "next/link";
import type { ReactNode } from "react";

type CafeShortcutCardProps = {
  href: string;
  title: string;
  description: string;
  eyebrow?: string;
  footer?: ReactNode;
  featured?: boolean;
};

export default function CafeShortcutCard({
  href,
  title,
  description,
  eyebrow,
  footer,
  featured,
}: CafeShortcutCardProps) {
  return (
    <Link
      href={href}
      className={[
        "group flex h-full flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        featured
          ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white hover:border-amber-400"
          : "border-slate-200 hover:border-amber-300",
      ].join(" ")}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-amber-700">
            {title}
          </h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm font-medium text-slate-500">
        <span>Acessar</span>
        <span aria-hidden="true">→</span>
      </div>
      {footer ? (
        <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {footer}
        </div>
      ) : null}
    </Link>
  );
}
