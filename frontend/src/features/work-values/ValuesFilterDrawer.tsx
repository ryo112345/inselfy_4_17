"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ACCENT } from "@/constants/theme";
import type { NeedScoreDTO, ValueScoreDTO } from "./api";
import type { NeedId, ValueId } from "./lib/needs";
import { NEED_IDS, NEED_LABELS, VALUE_IDS, VALUE_LABELS } from "./lib/needs";

export type FilterMode = "values" | "needs";

type ScoreItem = {
  id: string;
  label: string;
  userScore: number;
  threshold: number;
};

export function ValuesFilterDrawer({
  open,
  onClose,
  userNeeds,
  userValues,
  filterMode,
  onFilterModeChange,
  thresholds,
  onThresholdsChange,
  matchingCount,
}: {
  open: boolean;
  onClose: () => void;
  userNeeds: NeedScoreDTO[] | null;
  userValues: ValueScoreDTO[] | null;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  thresholds: Record<string, number>;
  onThresholdsChange: (t: Record<string, number>) => void;
  matchingCount: number;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const valueItems: ScoreItem[] = useMemo(() => {
    return VALUE_IDS.map((id) => {
      const uv = userValues?.find((v) => v.valueId === id);
      return {
        id,
        label: VALUE_LABELS[id],
        userScore: uv ? Math.round(uv.displayScore) : 50,
        threshold: thresholds[id] ?? 0,
      };
    }).sort((a, b) => b.userScore - a.userScore);
  }, [userValues, thresholds]);

  const needItems: ScoreItem[] = useMemo(() => {
    return NEED_IDS.map((id) => {
      const un = userNeeds?.find((n) => n.needId === id);
      return {
        id,
        label: NEED_LABELS[id],
        userScore: un ? Math.round(un.displayScore) : 50,
        threshold: thresholds[id] ?? 0,
      };
    }).sort((a, b) => b.userScore - a.userScore);
  }, [userNeeds, thresholds]);

  const items = filterMode === "values" ? valueItems : needItems;
  const activeCount = Object.values(thresholds).filter((v) => v > 0).length;

  const handleThresholdChange = useCallback(
    (id: string, value: number) => {
      onThresholdsChange({ ...thresholds, [id]: value });
    },
    [thresholds, onThresholdsChange],
  );

  const handleReset = useCallback(() => {
    onThresholdsChange({});
  }, [onThresholdsChange]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative mt-12 flex max-h-[calc(100vh-6rem)] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FilterIcon />
              <h2 className="text-lg font-bold text-gray-900">価値観フィルタ</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex border-b border-gray-200">
            <TabButton
              active={filterMode === "values"}
              onClick={() => onFilterModeChange("values")}
              label={`かんたん (${VALUE_IDS.length})`}
            />
            <TabButton
              active={filterMode === "needs"}
              onClick={() => onFilterModeChange("needs")}
              label={`くわしく (${NEED_IDS.length})`}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {filterMode === "values"
              ? "6つの価値観で絞り込みます。スライダーをドラッグして、チームに求める最低スコアを設定できます。緑の丸はあなたのスコアです。"
              : "21個の細かいニーズで絞り込みます。スライダーをドラッグして、チームに求める最低スコアを設定できます。緑の丸はあなたのスコアです。"}
          </p>

          {/* Sub-header */}
          <div className="mt-3 flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <FilterIcon />
              <span className="text-sm font-semibold text-gray-700">あなたの価値観で探す</span>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                リセット
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
          {items.map((item) => (
            <SliderRow key={item.id} item={item} onChange={handleThresholdChange} />
          ))}
        </div>

        {/* Sticky bottom button */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: ACCENT }}
          >
            {matchingCount}件の求人を見る
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  item,
  onChange,
}: {
  item: ScoreItem;
  onChange: (id: string, value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isActive = item.threshold > 0;

  const calcValue = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    onChange(item.id, pct);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    calcValue(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    calcValue(e.clientX);
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-28 shrink-0 truncate text-sm font-medium text-gray-700">{item.label}</span>
      <span className="w-7 shrink-0 text-right text-sm tabular-nums text-gray-500">
        {item.userScore}
      </span>
      <div
        ref={trackRef}
        className="relative flex-1 flex items-center h-8 cursor-pointer touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200">
          {isActive && (
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${item.threshold}%`,
                backgroundColor: `${ACCENT}30`,
              }}
            />
          )}
        </div>
        {/* User score dot */}
        <div
          className="absolute top-1/2 h-2.5 w-2.5 rounded-full pointer-events-none"
          style={{
            left: `${item.userScore}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: ACCENT,
          }}
        />
        {/* Threshold thumb */}
        {isActive && (
          <div
            className="absolute top-1/2 h-4 w-4 rounded-full pointer-events-none"
            style={{
              left: `${item.threshold}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: "#fff",
              border: "2px solid #9ca3af",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 pb-2.5 text-sm font-medium transition-colors cursor-pointer ${
        active ? "border-b-2 text-gray-900" : "text-gray-400 hover:text-gray-600"
      }`}
      style={active ? { borderColor: ACCENT } : undefined}
    >
      {label}
    </button>
  );
}

function FilterIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
