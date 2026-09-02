import { useState } from "react";

interface HoverableSkillPieChartProps {
  percentage: number;
  correct?: number;
  total?: number;
  status?: string;
  size?: number;
  strokeWidth?: number;
  isCohort?: boolean;
  cardBackground?: "dark" | "yellow";
}

export default function HoverableSkillPieChart({
  percentage = 0,
  correct = 0,
  total = 0,
  status = "Unassessed",
  size = 80,
  strokeWidth = 8,
  isCohort = false,
  cardBackground = "dark"
}: HoverableSkillPieChartProps) {
  const [isHovered, setIsHovered] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate percentages
  const validTotal = Math.max(total, 0);
  const validCorrect = Math.max(correct, 0);
  const incorrect = Math.max(validTotal - validCorrect, 0);

  const pct = Math.min(Math.max(percentage, 0), 100);
  const correctRatio = validTotal > 0 ? validCorrect / validTotal : pct / 100;
  const incorrectRatio = validTotal > 0 ? incorrect / validTotal : 0;

  const correctStrokeLength = correctRatio * circumference;
  const incorrectStrokeLength = incorrectRatio * circumference;

  // Segment colors
  const isMastered = pct >= 80;
  const isPractice = pct > 0 && pct < 80;
  const hasAttempts = validTotal > 0 || pct > 0;

  const isYellow = cardBackground === "yellow";

  const correctColor = isYellow
    ? isMastered
      ? "#047857"
      : isPractice
      ? "#B45309"
      : "rgba(18, 19, 22, 0.3)"
    : isCohort
    ? isMastered
      ? "#10B981"
      : isPractice
      ? "#F59E0B"
      : "#64748B"
    : isMastered
    ? "#10B981"
    : isPractice
    ? "#F59E0B"
    : "#64748B";

  const incorrectColor = isYellow ? "#BE123C" : "#F43F5E";
  const trackStroke = isYellow ? "rgba(18, 19, 22, 0.15)" : "#25272F";

  const glowShadow = isHovered
    ? isYellow
      ? isMastered
        ? "drop-shadow(0 0 6px rgba(4, 120, 87, 0.5))"
        : isPractice
        ? "drop-shadow(0 0 6px rgba(180, 83, 9, 0.5))"
        : "none"
      : isMastered
      ? "drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))"
      : isPractice
      ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))"
      : "drop-shadow(0 0 6px rgba(100, 116, 139, 0.4))"
    : "none";

  return (
    <div
      className="relative flex items-center justify-center shrink-0 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: size, height: size }}
    >
      {/* SVG Pie / Donut Chart */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 transition-transform duration-300 ease-out group-hover:scale-110 cursor-pointer"
        style={{ filter: glowShadow }}
      >
        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeWidth}
          className="transition-colors duration-200"
        />

        {/* Incorrect / Mistakes Arc (Rose) */}
        {hasAttempts && incorrectStrokeLength > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={incorrectColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${incorrectStrokeLength} ${circumference}`}
            strokeDashoffset={-correctStrokeLength}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Correct Arc (Emerald/Amber) */}
        {hasAttempts && correctStrokeLength > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={correctColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${correctStrokeLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-black tracking-tighter leading-none transition-colors duration-200 ${
            size >= 76 ? "text-base sm:text-lg" : size >= 64 ? "text-xs sm:text-sm" : "text-[11px]"
          } ${
            isYellow
              ? "text-[#121316]"
              : isMastered
              ? "text-emerald-400"
              : isPractice
              ? "text-amber-400"
              : "text-slate-400"
          }`}
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Hoverable Interactive Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#121316]/95 border border-[#333642] px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md whitespace-nowrap min-w-[140px] text-left">
            <div className="flex items-center justify-between gap-3 mb-1.5 pb-1.5 border-b border-[#25272F]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isCohort ? "Class Cohort" : "Skill Accuracy"}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isMastered
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isPractice
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {status}
              </span>
            </div>

            {hasAttempts ? (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-3 font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>{isCohort ? "Mastered" : "Correct"}</span>
                  </span>
                  <span className="font-black">{validCorrect}</span>
                </div>

                {incorrect > 0 && (
                  <div className="flex items-center justify-between gap-3 font-semibold text-rose-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                      <span>{isCohort ? "Needs Work" : "Incorrect"}</span>
                    </span>
                    <span className="font-black">{incorrect}</span>
                  </div>
                )}

                <div className="pt-1 border-t border-[#25272F] flex items-center justify-between text-[11px] text-slate-300 font-bold">
                  <span>Score</span>
                  <span className="text-white font-black">{pct}%</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">
                No quiz questions attempted yet
              </p>
            )}

            {/* Little Arrow Indicator */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#333642]" />
          </div>
        </div>
      )}
    </div>
  );
}
