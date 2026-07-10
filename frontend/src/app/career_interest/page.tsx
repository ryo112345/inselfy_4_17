import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export default function CareerInterestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f7f5] px-4 py-12">
      <div className="relative w-full max-w-lg text-center rounded-3xl bg-[#e8f0fa] border border-gray-200 px-10 pt-14 pb-0 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <FloatingShapes />

        <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/50 px-5 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs font-semibold tracking-[0.25em] text-blue-600">
            SELF-ASSESSMENT SYSTEM
          </span>
        </div>

        <h1
          className={`relative z-10 ${playfair.className} text-5xl font-bold text-gray-800 leading-tight mb-2`}
        >
          Career Interest
        </h1>
        <p className="relative z-10 text-xl text-gray-400 mb-8 tracking-[0.3em]">
          キャリア興味診断
        </p>

        <p className="relative z-10 text-base text-gray-400 leading-relaxed mb-10">
          RIASEC理論に基づいて職業興味を測定し、
          <br />
          あなたに合ったキャリアの方向性を可視化します。
        </p>

        <div className="relative z-10 flex justify-center gap-8 mb-10">
          <Stat value="60" label="QUESTIONS" />
          <Stat value="20" label="TYPES" />
          <Stat value="10" label="MIN" />
        </div>

        <div className="relative z-10 -mx-10 border-t border-gray-200 bg-white px-8 pt-6 pb-8">
          <Link
            href="/career_interest/start"
            className="block mx-auto w-3/4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base py-4 transition-colors"
          >
            診断を開始する &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`${inter.className} text-2xl font-medium text-gray-700`}>{value}</span>
      <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">{label}</span>
    </div>
  );
}

const SHAPES = [
  {
    type: "hex",
    size: 130,
    top: "-8%",
    left: "-10%",
    color: "rgba(180,220,210,0.35)",
    dur: "20s",
    dx: 20,
    dy: 15,
    rotate: 15,
  },
  {
    type: "hex",
    size: 90,
    top: "8%",
    left: "75%",
    color: "rgba(170,210,200,0.30)",
    dur: "18s",
    dx: -15,
    dy: 25,
    rotate: -10,
  },
  {
    type: "rect",
    size: 100,
    top: "-5%",
    left: "38%",
    color: "rgba(180,200,230,0.30)",
    dur: "22s",
    dx: 15,
    dy: -20,
    rotate: 30,
  },
  {
    type: "rect",
    size: 75,
    top: "18%",
    left: "85%",
    color: "rgba(200,180,220,0.35)",
    dur: "17s",
    dx: -20,
    dy: 15,
    rotate: -20,
  },
  {
    type: "hex",
    size: 110,
    top: "28%",
    left: "-8%",
    color: "rgba(240,210,180,0.30)",
    dur: "24s",
    dx: 25,
    dy: -15,
    rotate: 25,
  },
  {
    type: "rect",
    size: 65,
    top: "6%",
    left: "20%",
    color: "rgba(160,210,200,0.35)",
    dur: "16s",
    dx: -10,
    dy: 20,
    rotate: 45,
  },
  {
    type: "hex",
    size: 80,
    top: "52%",
    left: "80%",
    color: "rgba(190,220,210,0.28)",
    dur: "21s",
    dx: -20,
    dy: -15,
    rotate: -30,
  },
  {
    type: "rect",
    size: 85,
    top: "45%",
    left: "0%",
    color: "rgba(180,195,230,0.30)",
    dur: "19s",
    dx: 15,
    dy: 20,
    rotate: 10,
  },
  {
    type: "hex",
    size: 120,
    top: "32%",
    left: "38%",
    color: "rgba(230,200,170,0.20)",
    dur: "23s",
    dx: -12,
    dy: 18,
    rotate: -15,
  },
  {
    type: "rect",
    size: 55,
    top: "62%",
    left: "42%",
    color: "rgba(190,215,200,0.28)",
    dur: "18s",
    dx: 18,
    dy: -12,
    rotate: 35,
  },
];

function FloatingShapes() {
  return (
    <>
      <style>{`
        @keyframes shape-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {SHAPES.map((s) => (
          <div
            key={`${s.type}-${s.top}-${s.left}`}
            className="absolute blur-[3px]"
            style={
              {
                width: s.size,
                height: s.size,
                top: s.top,
                left: s.left,
                transform: `rotate(${s.rotate}deg)`,
                "--dx": `${s.dx}px`,
                "--dy": `${s.dy}px`,
                animation: `shape-float ${s.dur} ease-in-out infinite`,
              } as React.CSSProperties
            }
          >
            {s.type === "hex" ? (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50,2 93,25 93,75 50,98 7,75 7,25"
                  fill={s.color}
                  stroke={s.color.replace(/[\d.]+\)$/, "0.4)")}
                  strokeWidth="1"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect
                  x="5"
                  y="5"
                  width="90"
                  height="90"
                  rx="12"
                  fill={s.color}
                  stroke={s.color.replace(/[\d.]+\)$/, "0.4)")}
                  strokeWidth="1"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
