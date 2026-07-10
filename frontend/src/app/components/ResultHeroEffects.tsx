/**
 * 診断結果ヒーローセクション共通の装飾 CSS（リップル・バッジの浮遊/シマー）。
 * リップルの色は親要素の CSS 変数 `--hero-ripple` で指定する。
 * WV / CI 両パネルが同一ページに載っても定義が同じなので競合しない。
 */
export function ResultHeroEffects() {
  return (
    <style>{`
      @keyframes result-ripple-pulse {
        0% { width: 180px; height: 180px; opacity: 0.2; }
        50% { width: 280px; height: 280px; opacity: 0.08; }
        100% { width: 180px; height: 180px; opacity: 0.2; }
      }
      .result-ripple-tr {
        position: absolute;
        top: 12%; right: 6%;
        border-radius: 50%;
        border: 1.5px solid var(--hero-ripple);
        pointer-events: none;
        transform: translate(50%, -50%);
        animation: result-ripple-pulse 8s ease-in-out infinite;
      }
      .result-ripple-bl {
        position: absolute;
        bottom: 8%; left: 5%;
        border-radius: 50%;
        border: 1.5px solid var(--hero-ripple);
        pointer-events: none;
        transform: translate(-50%, 50%);
        animation: result-ripple-pulse 8s ease-in-out infinite;
      }
      .result-badge-text {
        text-shadow: 0 1px 3px rgba(0,0,0,0.15);
      }
      @keyframes result-shimmer {
        0% { opacity: 0; transform: translate(-30%, -30%) scale(0.5); }
        50% { opacity: 1; }
        100% { opacity: 0; transform: translate(30%, 30%) scale(1.2); }
      }
      @keyframes result-float-1 {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      @keyframes result-float-2 {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @keyframes result-float-3 {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2.5px); }
      }
      .result-badge-glow {
        position: relative;
        overflow: hidden;
      }
      .result-badge-float-1 { animation: result-float-1 5s ease-in-out infinite; }
      .result-badge-float-2 { animation: result-float-2 5.6s ease-in-out 0.5s infinite; }
      .result-badge-float-3 { animation: result-float-3 4.6s ease-in-out 1s infinite; }
      .result-badge-glow::after {
        content: '';
        position: absolute;
        width: 60%;
        height: 60%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
        animation: result-shimmer 4s ease-in-out infinite;
        pointer-events: none;
      }
    `}</style>
  );
}
