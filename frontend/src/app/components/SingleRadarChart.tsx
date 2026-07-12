export const WV_ORDER = [
  "achievement",
  "status",
  "autonomy",
  "safety",
  "altruism",
  "comfort",
] as const;
export const WV_FULL_LABELS: Record<string, string> = {
  achievement: "達成",
  status: "地位名声",
  autonomy: "自主性",
  safety: "支援",
  altruism: "人間関係",
  comfort: "労働条件",
};

export const CI_ORDER = ["R", "I", "A", "S", "E", "C"] as const;
export const CI_FULL_LABELS: Record<string, string> = {
  R: "現実的",
  I: "研究的",
  A: "芸術的",
  S: "社会的",
  E: "企業的",
  C: "慣習的",
};

export function SingleRadarChart({
  scores,
  order,
  fullLabels,
  isWV,
  compareScores,
  compareLabel,
  mainLabel,
}: {
  scores: { id: string; score: number }[] | null;
  order: readonly string[];
  fullLabels: Record<string, string>;
  isWV: boolean;
  compareScores?: { id: string; score: number }[] | null;
  compareLabel?: string;
  mainLabel?: string;
}) {
  const cx = 210;
  const cy = 190;
  const R = 115;

  const hexPoint = (i: number, r: number) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / order.length;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const normalize = (score: number) => {
    if (isWV) return score / 100;
    return (score - 1) / 4;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = order.map((_, i) => hexPoint(i, R * level));
    return `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;
  });
  const spokes = order.map((id, i) => ({ id, ...hexPoint(i, R) }));

  const gridColor = "#d5d5d5";
  const fillColor = isWV ? "rgba(72,200,140,0.2)" : "rgba(160,120,220,0.2)";
  const strokeColor = isWV ? "#48c88c" : "#a878dc";
  const dotColor = isWV ? "#48c88c" : "#a878dc";
  const scoreTextColor = isWV ? "#2eb872" : "#9060d0";

  const compareStrokeColor = "#f59e0b";
  const compareFillColor = "rgba(245,158,11,0.08)";

  const scoreMap = new Map(scores?.map((s) => [s.id, s.score]) || []);
  const dataPoints = order.map((id, i) => {
    const val = normalize(scoreMap.get(id) || 0);
    return { id, ...hexPoint(i, R * Math.max(val, 0.05)) };
  });
  const dataPath = `${dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`;

  const compareMap = new Map(compareScores?.map((s) => [s.id, s.score]) || []);
  const comparePoints = compareScores
    ? order.map((id, i) => {
        const val = normalize(compareMap.get(id) || 0);
        return { id, ...hexPoint(i, R * Math.max(val, 0.05)) };
      })
    : null;
  const comparePath = comparePoints
    ? `${comparePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} Z`
    : null;

  const labelPositions = order.map((id, i) => {
    const pt = hexPoint(i, R + 30);
    const angle = Math.PI / 2 + (2 * Math.PI * i) / order.length;
    const cos = -Math.cos(angle);
    let anchor: "middle" | "start" | "end" = "middle";
    if (cos > 0.3) anchor = "start";
    else if (cos < -0.3) anchor = "end";
    return { id, x: pt.x, y: pt.y, anchor };
  });

  const hasCompare = comparePath && compareScores && compareScores.length > 0;
  const w = 420;
  const h = hasCompare ? 410 : 380;

  return (
    <svg
      role="img"
      aria-label={`${isWV ? "Work Values" : "Career Interest"}のレーダーチャート`}
      viewBox={`0 0 ${w} ${h}`}
      overflow="visible"
      className="w-full"
    >
      {gridPaths.map((d) => (
        <path key={d} d={d} fill="none" stroke={gridColor} strokeWidth={0.6} />
      ))}
      {spokes.map((p) => (
        <line key={p.id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={gridColor} strokeWidth={0.6} />
      ))}
      {/* Compare overlay (team) — rendered first so it appears behind */}
      {hasCompare && comparePoints && (
        <>
          <path
            d={comparePath}
            fill={compareFillColor}
            stroke={compareStrokeColor}
            strokeWidth={1.2}
            strokeDasharray="6 3"
          />
          {comparePoints.map((pt) => (
            <circle
              key={pt.id}
              cx={pt.x}
              cy={pt.y}
              r={2.5}
              fill={compareStrokeColor}
              opacity={0.7}
            />
          ))}
        </>
      )}
      {scores && (
        <>
          <path d={dataPath} fill={fillColor} stroke={strokeColor} strokeWidth={1.2} />
          {dataPoints.map((pt) => (
            <circle key={pt.id} cx={pt.x} cy={pt.y} r={3} fill={dotColor} />
          ))}
        </>
      )}
      {labelPositions.map((lp) => {
        const val = scoreMap.get(lp.id);
        const scoreStr = val != null ? (isWV ? val.toFixed(0) : val.toFixed(1)) : "-";
        return (
          <g key={lp.id}>
            <text
              x={lp.x}
              y={lp.y - 9}
              textAnchor={lp.anchor}
              dominantBaseline="auto"
              fill="#444"
              fontSize={19}
              fontWeight="600"
            >
              {fullLabels[lp.id]}
            </text>
            <text
              x={lp.x}
              y={lp.y + 18}
              textAnchor={lp.anchor}
              dominantBaseline="auto"
              fill={scoreTextColor}
              fontSize={24}
              fontWeight="700"
            >
              {scoreStr}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      {hasCompare && (
        <g transform={`translate(${cx + 15}, ${cy + R + 85})`}>
          <line x1={-120} y1={0} x2={-95} y2={0} stroke={strokeColor} strokeWidth={2.5} />
          <circle cx={-107.5} cy={0} r={3} fill={dotColor} />
          <text x={-88} y={5} fill="#444" fontSize={16} fontWeight="600">
            {mainLabel ?? "候補者"}
          </text>
          <line
            x1={10}
            y1={0}
            x2={35}
            y2={0}
            stroke={compareStrokeColor}
            strokeWidth={2.5}
            strokeDasharray="5 3"
          />
          <circle cx={22.5} cy={0} r={2.5} fill={compareStrokeColor} />
          <text x={42} y={5} fill="#444" fontSize={16} fontWeight="600">
            {compareLabel ?? "チーム"}
          </text>
        </g>
      )}
    </svg>
  );
}
