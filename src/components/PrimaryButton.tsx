"use client";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  icon?: string;
};

export default function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  icon,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300";
  const styles =
    variant === "primary"
      ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
      : "border border-slate-200 text-slate-800 bg-white hover:bg-slate-50";

  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}
