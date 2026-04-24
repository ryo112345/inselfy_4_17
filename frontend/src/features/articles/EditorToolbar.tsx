"use client";

import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor | null;
  onImageUpload: () => void;
  onInsertPaidSeparator: () => void;
  isPaid: boolean;
};

export function EditorToolbar({
  editor,
  onImageUpload,
  onInsertPaidSeparator,
  isPaid,
}: Props) {
  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
    title: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
      {btn(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        "B",
        "太字",
      )}
      {btn(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "I",
        "斜体",
      )}
      {btn(
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        "U",
        "下線",
      )}

      <span className="w-px h-5 bg-gray-200 mx-1" />

      {btn(
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "H2",
        "見出し2",
      )}
      {btn(
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        "H3",
        "見出し3",
      )}

      <span className="w-px h-5 bg-gray-200 mx-1" />

      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "•",
        "箇条書き",
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "1.",
        "番号付きリスト",
      )}
      {btn(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        "❝",
        "引用",
      )}
      {btn(
        editor.isActive("codeBlock"),
        () => editor.chain().focus().toggleCodeBlock().run(),
        "</>",
        "コードブロック",
      )}

      <span className="w-px h-5 bg-gray-200 mx-1" />

      {btn(false, onImageUpload, "🖼", "画像を挿入")}

      {btn(
        false,
        () => editor.chain().focus().setHorizontalRule().run(),
        "—",
        "区切り線",
      )}

      {isPaid && (
        <>
          <span className="w-px h-5 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={onInsertPaidSeparator}
            title="有料エリアの区切りを挿入"
            className="px-2 py-1 text-xs rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            有料区切り
          </button>
        </>
      )}
    </div>
  );
}
