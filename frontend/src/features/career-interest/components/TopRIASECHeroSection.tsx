"use client";

import type { CSSProperties } from "react";
import { ResultHeroEffects } from "@/app/components/ResultHeroEffects";
import type { ResultDTO } from "@/features/career-interest/api";
import { getCIPersona } from "@/features/career-interest/lib/personas";
import {
  TYPE_ABBREVIATIONS,
  TYPE_ENGLISH_NAMES,
  type TypeId,
} from "@/features/career-interest/lib/types";

const BADGE_STYLES = [
  {
    background: "linear-gradient(170deg, #C49CF0 0%, #A87DE0 30%, #8B5CC8 60%, #7B4BAF 100%)",
    boxShadow:
      "0 6px 14px rgba(120,70,200,0.35), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #B890E8 0%, #9C70DC 30%, #8858C8 60%, #7A50B8 100%)",
    boxShadow:
      "0 6px 14px rgba(110,70,190,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #B088DC 0%, #9668C8 30%, #8058B8 60%, #7450A8 100%)",
    boxShadow:
      "0 6px 14px rgba(100,70,170,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
];

export function TopRIASECHeroSection({
  types,
  createdAt,
}: {
  types: ResultDTO["typeScores"];
  createdAt: string;
}) {
  const top3 = types.slice(0, 3);
  const persona = getCIPersona(types);

  return (
    <section
      className="mb-6 text-center px-6 pt-14 pb-6 relative overflow-hidden -mx-6 -mt-5 rounded-t-2xl"
      style={{ backgroundColor: "#F8F3FD", "--hero-ripple": "#B08CD4" } as CSSProperties}
    >
      <ResultHeroEffects />
      <div className="result-ripple-tr" />
      <div className="result-ripple-bl" />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-purple-50 transition-colors"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1={12} y1={2} x2={12} y2={15} />
          </svg>
          Share Link
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-purple-50 transition-colors"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={2} y={2} width={20} height={20} rx={5} />
            <circle cx={12} cy={12} r={4} />
            <circle cx={18} cy={6} r={1.5} fill="currentColor" stroke="none" />
          </svg>
          Share Story
        </button>
      </div>
      <div className="absolute top-4 left-4 z-10">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border"
          style={{ borderColor: "#c8b8dc", backgroundColor: "#F8F3FD", color: "#8e6aae" }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {(() => {
            const d = new Date(createdAt);
            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
          })()}
        </span>
      </div>
      <h2
        className="relative text-[12px] font-bold tracking-[0.2em] mb-2 uppercase"
        style={{ color: "#9a8aaa" }}
      >
        Your RIASEC Type
      </h2>
      <p
        className="relative text-[26px] font-bold mb-1.5 bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #6B3FA0, #8B5CC8, #A87DE0, #C49CF0)",
        }}
      >
        {persona.modifier}
        {persona.name}
      </p>
      <p className="relative text-[14px] mb-5 tracking-wide" style={{ color: "#9a8aaa" }}>
        {persona.subtitle}
      </p>
      {/* Desktop: 3-column grid */}
      <div className="relative hidden md:grid grid-cols-3 items-center -mt-11">
        <div className="flex flex-col items-end gap-1 pr-4 justify-self-center translate-x-2">
          {top3.map((t) => (
            <span
              key={t.typeId}
              className="text-[16px] font-semibold leading-snug tracking-wide"
              style={{ color: "#5A2D82", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {TYPE_ENGLISH_NAMES[t.typeId as TypeId]}
            </span>
          ))}
        </div>
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((t, i) => {
            const tid = t.typeId as TypeId;
            const sizes = [
              { size: "80px", text: "text-3xl", radius: "rounded-2xl" },
              { size: "64px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "52px", text: "text-xl", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            return (
              <span
                key={tid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center result-badge-text result-badge-glow result-badge-float-${i + 1} shrink-0`}
                style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {TYPE_ABBREVIATIONS[tid]}
              </span>
            );
          })}
        </div>
        <div className="flex justify-start pl-4">
          <RIASECRadarChart types={types} />
        </div>
      </div>
      {/* Mobile: stacked layout */}
      <div className="relative flex flex-col items-center gap-4 md:hidden">
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((t, i) => {
            const tid = t.typeId as TypeId;
            const sizes = [
              { size: "72px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "58px", text: "text-xl", radius: "rounded-2xl" },
              { size: "48px", text: "text-lg", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            return (
              <span
                key={tid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center result-badge-text result-badge-glow result-badge-float-${i + 1} shrink-0`}
                style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {TYPE_ABBREVIATIONS[tid]}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
          {top3.map((t) => (
            <span
              key={t.typeId}
              className="text-[14px] font-semibold leading-snug tracking-wide"
              style={{ color: "#5A2D82", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {TYPE_ENGLISH_NAMES[t.typeId as TypeId]}
            </span>
          ))}
        </div>
        <RIASECRadarChart types={types} />
      </div>
    </section>
  );
}

const RADAR_ORDER: TypeId[] = ["R", "I", "A", "S", "E", "C"];

function RIASECRadarChart({ types }: { types: ResultDTO["typeScores"] }) {
  const cx = 95;
  const cy = 95;
  const R = 60;
  const scoreMap = new Map(types.map((t) => [t.typeId, t]));

  const hexPoint = (i: number, r: number) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / 6;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = RADAR_ORDER.map((_, i) => hexPoint(i, R * level));
    return `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;
  });

  const dataPoints = RADAR_ORDER.map((tid, i) => {
    const t = scoreMap.get(tid);
    const score = t ? (t.score - 1) / 4 : 0;
    return hexPoint(i, R * Math.max(score, 0.05));
  });
  const dataPath = `${dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;

  const spokes = RADAR_ORDER.map((_, i) => hexPoint(i, R));

  return (
    <svg width={190} height={190} className="shrink-0">
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#d0c0e0" strokeWidth={0.6} />
      ))}
      {spokes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d0c0e0" strokeWidth={0.6} />
      ))}
      <path d={dataPath} fill="rgba(139,92,200,0.15)" stroke="#8B5CC8" strokeWidth={1.2} />
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#8B5CC8" />
      ))}
      {RADAR_ORDER.map((tid, i) => {
        const pt = hexPoint(i, R + 20);
        return (
          <g key={tid}>
            <circle cx={pt.x} cy={pt.y} r={14} fill="#f0e8fa" stroke="#A87DE0" strokeWidth={1} />
            <text
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#6B3FA0"
              fontSize={13}
              fontWeight="600"
            >
              {TYPE_ABBREVIATIONS[tid]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
