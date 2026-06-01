export function LoadingState() {
  return (
    <div className="grid gap-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-32 animate-pulse rounded-xl border border-slate-100 bg-white" key={index} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-white" />
    </div>
  );
}
