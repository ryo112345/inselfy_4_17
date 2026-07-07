export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
    </div>
  );
}
