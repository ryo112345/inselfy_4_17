"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createArticle,
  updateArticle,
  publishArticle,
  type ArticleItem,
} from "./api";
import { RichEditor } from "./RichEditor";
import { CoverImageUpload } from "./CoverImageUpload";
import { TagInput } from "./TagInput";

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
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    article?.coverImageUrl ?? null,
  );
  const [tags, setTags] = useState<string[]>(article?.tags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);

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
      const saved = isEdit
        ? await updateArticle(article.id, payload)
        : await createArticle(payload);
      if (shouldPublish) {
        await publishArticle(saved.id);
      }
      router.push(`/articles/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
      setShowPublishModal(false);
    }
  }

  function handleTitleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setTitle(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting || !title.trim()}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
          >
            下書き保存
          </button>
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            disabled={submitting || !title.trim()}
            className="px-5 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-full hover:opacity-90 disabled:opacity-40 transition-colors"
          >
            公開
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="px-5 pt-8">
        <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
      </div>

      <div className="px-5 pt-8">
        <textarea
          value={title}
          onChange={handleTitleChange}
          placeholder="タイトル"
          rows={1}
          maxLength={200}
          className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-0 resize-none overflow-hidden focus:outline-none leading-snug bg-transparent"
        />
      </div>

      <div className="px-1 pt-4 pb-40">
        <RichEditor content={body} onChange={setBody} isPaid={isPaid} />
      </div>

      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublishModal(false);
          }}
        >
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">公開設定</h2>

            <TagInput tags={tags} onChange={setTags} />

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
              <span className="text-sm font-medium text-gray-700">
                有料記事にする
              </span>
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
        </div>
      )}
    </>
  );
}
