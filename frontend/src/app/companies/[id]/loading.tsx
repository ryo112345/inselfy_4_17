const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      <div className="mx-auto flex max-w-3xl animate-pulse flex-col gap-3 px-4 pb-20 pt-8">
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="h-44 bg-gray-200 sm:h-56" />
          <div className="relative px-7 pb-6">
            <div className="absolute -top-10 left-7 h-20 w-20 rounded-xl border-4 border-white bg-gray-200" />
            <div className="pt-14">
              <div className="h-7 w-56 rounded bg-gray-200" />
              <div className="mt-3 h-5 w-72 max-w-full rounded bg-gray-100" />
              <div className="mt-4 h-7 w-24 rounded-full bg-gray-100" />
            </div>
          </div>
        </section>
        <section className={`px-6 py-5 ${cardClass}`}>
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-2/3 rounded bg-gray-100" />
          </div>
        </section>
        <section className={`px-6 py-5 ${cardClass}`}>
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="h-16 rounded bg-gray-100" />
            <div className="h-16 rounded bg-gray-100" />
            <div className="h-16 rounded bg-gray-100" />
          </div>
        </section>
      </div>
    </div>
  );
}
