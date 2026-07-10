"use client";

import type { CSSProperties } from "react";
import { ResultHeroEffects } from "@/app/components/ResultHeroEffects";
import type { ResultDTO } from "@/features/work-values/api";
import {
  VALUE_ABBREVIATIONS,
  VALUE_ENGLISH_NAMES,
  type ValueId,
} from "@/features/work-values/lib/needs";
import { getWVPersona } from "@/features/work-values/lib/personas";

const BADGE_STYLES = [
  {
    background: "linear-gradient(170deg, #98e0f0 0%, #6ad0e0 30%, #4ac0d4 60%, #58c0b8 100%)",
    boxShadow:
      "0 6px 14px rgba(70,180,200,0.35), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #90dcd6 0%, #64d0c4 30%, #48c0b4 60%, #50bca8 100%)",
    boxShadow:
      "0 6px 14px rgba(70,180,170,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  {
    background: "linear-gradient(170deg, #94dcc4 0%, #6cd0ac 30%, #54c498 60%, #4cbc90 100%)",
    boxShadow:
      "0 6px 14px rgba(90,180,140,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
];

export function TopValuesCodeSection({
  values,
  createdAt,
}: {
  values: ResultDTO["values"];
  createdAt: string;
}) {
  const top3 = values.slice(0, 3);
  const persona = getWVPersona(values);

  return (
    <section
      className="mb-6 text-center px-6 pt-14 pb-6 relative overflow-hidden -mx-6 -mt-5 rounded-t-2xl"
      style={{ backgroundColor: "#F5FBF8", "--hero-ripple": "#7DC4A0" } as CSSProperties}
    >
      <ResultHeroEffects />
      <div className="result-ripple-tr" />
      <div className="result-ripple-bl" />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-emerald-50 transition-colors"
          style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}
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
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] border cursor-pointer hover:bg-emerald-50 transition-colors"
          style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}
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
          style={{ borderColor: "#b8dcc8", backgroundColor: "#F5FBF8", color: "#5dae8e" }}
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
        style={{ color: "#8a9e94" }}
      >
        Your Work Values
      </h2>
      <p
        className="relative text-[26px] font-bold mb-1.5 bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(to right, #0E7B4E, #1B9E6A, #4ECFA0, #7EDDBB)",
        }}
      >
        {persona.modifier}
        {persona.name}
      </p>
      <p className="relative text-[14px] mb-5 tracking-wide" style={{ color: "#8a9e94" }}>
        {persona.subtitle}
      </p>
      {/* Desktop: 3-column grid */}
      <div className="relative hidden md:grid grid-cols-3 items-center -mt-11">
        <div className="flex flex-col items-end gap-1 pr-4 justify-self-center translate-x-2">
          {top3.map((v) => (
            <span
              key={v.valueId}
              className="text-[16px] font-semibold leading-snug tracking-wide"
              style={{ color: "#1B6B4A", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {VALUE_ENGLISH_NAMES[v.valueId as ValueId]}
            </span>
          ))}
        </div>
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((v, i) => {
            const vid = v.valueId as ValueId;
            const sizes = [
              { size: "80px", text: "text-3xl", radius: "rounded-2xl" },
              { size: "64px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "52px", text: "text-xl", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            return (
              <span
                key={vid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center result-badge-text result-badge-glow result-badge-float-${i + 1} shrink-0`}
                style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {VALUE_ABBREVIATIONS[vid]}
              </span>
            );
          })}
        </div>
        <div className="flex justify-start pl-4">
          <ValuesRadarChart values={values} />
        </div>
      </div>
      {/* Mobile: stacked layout */}
      <div className="relative flex flex-col items-center gap-4 md:hidden">
        <div className="flex items-end justify-center gap-2.5">
          {top3.map((v, i) => {
            const vid = v.valueId as ValueId;
            const sizes = [
              { size: "72px", text: "text-2xl", radius: "rounded-2xl" },
              { size: "58px", text: "text-xl", radius: "rounded-2xl" },
              { size: "48px", text: "text-lg", radius: "rounded-xl" },
            ];
            const s = sizes[i];
            return (
              <span
                key={vid}
                className={`${s.radius} text-white ${s.text} font-bold flex items-center justify-center result-badge-text result-badge-glow result-badge-float-${i + 1} shrink-0`}
                style={{ ...BADGE_STYLES[i], width: s.size, height: s.size, aspectRatio: "1/1" }}
              >
                {VALUE_ABBREVIATIONS[vid]}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
          {top3.map((v) => (
            <span
              key={v.valueId}
              className="text-[14px] font-semibold leading-snug tracking-wide"
              style={{ color: "#1B6B4A", fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {VALUE_ENGLISH_NAMES[v.valueId as ValueId]}
            </span>
          ))}
        </div>
        <ValuesRadarChart values={values} />
      </div>
    </section>
  );
}

const RADAR_ORDER: ValueId[] = [
  "achievement",
  "status",
  "autonomy",
  "safety",
  "altruism",
  "comfort",
];

function ValuesRadarChart({ values }: { values: ResultDTO["values"] }) {
  const cx = 95;
  const cy = 95;
  const R = 60;
  const scoreMap = new Map(values.map((v) => [v.valueId, v]));

  const hexPoint = (i: number, r: number) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / 6;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = RADAR_ORDER.map((_, i) => hexPoint(i, R * level));
    return `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;
  });

  const dataPoints = RADAR_ORDER.map((vid, i) => {
    const v = scoreMap.get(vid);
    const score = v ? v.displayScore / 100 : 0;
    return { id: vid, ...hexPoint(i, R * Math.max(score, 0.05)) };
  });
  const dataPath = `${dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;

  const spokes = RADAR_ORDER.map((vid, i) => ({ id: vid, ...hexPoint(i, R) }));

  return (
    <svg width={190} height={190} className="shrink-0">
      {gridPaths.map((d) => (
        <path key={d} d={d} fill="none" stroke="#d0ddd6" strokeWidth={0.6} />
      ))}
      {spokes.map((p) => (
        <line key={p.id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d0ddd6" strokeWidth={0.6} />
      ))}
      <path d={dataPath} fill="rgba(61,139,110,0.15)" stroke="#5a9e82" strokeWidth={1.2} />
      {dataPoints.map((pt) => (
        <circle key={pt.id} cx={pt.x} cy={pt.y} r={3} fill="#4a9474" />
      ))}
      {RADAR_ORDER.map((vid, i) => {
        const pt = hexPoint(i, R + 20);
        return (
          <g key={vid}>
            <circle cx={pt.x} cy={pt.y} r={14} fill="#ebf9f3" stroke="#40b090" strokeWidth={1} />
            <text
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#057f5d"
              fontSize={13}
              fontWeight="600"
            >
              {VALUE_ABBREVIATIONS[vid]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
