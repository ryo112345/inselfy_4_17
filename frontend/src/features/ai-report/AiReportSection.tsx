"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { markdownToHtml } from "@/lib/markdown";
import { usePolling } from "@/lib/usePolling";
import { useTypewriter } from "./useTypewriter";

export type AiReportData = { content?: string | null; firstView?: boolean } | null;

export type AiReportAccent = "emerald" | "purple" | "amber";

type Theme = {
  pillStyle: CSSProperties;
  panelClassName: string;
  headingClassName: string;
  buttonClassName: string;
  proseClasses: string;
};

const THEMES: Record<AiReportAccent, Theme> = {
  emerald: {
    pillStyle: {
      background: "linear-gradient(180deg, #4a8c6f 0%, #2d6b4e 50%, #1f5c3f 100%)",
      boxShadow:
        "0 4px 10px rgba(30,80,55,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
    },
    panelClassName: "rounded-md border border-gray-200 bg-[#fbfdfb] px-8 pt-8 pb-7",
    headingClassName: "text-[#5e5a5a]",
    buttonClassName:
      "bg-emerald-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(5,95,70,0.45)] hover:bg-emerald-800 hover:shadow-[0_6px_16px_-4px_rgba(5,95,70,0.55)] transition cursor-pointer disabled:opacity-50",
    proseClasses:
      "prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-emerald-800 [&_h2]:border-l-3 [&_h2]:border-emerald-600 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-emerald-700 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-emerald-400 [&_.catchphrase]:bg-emerald-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-emerald-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
  },
  purple: {
    pillStyle: {
      background: "linear-gradient(180deg, #9B6BC8 0%, #7B4BAF 50%, #6B3FA0 100%)",
      boxShadow:
        "0 4px 10px rgba(107,63,160,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
    },
    panelClassName: "rounded-md border border-gray-200 bg-[#fdfbff] px-8 pt-8 pb-7",
    headingClassName: "text-[#5e5a5a]",
    buttonClassName:
      "bg-purple-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(107,63,160,0.45)] hover:bg-purple-800 hover:shadow-[0_6px_16px_-4px_rgba(107,63,160,0.55)] transition cursor-pointer disabled:opacity-50",
    proseClasses:
      "prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-purple-800 [&_h2]:border-l-3 [&_h2]:border-purple-500 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-purple-700 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-purple-400 [&_.catchphrase]:bg-purple-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-purple-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
  },
  amber: {
    pillStyle: {
      background: "linear-gradient(180deg, #b8860b 0%, #9a7209 50%, #7a5a07 100%)",
      boxShadow:
        "0 4px 10px rgba(120,80,20,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
    },
    panelClassName: "rounded-xl border border-gray-200/60 bg-[#fffdf7] px-8 pt-8 pb-7",
    headingClassName: "text-amber-800",
    buttonClassName:
      "bg-amber-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(120,80,20,0.45)] hover:bg-amber-800 hover:shadow-[0_6px_16px_-4px_rgba(120,80,20,0.55)] transition cursor-pointer disabled:opacity-50",
    proseClasses:
      "prose max-w-none text-gray-700 leading-relaxed mb-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-amber-900 [&_h2]:border-l-3 [&_h2]:border-amber-600 [&_h2]:pl-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-amber-800 [&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] [&_ul]:text-[16px] [&_li]:mb-1 [&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-amber-400 [&_.catchphrase]:bg-amber-50/50 [&_.catchphrase]:rounded-r-md [&_blockquote]:border-l-3 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4",
  },
};

/**
 * AI レポート表示セクション（WV / CI / 統合レポート共通）。
 *
 * variant:
 * - "generate": オーナーに「レポートを作成する」ボタンを出し、未生成なら
 *   「作成中」表示の間だけポーリングする（WV / CI）。
 * - "view": マウント直後からオーナーのみポーリングし、生成済みなら
 *   「レポートを見る」ボタンで開く（統合レポート）。
 *
 * fetchReport は再フェッチのトリガーになるため、呼び出し側で useCallback 等で
 * 安定させること。
 */
