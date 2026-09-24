export default function AuthenticatedLoading() {
  return (
    <section aria-label="Loading page" aria-busy="true" className="flex animate-pulse flex-col gap-5">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-emerald-100" />
        <div className="h-10 w-56 rounded-2xl bg-white/75" />
        <div className="h-4 w-full max-w-lg rounded-full bg-white/60" />
      </div>
      <div className="card h-48 bg-white/60" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card h-32 bg-white/60" />
        <div className="card h-32 bg-white/60" />
      </div>
      <span className="sr-only">Loading…</span>
    </section>
  );
}
