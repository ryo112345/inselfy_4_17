// Sidebar の「設定」リンク先。ページ未実装のままリンクだけ置くと 404 になるうえ、
// 本番ビルドでは存在しないルートへの RSC プリフェッチが完了せず残り続けるため、
// 実装までのプレースホルダを置く
export default function SettingsPage() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-gray-500">設定ページは準備中です</p>
    </main>
  );
}
