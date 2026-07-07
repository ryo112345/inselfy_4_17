// 日付フォーマットの共通実装。複数ファイルに重複していたものを集約した（F8）。
// 出力形式は集約前の各画面の表記をそのまま維持している。
// 1箇所でしか使わない特殊形式（曜日付き・長文形式など）は各ファイルに残している。

/** "2026/07/07"（ゼロ埋め）。null は "-"。 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026/7/7"（ゼロ埋めなし）。null は "-"。 */
export function formatDateCompact(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

/** "2026/07/07 14:05"（ゼロ埋め）。null は "-"。 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "2026/7/7 14:05"（日付はゼロ埋めなし）。null は "-"。 */
export function formatDateTimeCompact(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ja-JP")} ${d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** タイムライン系: "30秒" "5分" "3時間" "12日" → それ以前は "7月7日"。 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}秒`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}日`;
  return new Date(dateStr).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** 一覧系: "今日" "昨日" "3日前" "2週間前" → それ以前は "7月7日"。 */
export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** メッセージ系: "今" "5分前" "3時間前" "6日前" → それ以前は "7月7日"。 */
export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

/** スカウト有効期限: "期限切れ" "今日まで" "残りN日"。null は null。 */
export function daysRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "期限切れ";
  if (diff === 0) return "今日まで";
  return `残り${diff}日`;
}