export function AiReportSection({
  fetchReport,
  accent,
  heading,
  variant,
  isOwner,
  className,
  children,
}: {
  fetchReport: () => Promise<AiReportData>;
  accent: AiReportAccent;
  heading: string;
  variant: "generate" | "view";
  isOwner: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const theme = THEMES[accent];
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [firstView, setFirstView] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [scrollSpacer, setScrollSpacer] = useState(false);
  // fetch/ポーリング成功時に true にすると、reportContent 反映後の
  // レンダーでタイプライターを開始する（start は取得時点の
  // reportContent をクロージャで掴むため、同期呼び出しでは空になる）
  const [pendingTypewriter, setPendingTypewriter] = useState(false);
  const { displayed, done, start } = useTypewriter(reportContent);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingTypewriter && reportContent) {
      setPendingTypewriter(false);
      start();
    }
  }, [pendingTypewriter, reportContent, start]);

  useEffect(() => {
    let cancelled = false;
    fetchReport()
      .then((data) => {
        if (cancelled) return;
        if (data?.content) {
          setReportContent(data.content);
          setFirstView(!!data.firstView);
          if (!data.firstView) setShowReport(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchReport]);

  // generate: 「作成中」表示の間だけ / view: 未生成の間オーナーのみポーリング
  const pollingEnabled =
    variant === "generate"
      ? notFound && reportContent === null
      : isOwner && !initialLoading && reportContent === null;

  usePolling(pollingEnabled, async () => {
    const data = await fetchReport();
    if (data?.content) {
      setReportContent(data.content);
      setFirstView(!!data.firstView);
      if (variant === "generate") {
        setShowReport(true);
        setNotFound(false);
        if (data.firstView) setPendingTypewriter(true);
      } else if (!data.firstView) {
        setShowReport(true);
      }
      return false;
    }
    return true;
  });

  const handleClick = () => {
    if (reportContent) {
      setScrollSpacer(true);
      setShowReport(true);
      if (firstView) {
        requestAnimationFrame(() => {
          if (sectionRef.current) {
            sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            let timer: ReturnType<typeof setTimeout>;
            const onScroll = () => {
              clearTimeout(timer);
              timer = setTimeout(() => {
                window.removeEventListener("scroll", onScroll);
                start();
              }, 80);
            };
            window.addEventListener("scroll", onScroll);
            onScroll();
          } else {
            start();
          }
        });
      }
    } else if (variant === "generate") {
      setLoading(true);
      fetchReport()
        .then((data) => {
          if (data?.content) {
            setReportContent(data.content);
            setFirstView(!!data.firstView);
            setShowReport(true);
            if (data.firstView) setPendingTypewriter(true);
          } else {
            setNotFound(true);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  return (
    <div ref={sectionRef} className={`relative scroll-mt-4${className ? ` ${className}` : ""}`}>
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <span
          className="text-[13px] font-semibold text-white rounded-full px-5 py-1.5 tracking-wide"
          style={theme.pillStyle}
        >
          inselfy.ai
        </span>
      </div>
      <section className={theme.panelClassName}>
        <h3 className={`text-[14px] font-bold mb-1.5 ${theme.headingClassName}`}>{heading}</h3>
        <div className="border-t border-gray-200 mb-3" />

        {children}

        {initialLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[14px]">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            読み込み中
          </div>
        ) : showReport && reportContent && firstView ? (
          <div
            className={theme.proseClasses}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markdownToHtml が DOMPurify でサニタイズ済み
            dangerouslySetInnerHTML={{ __html: markdownToHtml(displayed) }}
          />
        ) : showReport && reportContent ? (
          <div
            className={theme.proseClasses}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markdownToHtml が DOMPurify でサニタイズ済み
            dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
          />
        ) : variant === "generate" ? (
          isOwner ? (
            <>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-5">
                AIがあなたの診断結果を分析し、適した職業やキャリアアドバイスをレポートとして生成します。
              </p>
              <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className={theme.buttonClassName}
              >
                レポートを作成する
              </button>
              {notFound && (
                <p className="text-[13px] text-amber-600 mt-4">
                  レポートはまだ作成中です。しばらくお待ちください。
                </p>
              )}
            </>
          ) : (
            <p className="text-[16px] text-gray-500 leading-relaxed">
              レポートはまだ作成されていません。
            </p>
          )
        ) : reportContent ? (
          isOwner ? (
            <>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-5">
                あなたの診断結果と経歴をAIが統合分析したレポートが完成しています。
              </p>
              <button type="button" onClick={handleClick} className={theme.buttonClassName}>
                レポートを見る
              </button>
            </>
          ) : (
            <p className="text-[16px] text-gray-500 leading-relaxed">
              レポートを表示するにはログインしてください。
            </p>
          )
        ) : (
          <p className="text-[16px] text-gray-500 leading-relaxed">
            レポートはまだ作成されていません。
          </p>
        )}
      </section>
      {scrollSpacer && !done && <div className="h-screen" />}
    </div>
  );
}
