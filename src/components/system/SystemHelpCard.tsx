type SystemHelpCardProps = {
  title?: string;
  items: string[];
};

export function SystemHelpCard({ title = "Entenda esta tela", items }: SystemHelpCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
