"use client";

import { forwardRef } from "react";

type BaseProps = {
  label: string;
  hint?: string;
  className?: string;
};

type InputProps = BaseProps &
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

type TextareaProps = BaseProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

type SelectProps = BaseProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
    children: React.ReactNode;
  };

type Props = InputProps | TextareaProps | SelectProps;

const sharedClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 shadow-sm";

const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, Props>(
  (props, ref) => {
    const { label, hint, className, as = "input", ...rest } = props as any;

    return (
      <div className={`space-y-1 ${className ?? ""}`}>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        {as === "textarea" ? (
          <textarea ref={ref as any} className={sharedClass} {...(rest as any)} />
        ) : as === "select" ? (
          <select ref={ref as any} className={sharedClass} {...(rest as any)} />
        ) : (
          <input ref={ref as any} className={sharedClass} {...(rest as any)} />
        )}
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
