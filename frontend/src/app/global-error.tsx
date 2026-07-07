"use client";

// global-error はルートレイアウトごと置き換えるため globals.css が当たらない。
// スタイルはインラインで完結させる。
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f7f5",
          color: "#111111",
          fontFamily:
            '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 448,
            width: "100%",
            margin: "0 16px",
            padding: "40px 32px",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid rgba(229,231,235,0.8)",
            borderRadius: 16,
            boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 6px 16px -8px rgba(16,24,40,0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>問題が発生しました</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b7280" }}>
            予期しないエラーが発生しました。時間をおいて再度お試しください。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              background: "#3D8B6E",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
