"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { type ArticleItem, createArticle, publishArticle, updateArticle } from "./api";
import { CoverImageUpload } from "./CoverImageUpload";
import { TableOfContents, type TOCItem } from "./TableOfContents";
import { TagInput } from "./TagInput";

// TipTap 一式が重いため、エディタ本体は遅延ロードする
const RichEditor = dynamic(() => import("./RichEditor").then((m) => m.RichEditor), {
  ssr: false,
  loading: () => (
    <div className="min-h-[300px] animate-pulse rounded-lg bg-gray-50" aria-label="読み込み中" />
  ),
});

type Props = {
  article?: ArticleItem;
};

export function ArticleForm({ article }: Props) {
  const router = useRouter();
  const isEdit = !!article;
  const [title, setTitle] = useState(article?.title ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [isPaid, setIsPaid] = useState(article?.isPaid ?? false);
  const [priceYen, setPriceYen] = useState(article?.priceYen ?? 0);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(article?.coverImageUrl ?? null);
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(shouldPublish: boolean) {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        title,
        body,
        isPaid,
        priceYen: isPaid ? priceYen : 0,
        coverImageUrl,
        tags,
      };
      const result = isEdit
        ? await updateArticle(article.id, payload)
        : await createArticle(payload);
      if (shouldPublish) {
        await publishArticle(result.id);
        router.push(`/articles/${result.id}`);
      } else {
        if (!isEdit) {
          router.replace(`/articles/${result.id}/edit`);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
      setShowPublishModal(false);
    }
  }

  const titleRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: contentEditable の初期値設定はマウント時のみ行う意図
  useEffect(() => {
    if (titleRef.current && article?.title) {
      titleRef.current.textContent = article.title;
    }
  }, []);

  const handleTitleInput = useCallback(() => {
    const text = titleRef.current?.textContent || "";
    if (text.length <= 200) {
      setTitle(text);
    } else {
      const sel = window.getSelection();
      const offset = Math.min(sel?.focusOffset ?? 200, 200);
      titleRef.current!.textContent = text.slice(0, 200);
      setTitle(text.slice(0, 200));
      const range = document.createRange();
      range.setStart(titleRef.current!.firstChild!, offset);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const tocItems = useMemo(() => {
    const items: TOCItem[] = [];
    let counter = 0;
    body.replace(
      /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
      (_match, tag: string, _attrs: string | undefined, content: string) => {
        const text = content.replace(/<[^>]*>/g, "").trim();
        if (text) {
          items.push({ id: `toc-${counter++}`, text, level: parseInt(tag[1], 10) });
        }
        return "";
      },
    );
    return items;
  }, [body]);

  return (
    <>
      <article>
        {/* Header bar — same position as breadcrumbs in ArticleView */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-2.5 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <Link
            href={isEdit ? `/articles/${article.id}` : "/articles"}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {isEdit ? "記事に戻る" : "記事一覧"}
          </Link>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-[var(--accent)]">
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                保存しました
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title.trim()}
              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {submitting ? "保存中…" : "下書き保存"}
            </button>
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              disabled={submitting || !title.trim()}
              className="px-5 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-full hover:opacity-90 disabled:opacity-40 transition-colors cursor-pointer"
            >
              公開
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 sm:mx-10 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Cover image — same as ArticleView */}
        <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />

        <div className="px-6 sm:px-10 py-8">
          {/* Title — identical to ArticleView h1 */}
          <div className="relative mb-5">
            {!title && (
              <span className="absolute top-0 left-0 text-[28px] sm:text-3xl font-bold text-gray-300 leading-[1.35] pointer-events-none select-none">
                タイトル
              </span>
            )}
            <h1
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              onInput={handleTitleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain").replace(/\n/g, " ");
                document.execCommand("insertText", false, text);
              }}
              className="relative text-[28px] sm:text-3xl font-bold text-gray-900 leading-[1.35] focus:outline-none"
            />
          </div>

          <div className="mb-8">
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* TOC — same as ArticleView, auto-appears with 2+ headings */}
          <TableOfContents items={tocItems} />

          {/* Body — same prose styling as ArticleView */}
          <div className="pb-40">
            <RichEditor content={body} onChange={setBody} isPaid={isPaid} />
          </div>
        </div>
      </article>

      <Modal open={showPublishModal} onClose={() => setShowPublishModal(false)} size="md">
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-gray-900">公開設定</h2>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => {
                setIsPaid(e.target.checked);
                if (!e.target.checked) setPriceYen(0);
              }}
              className="w-4 h-4 rounded border-gray-300 accent-[var(--accent)]"
            />
            <span className="text-sm font-medium text-gray-700">有料記事にする</span>
          </label>

          {isPaid && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  type="number"
                  value={priceYen || ""}
                  onChange={(e) => setPriceYen(Number(e.target.value))}
                  placeholder="100"
                  min={1}
                  max={1000000}
                  className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <p className="text-xs text-gray-400">
                エディタで「有料区切り」を挿入すると、区切り線より上が無料プレビューになります。
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPublishModal(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[var(--accent)] rounded-xl hover:opacity-90 disabled:opacity-40 transition-colors"
            >
              {submitting ? "公開中…" : "公開する"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
