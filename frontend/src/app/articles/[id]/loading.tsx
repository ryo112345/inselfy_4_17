export default function Loading() {
  return (
    <div className="flex min-h-screen justify-center md:pl-[50px]">
      <main className="w-full max-w-2xl animate-pulse border-x border-gray-200/80 bg-white px-6 py-10">
        <div className="h-8 w-3/4 rounded bg-gray-200" />
        <div className="mt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200" />
          <div className="h-4 w-40 rounded bg-gray-100" />
        </div>
        <div className="mt-8 aspect-[16/9] w-full rounded-xl bg-gray-100" />
        <div className="mt-8 space-y-3">
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-11/12 rounded bg-gray-100" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-2/3 rounded bg-gray-100" />
        </div>
      </main>
    </div>
  );
}
