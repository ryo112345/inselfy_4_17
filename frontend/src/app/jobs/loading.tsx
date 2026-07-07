export default function Loading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)] md:pl-[50px]">
      <div className="shrink-0 animate-pulse border-b border-gray-200 bg-white px-4 py-2.5 md:px-6 md:py-3">
        <div className="h-9 w-full max-w-[480px] rounded-xl bg-gray-100" />
        <div className="mt-2 flex items-center gap-2 md:gap-3">
          <div className="h-8 w-20 rounded-lg bg-gray-100" />
          <div className="h-8 w-24 rounded-lg bg-gray-100" />
          <div className="h-8 w-24 rounded-lg bg-gray-100" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-full border-r border-gray-200 lg:w-[440px] lg:shrink-0">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
          </div>
        </div>
        <div className="hidden flex-1 bg-gray-100 lg:block" />
      </div>
    </div>
  );
}
