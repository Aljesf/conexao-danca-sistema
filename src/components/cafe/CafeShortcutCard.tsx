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
        "group flex h-full flex-col justify-between rounded-[24px] border p-5 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-22px_rgba(15,23,42,0.28)]",
        featured
          ? "border-[#ead3ab] bg-[linear-gradient(180deg,#fffdf8_0%,#fff4df_100%)] hover:border-[#d4ad73]"
          : "border-slate-200/80 bg-white hover:border-[#d9c2a1]",
      ].join(" ")}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6640]">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-950 transition group-hover:text-[#8c6640]">
            {title}
          </h3>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm font-medium text-slate-500">
        <span>Acessar</span>
        <span aria-hidden="true">→</span>
      </div>
      {footer ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          {footer}
        </div>
      ) : null}
    </Link>
  );
}
