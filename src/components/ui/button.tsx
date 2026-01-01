import * as React from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const { className = "", variant = "primary", ...rest } = props;

  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border",
    ghost: "bg-transparent hover:bg-gray-100",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
