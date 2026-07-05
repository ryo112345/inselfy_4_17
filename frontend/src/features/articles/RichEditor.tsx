"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { createPortal } from "react-dom";
import {
  useRef,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PaidSeparator } from "./PaidSeparatorExtension";
import { uploadArticleImage as uploadImage } from "./api";

type Props = {
  content: string;
  onChange: (html: string) => void;
  isPaid: boolean;
};

type Coords = { top: number; left: number };

function BubbleToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<Coords | null>(null);

  useEffect(() => {
    function update() {
      if (!editor.isFocused) {
        setPos(null);
        return;
      }
      const { from, to } = editor.state.selection;
      if (from === to) {
        setPos(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      setPos({
        top: start.top - 44,
        left: (start.left + end.right) / 2,
      });
    }
    function hide() {
      setPos(null);
    }

    editor.on("selectionUpdate", update);
    editor.on("blur", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", hide);
    };
  }, [editor]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
      }}
      className="z-50 flex items-center bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden"
    >
      <InlineBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </InlineBtn>
      <InlineBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </InlineBtn>
      <InlineBtn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </InlineBtn>
      <span className="w-px h-4 bg-gray-200" />
      <InlineBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </InlineBtn>
      <InlineBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </InlineBtn>
      <span className="w-px h-4 bg-gray-200" />
      <InlineBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </InlineBtn>
      <InlineBtn
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"</>"}
      </InlineBtn>
    </div>,
    document.body,
  );
}

function PlusMenu({
  editor,
  isPaid,
  fileInputRef,
}: {
  editor: Editor;
  isPaid: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [pos, setPos] = useState<Coords | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    function update() {
      if (!editor.isFocused) {
        setPos(null);
        setExpanded(false);
        return;
      }
      const { from, to } = editor.state.selection;
      if (from !== to) {
        setPos(null);
        setExpanded(false);
        return;
      }
      const { $from } = editor.state.selection;
      if ($from.parent.content.size !== 0) {
        setPos(null);
        setExpanded(false);
        return;
      }
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.getBoundingClientRect();
      setPos({
        top: coords.top,
        left: editorRect.left,
      });
    }
    function hide() {
      setPos(null);
      setExpanded(false);
    }

    editor.on("selectionUpdate", update);
    editor.on("update", update);
    editor.on("blur", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
      editor.off("blur", hide);
    };
  }, [editor]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top - 8,
        left: pos.left,
        transform: "translateY(-100%)",
      }}
      className="z-40"
    >
      {!expanded ? (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setExpanded(true);
          }}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors bg-white"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1.5 py-1 shadow-md">
          <BlockBtn
            onClick={() => {
              fileInputRef.current?.click();
              setExpanded(false);
            }}
            title="画像"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </BlockBtn>
          <BlockBtn
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
              setExpanded(false);
            }}
            title="箇条書き"
          >
            •
          </BlockBtn>
          <BlockBtn
            onClick={() => {
              editor.chain().focus().toggleOrderedList().run();
              setExpanded(false);
            }}
            title="番号リスト"
          >
            1.
          </BlockBtn>
          <BlockBtn
            onClick={() => {
              editor.chain().focus().setHorizontalRule().run();
              setExpanded(false);
            }}
            title="区切り線"
          >
            —
          </BlockBtn>
          {isPaid && (
            <BlockBtn
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({ type: "paidSeparator" })
                  .run();
                setExpanded(false);
              }}
              title="有料区切り"
              className="text-amber-600"
            >
              ¥
            </BlockBtn>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

function InlineBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`px-2.5 py-1.5 text-xs transition-colors ${
        active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function BlockBtn({
  onClick,
  title,
  children,
  className = "",
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center text-sm text-gray-500 hover:bg-gray-100 rounded transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function RichEditor({ content, onChange, isPaid }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: "本文を入力してください",
      }),
      PaidSeparator,
    ],
    content,
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-gray max-w-none min-h-[400px] py-3 focus:outline-none prose-headings:text-gray-900 prose-p:text-[18px] prose-p:text-gray-700 prose-p:leading-[1.85] prose-li:text-[18px] prose-li:text-gray-700 prose-a:text-[var(--accent)] prose-img:rounded-lg",
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        uploadImage(file).then((url) => {
          const { tr } = view.state;
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (pos) {
            const node = view.state.schema.nodes.image.create({ src: url });
            view.dispatch(tr.insert(pos.pos, node));
          }
        });
        return true;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            uploadImage(file).then((url) => {
              const node = view.state.schema.nodes.image.create({ src: url });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Image upload failed:", err);
        alert("画像のアップロードに失敗しました");
      }
      e.target.value = "";
    },
    [editor],
  );

  return (
    <div>
      {editor && (
        <>
          <BubbleToolbar editor={editor} />
          <PlusMenu
            editor={editor}
            isPaid={isPaid}
            fileInputRef={fileInputRef}
          />
        </>
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
