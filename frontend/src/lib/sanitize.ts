import DOMPurify from "isomorphic-dompurify";

/**
 * ユーザー由来・外部由来の HTML を dangerouslySetInnerHTML に渡す前に必ず通す。
 * isomorphic-dompurify なので Server Component / SSR プリレンダーでも動作する。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
