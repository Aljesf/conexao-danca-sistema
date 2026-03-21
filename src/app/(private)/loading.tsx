function SkeletonBlock(props: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-slate-200/80 ${props.className ?? ""}`} />;
}

export default function PrivateLoading() {
  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-9 w-64" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-3xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    </div>
  );
}
