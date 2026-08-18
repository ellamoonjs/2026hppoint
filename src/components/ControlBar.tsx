import React from 'react';
import { RotateCcw, Sun, Moon, Sparkles, Sliders, Info } from 'lucide-react';
import { IntersectionResult } from '../types';

interface ControlBarProps {
  onResetAll: () => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  intersectionResult: IntersectionResult;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onResetAll,
  opacity,
  onChangeOpacity,
  isDarkMode,
  onToggleDarkMode,
  intersectionResult,
}) => {
  const pointsCount = intersectionResult.points.length;
  const linesCount = intersectionResult.lines.length;

  return (
    <div
      id="bottom-control-bar"
      className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none"
    >
      {/* Left Section: Reset Button (왼쪽 화면 아래쪽 위치) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          id="btn-reset-simulation"
          type="button"
          onClick={onResetAll}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 hover:bg-red-50/80 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 rounded-xl shadow-md font-bold text-xs transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>화면 초기화</span>
        </button>
      </div>

      {/* Center Section: Real-time Educational Intersection HUD */}
      <div className="pointer-events-auto hidden sm:flex items-center gap-2.5 px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="max-w-[280px] md:max-w-md truncate">
            {intersectionResult.relationshipText}
          </span>
        </div>

        {pointsCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs animate-pulse-glow">
            <Sparkles className="w-3 h-3" />
            <span>교점 {pointsCount}개</span>
          </div>
        )}

        {linesCount > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-xs animate-pulse-glow">
            <Sparkles className="w-3 h-3" />
            <span>교선 형성</span>
          </div>
        )}
      </div>

      {/* Right Section (우측 하단): Opacity Slider & Dark Mode Toggle */}
      <div className="pointer-events-auto flex items-center gap-2 ml-auto">
        {/* Opacity Slider (투명도 조절) */}
        <div
          id="opacity-slider-container"
          className="flex items-center gap-2.5 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-md text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-[11px] font-semibold">투명도</span>
          </div>
          <input
            id="slider-shape-opacity"
            type="range"
            min="0.15"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
            className="w-20 md:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            title="도형 투명도 조절 (내부 교점/교선 관찰용)"
          />
          <span className="font-mono text-[11px] w-8 text-right font-semibold text-slate-700 dark:text-slate-300">
            {Math.round(opacity * 100)}%
          </span>
        </div>

        {/* Dark Mode Toggle */}
        <button
          id="btn-toggle-theme"
          type="button"
          onClick={onToggleDarkMode}
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
};
