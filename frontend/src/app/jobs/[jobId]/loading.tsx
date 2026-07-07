const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      <div className="mx-auto flex max-w-4xl animate-pulse flex-col gap-3 px-4 pb-24 pt-8">
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="aspect-[16/9] w-full bg-gray-100" />
          <div className="px-6 pb-6 pt-6 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-100" />
              </div>
            </div>
            <div className="mt-5 h-8 w-3/4 rounded bg-gray-200" />
            <div className="mt-5 flex gap-2">
              <div className="h-8 w-20 rounded-full bg-gray-100" />
              <div className="h-8 w-24 rounded-full bg-gray-100" />
              <div className="h-8 w-24 rounded-full bg-gray-100" />
            </div>
            <div className="mt-6 h-24 w-full rounded-xl bg-gray-50" />
            <div className="mt-7 h-14 w-full rounded-xl bg-gray-100" />
          </div>
        </section>
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-32 rounded-xl bg-gray-50" />
            <div className="h-32 rounded-xl bg-gray-50" />
            <div className="h-32 rounded-xl bg-gray-50" />
            <div className="h-32 rounded-xl bg-gray-50" />
          </div>
        </section>
      </div>
    </div>
  );
}
