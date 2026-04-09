export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded bg-white/10" />
        <div className="h-4 w-72 rounded bg-white/10" />
        <div className="mt-6 space-y-3">
          <div className="h-24 rounded-2xl bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/10" />
        </div>
      </div>
    </div>
  );
}
