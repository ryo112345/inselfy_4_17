import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold">inselfy</h1>
      <p className="text-sm text-gray-600">価値観に寄り添う逆求人プラットフォーム</p>
      <Link
        href="/sign_up"
        className="inline-flex items-center justify-center rounded-md bg-black text-white px-6 py-2 text-sm font-medium hover:bg-gray-800"
      >
        サインアップ
      </Link>
    </main>
  );
}
