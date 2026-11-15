import React from "react";
import type { WeightLogEntry } from "../types";
import { formatShortDateIndo } from "../utils/nutrition";

interface WeightTrendChartProps {
  entries: WeightLogEntry[];
  targetWeight: number;
}

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  entries,
  targetWeight,
}) => {
  const recent = entries.slice(-14);

  if (recent.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-center px-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0F291E]/60 border border-dashed border-emerald-200 dark:border-emerald-800">
        <p className="text-sm font-medium text-[#0F172A] dark:text-[#ECFDF5]">
          Belum ada catatan berat badan
        </p>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Masukkan berat badan hari ini untuk mulai melihat grafik tren penurunan berat badan Anda.
        </p>
      </div>
    );
  }

  const width = 520;
  const height = 180;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = [...recent.map((e) => e.weightKg), targetWeight];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const minVal = Math.floor(rawMin - 1.5);
  const maxVal = Math.ceil(rawMax + 1.5);
  const span = Math.max(2, maxVal - minVal);

  const getY = (val: number) =>
    padTop + plotH - ((val - minVal) / span) * plotH;

  const getX = (idx: number) => {
    if (recent.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (recent.length - 1)) * plotW;
  };

  const points = recent.map((entry, idx) => ({
    x: getX(idx),
    y: getY(entry.weightKg),
    entry,
  }));

  const linePath = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  const targetY = getY(targetWeight);
  const midVal = (minVal + maxVal) / 2;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Grafik tren berat badan harian"
      >
        <defs>
          <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="weightLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#84CC16" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[maxVal, midVal, minVal].map((val, i) => {
          const y = getY(val);
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-slate-200 dark:stroke-emerald-900/60"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 dark:fill-emerald-300/70 text-[10px] font-mono"
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Target Weight Dashed Line */}
        <line
          x1={padLeft}
          y1={targetY}
          x2={width - padRight}
          y2={targetY}
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text
          x={width - padRight}
          y={targetY - 5}
          textAnchor="end"
          className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-medium"
        >
          Target: {targetWeight} kg
        </text>

        {/* Area & Line */}
        {areaPath && <path d={areaPath} fill="url(#weightAreaGrad)" />}
        {points.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#weightLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data Points */}
        {points.map((pt, idx) => {
          const isLast = idx === points.length - 1;
          const showLabel =
            points.length <= 6 ||
            idx === 0 ||
            idx === points.length - 1 ||
            idx % Math.ceil(points.length / 5) === 0;

          return (
            <g key={pt.entry.date}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isLast ? 5 : 3.5}
                className={
                  isLast
                    ? "fill-[#0F172A] dark:fill-emerald-300"
                    : "fill-white dark:fill-[#0B1F17]"
                }
                stroke="#10B981"
                strokeWidth="2"
              />
              {(isLast || points.length <= 5) && (
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  className="fill-[#0F172A] dark:fill-emerald-50 text-[10px] font-mono font-semibold"
                >
                  {pt.entry.weightKg} kg
                </text>
              )}
              {showLabel && (
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-emerald-300/70 text-[10px]"
                >
                  {formatShortDateIndo(pt.entry.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
