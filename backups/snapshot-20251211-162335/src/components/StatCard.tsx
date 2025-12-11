type StatCardProps = {
  title: string;
  value: string | number;
  hint?: string;
};

export default function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs opacity-60">{hint}</div> : null}
    </div>
  );
}
