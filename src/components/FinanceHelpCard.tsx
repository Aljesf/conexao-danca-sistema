"use client";

type FinanceHelpCardProps = {
  title?: string;
  subtitle?: string;
  items: string[];
};

export function FinanceHelpCard({ title = "Entenda esta tela", subtitle, items }: FinanceHelpCardProps) {
  return (
    <section className="mb-6 rounded-xl bg-white shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-600">
          {subtitle}
        </p>
      )}

      <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
