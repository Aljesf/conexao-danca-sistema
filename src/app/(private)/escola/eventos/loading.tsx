function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return (
    <div className={`animate-pulse rounded-2xl bg-zinc-200/70 ${className}`} />
  );
}

export default function EventosLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-9 w-72" />
            <SkeletonBlock className="h-4 w-full max-w-3xl" />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonBlock className="h-44 w-full" />
            <SkeletonBlock className="h-44 w-full" />
            <SkeletonBlock className="h-44 w-full" />
            <SkeletonBlock className="h-44 w-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
