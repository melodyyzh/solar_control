"use client";

/**
 * 24h activity-density chart. Single series → no legend (the title names it);
 * 2px line + soft area, recessive grid, crosshair + tooltip on hover, and a
 * table view for accessibility. Series color is the validated amber #d97706.
 */

import { useMemo, useRef, useState } from "react";
import type { TelemetrySample } from "@/lib/types";

const W = 640;
const H = 180;
const PAD = { top: 12, right: 10, bottom: 22, left: 30 };
const BIN_MS = 30 * 60 * 1000; // 30-minute bins
const SERIES = "#d97706";

interface Bin {
  t: number;
  score: number | null;
}

function binSamples(samples: TelemetrySample[], now: number): Bin[] {
  const start = now - 24 * 3600_000;
  const bins: Bin[] = [];
  for (let t = start; t <= now; t += BIN_MS) {
    const inBin = samples.filter((s) => s.t >= t && s.t < t + BIN_MS);
    bins.push({
      t,
      score: inBin.length
        ? Math.round(inBin.reduce((a, s) => a + s.score, 0) / inBin.length)
        : null,
    });
  }
  return bins;
}

export default function ActivityChart({ samples }: { samples: TelemetrySample[] }) {
  const now = useMemo(() => Date.now(), []);
  const bins = useMemo(() => binSamples(samples, now), [samples, now]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - bins[0].t) / (24 * 3600_000)) * plotW;
  const y = (score: number) => PAD.top + (1 - score / 100) * plotH;

  // build path segments, breaking on gaps (no telemetry)
  const { linePath, areaPath } = useMemo(() => {
    let line = "";
    let area = "";
    let open = false;
    let segStartX = 0;
    let lastX = 0;
    for (const b of bins) {
      if (b.score === null) {
        if (open) {
          area += ` L ${lastX.toFixed(1)} ${y(0).toFixed(1)} L ${segStartX.toFixed(1)} ${y(0).toFixed(1)} Z`;
          open = false;
        }
        continue;
      }
      const px = x(b.t);
      const py = y(b.score);
      if (!open) {
        line += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
        area += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
        segStartX = px;
        open = true;
      } else {
        line += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
        area += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
      lastX = px;
    }
    if (open) {
      area += ` L ${lastX.toFixed(1)} ${y(0).toFixed(1)} L ${segStartX.toFixed(1)} ${y(0).toFixed(1)} Z`;
    }
    return { linePath: line, areaPath: area };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bins]);

  const hasData = bins.some((b) => b.score !== null);
  const hovered = hover !== null ? bins[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (px - PAD.left) / plotW;
    const idx = Math.round(frac * (bins.length - 1));
    setHover(Math.max(0, Math.min(bins.length - 1, idx)));
  }

  if (!hasData) {
    return (
      <p className="py-8 text-center text-xs" style={{ color: "var(--ink-3)" }}>
        No telemetry yet — the Sun records your activity as you work.
      </p>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Activity density over the last 24 hours"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* recessive grid: 0 / 50 / 100 */}
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--ink-3)"
            >
              {v}
            </text>
          </g>
        ))}
        {/* x labels every 6 hours */}
        {bins
          .filter((_, i) => i % 12 === 0)
          .map((b) => (
            <text
              key={b.t}
              x={x(b.t)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="var(--ink-3)"
            >
              {new Date(b.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </text>
          ))}

        <path d={areaPath} fill={SERIES} opacity="0.14" />
        <path d={linePath} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" />

        {hovered && hovered.score !== null && (
          <g>
            <line
              x1={x(hovered.t)}
              x2={x(hovered.t)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(231,236,245,0.35)"
              strokeWidth="1"
            />
            <circle
              cx={x(hovered.t)}
              cy={y(hovered.score)}
              r="4"
              fill={SERIES}
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {hovered && hovered.score !== null && (
        <div
          className="pointer-events-none absolute rounded-md border px-2 py-1 text-[0.65rem]"
          style={{
            left: `${(x(hovered.t) / W) * 100}%`,
            top: 0,
            transform: `translateX(${x(hovered.t) > W * 0.75 ? "-110%" : "10%"})`,
            borderColor: "var(--edge-strong)",
            background: "var(--surface-raised)",
            color: "var(--ink)",
          }}
        >
          {new Date(hovered.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          {" · score "}
          <strong>{hovered.score}</strong>
        </div>
      )}

      <details className="mt-1">
        <summary className="cursor-pointer text-[0.65rem]" style={{ color: "var(--ink-3)" }}>
          View as table
        </summary>
        <div className="mt-1 max-h-40 overflow-y-auto">
          <table className="w-full text-left text-[0.65rem]" style={{ color: "var(--ink-2)" }}>
            <thead>
              <tr style={{ color: "var(--ink-3)" }}>
                <th className="py-0.5 pr-4 font-medium">Time</th>
                <th className="py-0.5 font-medium">Avg score</th>
              </tr>
            </thead>
            <tbody>
              {bins
                .filter((b) => b.score !== null)
                .map((b) => (
                  <tr key={b.t}>
                    <td className="py-0.5 pr-4 font-mono">
                      {new Date(b.t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-0.5 font-mono">{b.score}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
