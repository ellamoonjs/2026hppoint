import React from 'react';
import { X, BookOpen, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-theory-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="modal-theory-content"
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                중1 수학: 교점과 교선 핵심 개념
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                도형의 기본 요소인 점, 선, 면이 만날 때 생기는 핵심 성질
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 dark:text-slate-300 custom-scrollbar">
          {/* Card 1: 교점 (Intersection Point) */}
          <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/50 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 text-sm mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs" />
              <span>1. 교점 (Intersection Point)</span>
            </div>
            <p className="font-medium mb-3 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
              <strong className="text-red-600 dark:text-red-400 font-semibold">선과 선</strong> 또는{' '}
              <strong className="text-red-600 dark:text-red-400 font-semibold">선과 면</strong>이 만나서 생기는 점을{' '}
              <strong className="font-semibold underline decoration-red-400 underline-offset-2">교점</strong>이라고 합니다.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>두 직선이 한 점에서 만날 때: <strong>교점 1개</strong> 생성</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>직선이 평면을 뚫고 지나갈 때: <strong>교점 1개</strong> 생성</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>직선이 입체도형(직육면체, 원기둥 등)을 관통할 때: 관통하여 표면에 들어오고 나가는 <strong>교점들</strong> 생성</span>
              </li>
            </ul>
          </div>

          {/* Card 2: 교선 (Intersection Line) */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-sm mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
              <span>2. 교선 (Intersection Line)</span>
            </div>
            <p className="font-medium mb-3 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
              <strong className="text-amber-600 dark:text-amber-400 font-semibold">면과 면</strong>이 만나서 생기는 선을{' '}
              <strong className="font-semibold underline decoration-amber-400 underline-offset-2">교선</strong>이라고 합니다. (교선은 곧은 직선일 수도 있고, 곡면과 만나 곡선일 수도 있습니다)
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>두 평면이 만날 때: <strong>직선 형태의 교선</strong> 생성</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>평면이 입체도형(사면체, 직육면체, 원기둥, 원뿔)을 자를 때: 단면의 둘레를 이루는 <strong>교선(다각형 또는 원/타원 곡선)</strong> 생성</span>
              </li>
            </ul>
          </div>

          {/* Card 3: 공간에서 두 직선의 위치 관계 */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-sm mb-2.5">
              <Sparkles className="w-4 h-4" />
              <span>공간에서 두 직선의 4가지 위치 관계</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-blue-600 dark:text-blue-400 block mb-0.5 font-semibold">1. 한 점에서 만난다</strong>
                <span className="text-slate-500 dark:text-slate-400">한 평면 위에 있으며 교점 1개 발생</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-blue-600 dark:text-blue-400 block mb-0.5 font-semibold">2. 평행하다</strong>
                <span className="text-slate-500 dark:text-slate-400">한 평면 위에 있으며 만나지 않음</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-blue-600 dark:text-blue-400 block mb-0.5 font-semibold">3. 일치한다</strong>
                <span className="text-slate-500 dark:text-slate-400">두 직선이 완전히 겹쳐 교점 무수히 많음</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <strong className="text-purple-600 dark:text-purple-400 block mb-0.5 font-semibold">4. 꼬인 위치에 있다</strong>
                <span className="text-slate-500 dark:text-slate-400">만나지도 않고 평행하지도 않은 공간 상의 위치</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex justify-end bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            이해했습니다 (시뮬레이션 시작)
          </button>
        </div>
      </div>
    </div>
  );
};
