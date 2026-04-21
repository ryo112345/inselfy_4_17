"use client";

import { useState } from "react";
import { Modal, Field, PrimaryButton, SecondaryButton } from "./Modal";

const TOPICS = [
  { id: 1, title: "キャリアを「物語」として読み解く", sub: "選択の連なりが描く、あなただけのストーリー" },
  { id: 2, title: "あなたの取扱説明書", sub: "上司・同僚に渡したい「この人の活かし方」" },
  { id: 3, title: "あなたの「仕事の流儀」", sub: "無意識にこだわっている仕事の進め方・美学" },
  { id: 4, title: "面接で使える「自分の言語化」", sub: "診断と経歴から作る、あなたのストーリー" },
  { id: 5, title: "転職・異動の「判断パターン」分析", sub: "何がトリガーで動いてきたか" },
  { id: 6, title: "あなたの「仕事スイッチ」の入り方", sub: "いつ・なぜエンジンがかかるのか" },
  { id: 7, title: "あなたを一番成長させる「修羅場」", sub: "どんな困難が次のレベルに連れていくか" },
  { id: 8, title: "あなたの「リーダーシップの型」", sub: "人を動かすとき、あなたは自然と何をしているか" },
  { id: 9, title: "最高の相性のチームメイト像", sub: "どんな人と組むと力を発揮するか" },
  { id: 10, title: "見落としている「伸びしろ」", sub: "まだ活かしきれていない可能性" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export function IntegratedReportModal({ open, onClose, onSubmitted }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const canSubmit = selected.length === 3 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/integrated-report/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic1: selected[0],
          topic2: selected[1],
          topic3: selected[2],
          free_text: freeText,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "リクエストに失敗しました");
      }
      onSubmitted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="統合レポートを生成する"
      footer={
        <>
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
          >
            この内容で生成する
          </PrimaryButton>
        </>
      }
    >
      <p className="mb-4 text-sm text-gray-600">
        10のテーマから<strong>3つ</strong>を選んでください。選んだ順にレポートの章立てになります。
      </p>

      <div className="mb-5 grid grid-cols-1 gap-2">
        {TOPICS.map((topic) => {
          const idx = selected.indexOf(topic.id);
          const isSelected = idx !== -1;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => toggle(topic.id)}
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50 shadow-sm"
                  : selected.length >= 3
                    ? "border-gray-200 bg-gray-50 opacity-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isSelected
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {isSelected ? idx + 1 : ""}
              </span>
              <span>
                <span className="text-sm font-semibold text-gray-900">
                  {topic.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {topic.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Field
        label="AIに聞きたいこと（自由記述）"
        hint={`${[...freeText].length} / 200`}
      >
        <textarea
          value={freeText}
          onChange={(e) => {
            if ([...e.target.value].length <= 200) setFreeText(e.target.value);
          }}
          placeholder="例: 自分はこの道でいいのか、他の道に行ったらいいのか示してほしい。"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </Field>

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </Modal>
  );
}
