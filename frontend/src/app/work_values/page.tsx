import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";

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

export default function WorkValuesPage() {

  return (
    <main className="min-h-screen flex justify-center bg-[#f6f7f5] px-4 pt-[15vh] pb-12 relative">
<div className="relative w-full max-w-lg h-fit text-center rounded-3xl bg-[#0a1628] border border-gray-700 px-10 py-14 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        <FloatingSpheres />
        <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold tracking-[0.25em] text-emerald-400">
            SELF-ASSESSMENT SYSTEM
          </span>
        </div>

        <h1
          className={`relative z-10 ${playfair.className} text-5xl font-bold text-white leading-tight mb-2`}
        >
          Work Values
        </h1>
        <p className="relative z-10 text-xl text-gray-300 mb-8 tracking-[0.3em]">価値観診断</p>

        <p className="relative z-10 text-base text-gray-400 leading-relaxed mb-10">
          21の仕事価値観を一対比較で測定し、
          <br />
          あなたの内なるコンパスを可視化します。
        </p>

        <div className="relative z-10 flex justify-center gap-8 mb-10">
          <Stat value="70" label="PAIRS" />
          <Stat value="21" label="NEEDS" />
          <Stat value="10" label="MIN" />
        </div>

        <div className="relative z-10 -mx-10 -mb-14 mt-10 border-t border-gray-700 bg-gradient-to-t from-black/90 to-[#0a1628] px-10 py-8">
          <Link
            href="/work_values/start"
            className="block mx-auto w-3/4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base py-4 transition-colors"
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
      <span className={`${inter.className} text-2xl font-medium text-white`}>{value}</span>
      <span className="text-xs font-semibold tracking-wider text-emerald-400/80 uppercase">
        {label}
      </span>
    </div>
  );
}

const SPHERES = [
  { size: 120, top: "-5%", left: "-5%", color: "rgba(120,140,220,0.45)", dur: "18s", dx: 40, dy: 30 },
  { size: 110, top: "-8%", left: "75%", color: "rgba(200,120,140,0.35)", dur: "22s", dx: -35, dy: 45 },
  { size: 140, top: "30%", left: "-10%",color: "rgba(100,180,190,0.30)", dur: "25s", dx: 30, dy: -40 },
  { size: 80,  top: "60%", left: "-5%", color: "rgba(170,130,210,0.40)", dur: "20s", dx: 50, dy: 25 },
  { size: 100, top: "50%", left: "78%", color: "rgba(210,170,100,0.35)", dur: "23s", dx: -40, dy: -35 },
  { size: 60,  top: "10%", left: "20%", color: "rgba(130,200,160,0.40)", dur: "16s", dx: 35, dy: 50 },
  { size: 70,  top: "5%",  left: "88%", color: "rgba(200,110,160,0.35)", dur: "19s", dx: -25, dy: 40 },
  { size: 90,  top: "78%", left: "50%", color: "rgba(110,160,220,0.35)", dur: "21s", dx: 45, dy: -30 },
  { size: 50,  top: "35%", left: "90%", color: "rgba(220,190,100,0.38)", dur: "17s", dx: -30, dy: 35 },
  { size: 110, top: "72%", left: "15%", color: "rgba(160,120,200,0.28)", dur: "26s", dx: -35, dy: -25 },
  { size: 45,  top: "-3%", left: "45%", color: "rgba(180,200,120,0.40)", dur: "15s", dx: -20, dy: 35 },
  { size: 100, top: "80%", left: "80%", color: "rgba(120,180,200,0.35)", dur: "24s", dx: 30, dy: -20 },
  { size: 55,  top: "45%", left: "5%",  color: "rgba(220,140,180,0.38)", dur: "17s", dx: -40, dy: 20 },
  { size: 75,  top: "68%", left: "65%", color: "rgba(160,210,170,0.35)", dur: "20s", dx: 20, dy: -45 },
  { size: 90,  top: "40%", left: "40%", color: "rgba(150,140,210,0.35)", dur: "23s", dx: -25, dy: 30 },
  { size: 65,  top: "48%", left: "55%", color: "rgba(180,160,200,0.32)", dur: "19s", dx: 30, dy: -25 },
  { size: 100, top: "18%", left: "50%", color: "rgba(140,180,220,0.38)", dur: "22s", dx: -20, dy: 25 },
];

function FloatingSpheres() {
  return (
    <>
      <style>{`
        @keyframes sphere-float {
          0%, 100% { translate: 0 0; }
          33% { translate: var(--dx) var(--dy); }
          66% { translate: calc(var(--dx) * -0.6) calc(var(--dy) * 0.8); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {SPHERES.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[1px]"
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, ${s.color} 40%, rgba(0,0,0,0.3) 100%)`,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              animation: `sphere-float ${s.dur} ease-in-out infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}
