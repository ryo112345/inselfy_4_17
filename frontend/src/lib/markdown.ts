import { sanitizeHtml } from "./sanitize";

/**
 * AIレポート（Work Values / Career Interest / 統合レポート）の Markdown を
 * 表示用 HTML に変換する。出力はサニタイズ済み。
 */
export function markdownToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^[・-] (.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<p>(<h[23]>)/g, "$1")
    .replace(/(<\/h[23]>)<\/p>/g, "$1")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1")
    .replace(/<p>(<blockquote>)/g, "$1")
    .replace(/(<\/blockquote>)<\/p>/g, "$1");

  // 最初の<p>をキャッチコピーとしてスタイル付与（最初の見出しより前の段落）
  html = html.replace(/^<p>/, '<p class="catchphrase">');

  return sanitizeHtml(html);
}
