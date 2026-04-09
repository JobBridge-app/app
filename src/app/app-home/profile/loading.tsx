export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="animate-pulse space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="h-7 w-56 rounded bg-white/10" />
        <div className="h-4 w-80 rounded bg-white/10" />
        <div className="mt-4 h-48 rounded-2xl bg-white/10" />
        <div className="h-48 rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
