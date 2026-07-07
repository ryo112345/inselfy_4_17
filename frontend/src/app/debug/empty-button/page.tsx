const variants = [
  {
    label: "現在のデフォルト (gray-300 / white → emerald-700 / emerald-100)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-100",
  },
  {
    label: "gray-300 / white → emerald-700 / emerald-50",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-50",
  },
  {
    label: "gray-300 / white → emerald-700 / emerald-100/70",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-100/70",
  },
  {
    label: "gray-300 / white → emerald-700 / emerald-200/50",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-200/50",
  },
  {
    label: "gray-300 / emerald-50 → emerald-700 / emerald-100",
    cls: "border-gray-300 bg-emerald-50 hover:border-emerald-700 hover:bg-emerald-100",
  },
  {
    label: "emerald-700/40 / white → emerald-700 / emerald-50",
    cls: "border-emerald-700/40 bg-white hover:border-emerald-700 hover:bg-emerald-50",
  },
  {
    label: "emerald-700/40 / white → emerald-700 / emerald-100",
    cls: "border-emerald-700/40 bg-white hover:border-emerald-700 hover:bg-emerald-100",
  },
  {
    label: "emerald-700 / emerald-50 → emerald-700 / emerald-100 (画像と同じ)",
    cls: "border-emerald-700 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    label: "emerald-700 / emerald-50/60 → emerald-700 / emerald-100",
    cls: "border-emerald-700 bg-emerald-50/60 hover:bg-emerald-100",
  },
  {
    label: "emerald-600/50 / emerald-50/50 → emerald-700 / emerald-100",
    cls: "border-emerald-600/50 bg-emerald-50/50 hover:border-emerald-700 hover:bg-emerald-100",
  },
  {
    label: "slate-200 / slate-50 → emerald-700 / emerald-50",
    cls: "border-slate-200 bg-slate-50 hover:border-emerald-700 hover:bg-emerald-50",
  },
  {
    label: "gray-200 / gray-50 → emerald-700 / emerald-50",
    cls: "border-gray-200 bg-gray-50 hover:border-emerald-700 hover:bg-emerald-50",
  },
  {
    label: "灰色がかった緑 (default + hover #dde5e0)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#dde5e0]",
  },
  {
    label: "灰色がかった緑 (default + hover #e3ebe5)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#e3ebe5]",
  },
  {
    label: "灰色がかった緑 (default + hover #d6e0d8)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#d6e0d8]",
  },
  {
    label: "灰色がかった緑 (default + hover #cdd8d0)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#cdd8d0]",
  },
  {
    label: "灰色がかった緑 slate混ぜ (emerald-100/50 + slate)",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-100/50",
  },
  {
    label: "ページ背景(#f6f7f5)を濃くした感じ #e8ece7",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#e8ece7]",
  },
  {
    label: "くすみ緑 #d8e2d8",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#d8e2d8]",
  },
  {
    label: "くすみ緑 強め #c8d4c8",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#c8d4c8]",
  },
  {
    label: "濃い緑 emerald-200",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-200",
  },
  {
    label: "濃い緑 emerald-300",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-emerald-300",
  },
  {
    label: "濃い緑 teal-100",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-teal-100",
  },
  {
    label: "濃い緑 teal-200",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-teal-200",
  },
  {
    label: "濃い緑 green-200",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-green-200",
  },
  {
    label: "濃い緑 #b8dcc4",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#b8dcc4]",
  },
  {
    label: "濃い緑 #a7d3b4",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#a7d3b4]",
  },
  {
    label: "濃い緑 #92c7a2",
    cls: "border-gray-300 bg-white hover:border-emerald-700 hover:bg-[#92c7a2]",
  },
];

export default function DebugEmptyButtonPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">空状態ボタンのバリエーション</h1>
          <p className="mt-2 text-sm text-gray-500">
            ホバーして見た目を比較してください。気に入った組み合わせを指定すれば本体に反映します。
          </p>
        </header>

        {variants.map((v, i) => (
          <section
            key={i}
            className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <span className="text-sm font-semibold text-gray-700">#{i + 1}</span>
              <code className="flex-1 text-right text-xs text-gray-500">{v.label}</code>
            </div>
            <button
              type="button"
              className={`block w-full rounded-xl border-2 border-dashed bg-clip-padding py-4 text-center text-base font-semibold leading-relaxed text-emerald-700 transition ${v.cls}`}
            >
              + 職歴を追加して、キャリアをアピールしましょう。
            </button>
          </section>
        ))}
      </div>
    </main>
  );
}
