"use client";

import {
  TYPE_BASIC_INTERESTS,
  TYPE_LABELS,
  type TypeId,
} from "@/features/career-interest/lib/types";
import { VALUE_LABELS, VALUE_NEEDS, type ValueId } from "@/features/work-values/lib/needs";

const WV_VALUE_ORDER: ValueId[] = [
  "achievement",
  "comfort",
  "status",
  "altruism",
  "safety",
  "autonomy",
];
const WV_GROUP_COLORS: Record<ValueId, string> = {
  achievement: "#48c88c",
  comfort: "#4a90d9",
  status: "#9b6dd7",
  altruism: "#e07b9b",
  safety: "#e8a040",
  autonomy: "#3bbfa0",
};

export const WV_DETAIL_AXES: string[] = [];
export const WV_DETAIL_GROUPS: { label: string; color: string; count: number }[] = [];
for (const v of WV_VALUE_ORDER) {
  const needs = VALUE_NEEDS[v];
  WV_DETAIL_AXES.push(...needs);
  WV_DETAIL_GROUPS.push({ label: VALUE_LABELS[v], color: WV_GROUP_COLORS[v], count: needs.length });
}

export const WV_DETAIL_LABELS: Record<string, string> = {
  ability_utilization: "能力活用",
  achievement: "達成感",
  activity: "活動性",
  advancement: "昇進",
  authority: "権限",
  autonomy: "自律性",
  company_policies: "会社方針",
  compensation: "報酬",
  co_workers: "同僚関係",
  creativity: "創造性",
  independence: "独立性",
  moral_values: "道徳観",
  recognition: "評価",
  responsibility: "責任",
  security: "安定性",
  social_service: "社会貢献",
  social_status: "社会的地位",
  supervision_hr: "上司(人間)",
  supervision_technical: "上司(指導)",
  variety: "多様性",
  working_conditions: "作業環境",
};

const CI_TYPE_ORDER: TypeId[] = ["R", "I", "A", "S", "E", "C"];
const CI_GROUP_COLORS: Record<TypeId, string> = {
  R: "#8B7355",
  I: "#5B8DB8",
  A: "#A878DC",
  S: "#E88B4D",
  E: "#D06070",
  C: "#6B8E9B",
};

export const CI_DETAIL_AXES: string[] = [];
export const CI_DETAIL_GROUPS: { label: string; color: string; count: number }[] = [];
for (const t of CI_TYPE_ORDER) {
  const basics = TYPE_BASIC_INTERESTS[t];
  CI_DETAIL_AXES.push(...basics);
  CI_DETAIL_GROUPS.push({
    label: `${TYPE_LABELS[t]}(${t})`,
    color: CI_GROUP_COLORS[t],
    count: basics.length,
  });
}

export const CI_DETAIL_LABELS: Record<string, string> = {
  A1: "デザイン",
  A2: "コンテンツ",
  A3: "マーケ・PR",
  C1: "会計・財務",
  C2: "事務・管理",
  C3: "IT・システム",
  E1: "経営",
  E2: "営業・交渉",
  E3: "法務・行政",
  I1: "工学研究",
  I2: "生命科学",
  I3: "データ分析",
  I4: "社会調査",
  R1: "機械・製造",
  R2: "建設・土木",
  R3: "ロボティクス",
  S1: "教育・研修",
  S2: "カウンセリング",
  S3: "医療・介護",
  S4: "接客・サービス",
};

export function DetailRadarChart({
  axes,
  labels,
  groups,
  scores,
  normalize,
  fillColor,
  strokeColor,
  isWV,
}: {
  axes: string[];
  labels: Record<string, string>;
  groups: { label: string; color: string; count: number }[];
  scores: { id: string; score: number }[] | null;
  normalize: (score: number) => number;
  fillColor: string;
  strokeColor: string;
  isWV: boolean;
}) {
  const n = axes.length;
  const cx = 280;
  const cy = 218;
  const R = 105;
  const arcR = R + 7;
  const labelR = R + 30;

  const axisAngle = (i: number) => Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (angle: number, r: number) => ({
    x: Math.round((cx - Math.cos(angle) * r) * 1e6) / 1e6,
    y: Math.round((cy - Math.sin(angle) * r) * 1e6) / 1e6,
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = axes.map((_, i) => pt(axisAngle(i), R * level));
    return `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;
  });

  const scoreMap = new Map(scores?.map((s) => [s.id, s.score]) || []);
  const dataPoints = axes.map((id, i) => {
    const val = normalize(scoreMap.get(id) || 0);
    return pt(axisAngle(i), R * Math.max(val, 0.05));
  });
  const dataPath = `${dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;

  const halfStep = Math.PI / n;
  const groupArcs: { d: string; color: string }[] = [];
  let runIdx = 0;
  for (const g of groups) {
    const startA = axisAngle(runIdx) - halfStep * 0.7;
    const endA = axisAngle(runIdx + g.count - 1) + halfStep * 0.7;
    const steps = 24;
    const segs: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = startA + (i / steps) * (endA - startA);
      const p = pt(a, arcR);
      segs.push(`${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    groupArcs.push({ d: segs.join(" "), color: g.color });
    runIdx += g.count;
  }

  const axisLabels = axes.map((id, i) => {
    const angle = axisAngle(i);
    const p = pt(angle, labelR);
    const cosVal = -Math.cos(angle);
    let anchor: "middle" | "start" | "end" = "middle";
    if (cosVal > 0.25) anchor = "start";
    else if (cosVal < -0.25) anchor = "end";
    const val = scoreMap.get(id);
    const scoreStr = val != null ? (isWV ? val.toFixed(0) : val.toFixed(1)) : "";
    return { id, x: p.x, y: p.y, anchor, label: labels[id] || id, scoreStr };
  });

  return (
    <div className="-mx-6 md:mx-0">
      <svg viewBox="65 57 430 335" className="w-full">
        {gridPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#e5e5e5" strokeWidth={0.5} />
        ))}
        {axes.map((_, i) => {
          const p = pt(axisAngle(i), R);
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e5e5" strokeWidth={0.4} />
          );
        })}

        {groupArcs.map((ga, i) => (
          <path
            key={i}
            d={ga.d}
            fill="none"
            stroke={ga.color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}

        {scores && (
          <>
            <path d={dataPath} fill={fillColor} stroke={strokeColor} strokeWidth={1.2} />
            {dataPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={strokeColor} />
            ))}
          </>
        )}

        {axisLabels.map((al) => (
          <g key={al.id}>
            <text
              x={al.x}
              y={al.y - 3}
              textAnchor={al.anchor}
              dominantBaseline="auto"
              fill="#666"
              fontSize={10}
              fontWeight="500"
            >
              {al.label}
            </text>
            {al.scoreStr && (
              <text
                x={al.x}
                y={al.y + 10}
                textAnchor={al.anchor}
                dominantBaseline="auto"
                fill={strokeColor}
                fontSize={11}
                fontWeight="700"
              >
                {al.scoreStr}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-3 justify-center md:flex md:flex-wrap md:justify-center gap-x-3 gap-y-1 -mt-3 px-2 w-fit mx-auto md:w-auto">
        {groups.map((g, i) => (
          <span key={i} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span
              className="inline-block w-2.5 h-1 rounded-full"
              style={{ backgroundColor: g.color, opacity: 0.7 }}
            />
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}
