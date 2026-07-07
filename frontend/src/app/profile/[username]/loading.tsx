export default function Loading() {
  return (
    <main className="min-h-dvh bg-[#f6f7f5] pt-2 pb-8 md:ml-[50px]">
      <div className="mx-auto flex w-full max-w-2xl animate-pulse flex-col gap-3 px-3 md:px-0">
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <div className="h-40 bg-gray-200 sm:h-48" />
          <div className="relative px-6 pb-6">
            <div className="absolute -top-12 left-6 h-24 w-24 rounded-full border-4 border-white bg-gray-200" />
            <div className="pt-16">
              <div className="h-7 w-48 rounded bg-gray-200" />
              <div className="mt-3 h-4 w-64 max-w-full rounded bg-gray-100" />
              <div className="mt-2 h-4 w-40 rounded bg-gray-100" />
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="mt-4 space-y-2.5">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
          </div>
        </section>
      </div>
    </main>
  );
}
