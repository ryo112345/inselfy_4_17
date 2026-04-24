"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function useTypewriter(fullText: string | null, charsPerTick = 2, intervalMs = 30) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const start = useCallback(() => {
    if (!fullText) return;
    indexRef.current = 0;
    setDisplayed("");
    setDone(false);

    timerRef.current = setInterval(() => {
      indexRef.current += charsPerTick;
      if (indexRef.current >= fullText.length) {
        indexRef.current = fullText.length;
        if (timerRef.current) clearInterval(timerRef.current);
        setDone(true);
      }
      setDisplayed(fullText.slice(0, indexRef.current));
    }, intervalMs);
  }, [fullText, charsPerTick, intervalMs]);

  const skip = useCallback(() => {
    if (!fullText) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayed(fullText);
    setDone(true);
  }, [fullText]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { displayed, done, start, skip };
}

function markdownToHtml(md: string): string {
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

  html = html.replace(/^<p>/, '<p class="catchphrase">');
  return html;
}

const reportProseClasses =
  "prose max-w-none text-gray-700 leading-relaxed mb-5 " +
  "[&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-amber-900 [&_h2]:border-l-3 [&_h2]:border-amber-600 [&_h2]:pl-3 " +
  "[&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-amber-800 " +
  "[&_p]:text-[16px] [&_p]:mb-3 [&_p]:leading-[1.9] " +
  "[&_ul]:text-[16px] [&_li]:mb-1 " +
  "[&_.catchphrase]:text-[18px] [&_.catchphrase]:font-medium [&_.catchphrase]:leading-[1.8] [&_.catchphrase]:text-gray-800 [&_.catchphrase]:my-6 [&_.catchphrase]:px-4 [&_.catchphrase]:py-3 [&_.catchphrase]:border-l-3 [&_.catchphrase]:border-amber-400 [&_.catchphrase]:bg-amber-50/50 [&_.catchphrase]:rounded-r-md " +
  "[&_blockquote]:border-l-3 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4";

type Props = {
  requestId: string;
  isOwner?: boolean;
};

export function IntegratedReportContent({ requestId, isOwner = true }: Props) {
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [firstView, setFirstView] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [scrollSpacer, setScrollSpacer] = useState(false);
  const { displayed, done, start } = useTypewriter(reportContent);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/integrated-report/requests/${requestId}/report`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.content) {
          setReportContent(data.content);
          setFirstView(!!data.first_view);
          if (!data.first_view) setShowReport(true);
        }
      })
      .finally(() => setInitialLoading(false));
  }, [requestId]);

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
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div ref={sectionRef} className="relative scroll-mt-4">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span
            className="text-[13px] font-semibold text-white rounded-full px-5 py-1.5 tracking-wide"
            style={{
              background: "linear-gradient(180deg, #b8860b 0%, #9a7209 50%, #7a5a07 100%)",
              boxShadow: "0 4px 10px rgba(120,80,20,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)",
            }}
          >
            inselfy.ai
          </span>
        </div>
        <section className="rounded-2xl border border-gray-200/80 bg-[#fffdf7] px-8 pt-8 pb-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
          <h3 className="text-[14px] font-bold mb-1.5 text-amber-800">統合キャリアレポート</h3>
          <div className="border-t border-gray-200 mb-3" />

          {initialLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-[14px]">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              読み込み中
            </div>
          ) : showReport && reportContent && firstView ? (
            <div
              className={reportProseClasses}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(displayed) }}
            />
          ) : showReport && reportContent ? (
            <div
              className={reportProseClasses}
              dangerouslySetInnerHTML={{ __html: markdownToHtml(reportContent) }}
            />
          ) : reportContent ? (
            isOwner ? (
              <>
                <p className="text-[16px] text-gray-500 leading-relaxed mb-5">
                  あなたの診断結果と経歴をAIが統合分析したレポートが完成しています。
                </p>
                <button
                  onClick={handleClick}
                  className="bg-amber-700 text-white text-[14px] font-semibold rounded-full px-6 py-2.5 shadow-[0_4px_12px_-4px_rgba(120,80,20,0.45)] hover:bg-amber-800 hover:shadow-[0_6px_16px_-4px_rgba(120,80,20,0.55)] transition cursor-pointer"
                >
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
    </div>
  );
}
