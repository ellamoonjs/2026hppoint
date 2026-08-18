import React from 'react';
import { SceneObject, ShapeType, TransformMode } from '../types';
import { getSolidKoreanName } from '../utils/geometryMath';
import {
  Minus,
  Layers,
  Box,
  Pyramid,
  Cylinder as CylinderIcon,
  Cone as ConeIcon,
  Trash2,
  RotateCw,
  Sparkles,
  BookOpen,
  Play,
  Move,
  Compass,
  Sliders,
  RefreshCw,
} from 'lucide-react';

interface RightMenuProps {
  objects: SceneObject[];
  onAddShape: (type: ShapeType) => void;
  onRemoveShape: (id: string) => void;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onApplyPreset: (presetKey: string) => void;
  onOpenTheoryModal: () => void;
  onUpdateObjectTransform?: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
  transformMode?: TransformMode;
  onSetTransformMode?: (mode: TransformMode) => void;
}

export const RightMenu: React.FC<RightMenuProps> = ({
  objects,
  onAddShape,
  onRemoveShape,
  selectedObjectId,
  onSelectObject,
  onApplyPreset,
  onOpenTheoryModal,
  onUpdateObjectTransform,
  transformMode,
  onSetTransformMode,
}) => {
  const selectedObj = objects.find((o) => o.id === selectedObjectId);

  const rotDegX = selectedObj ? Math.round(((selectedObj.rotation[0] * 180) / Math.PI) % 360) : 0;
  const rotDegY = selectedObj ? Math.round(((selectedObj.rotation[1] * 180) / Math.PI) % 360) : 0;
  const rotDegZ = selectedObj ? Math.round(((selectedObj.rotation[2] * 180) / Math.PI) % 360) : 0;

  const handleRotateAngle = (axisIndex: 0 | 1 | 2, deltaDegrees: number) => {
    if (!selectedObj || !onUpdateObjectTransform) return;
    const deltaRad = (deltaDegrees * Math.PI) / 180;
    const newRot: [number, number, number] = [
      selectedObj.rotation[0],
      selectedObj.rotation[1],
      selectedObj.rotation[2],
    ];
    newRot[axisIndex] = (newRot[axisIndex] + deltaRad) % (Math.PI * 2);
    onUpdateObjectTransform(selectedObj.id, selectedObj.position, newRot);
  };

  const handleSetAnglePreset = (preset: 'horizontal' | 'vertical' | 'tilt45') => {
    if (!selectedObj || !onUpdateObjectTransform) return;
    let newRot: [number, number, number] = [0, 0, 0];
    if (preset === 'horizontal') {
      newRot = [0, selectedObj.rotation[1], 0];
    } else if (preset === 'vertical') {
      newRot = [Math.PI / 2, selectedObj.rotation[1], 0];
    } else if (preset === 'tilt45') {
      newRot = [Math.PI / 4, selectedObj.rotation[1], 0];
    }
    onUpdateObjectTransform(selectedObj.id, selectedObj.position, newRot);
  };

  return (
    <aside
      id="right-sidebar-menu"
      className="w-80 md:w-96 flex flex-col h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200/80 dark:border-slate-800/80 shadow-sm select-none z-20"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 tracking-tight">
            <span>도형 선택 & 탐구</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            도형을 추가하고 드래그하여 각도를 조작해보세요
          </p>
        </div>
        <button
          id="btn-open-theory-modal"
          type="button"
          onClick={onOpenTheoryModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/90 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200/70 dark:border-blue-800/60 transition-all active:scale-95 shadow-xs cursor-pointer"
          title="중1 수학 교점/교선 핵심 개념 보기"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>개념 보기</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Section 1: Shape Addition Buttons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              1. 기본 도형 생성
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Add Line */}
            <button
              id="btn-add-line"
              type="button"
              onClick={() => onAddShape('line')}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-all text-slate-800 dark:text-slate-200 group shadow-xs active:scale-98 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">직선 (Line)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                클릭하여 생성
              </span>
            </button>

            {/* Add Plane */}
            <button
              id="btn-add-plane"
              type="button"
              onClick={() => onAddShape('plane')}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-all text-slate-800 dark:text-slate-200 group shadow-xs active:scale-98 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">평면 (Plane)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                클릭하여 생성
              </span>
            </button>
          </div>

          {/* Solid Figures (4 Types) */}
          <div className="mt-3.5">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-indigo-500" />
              <span>공간 도형 (입체도형 4종)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Tetrahedron */}
              <button
                id="btn-add-tetrahedron"
                type="button"
                onClick={() => onAddShape('tetrahedron')}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-98 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Pyramid className="w-3.5 h-3.5" />
                </div>
                <span>사면체</span>
              </button>

              {/* Cuboid */}
              <button
                id="btn-add-cuboid"
                type="button"
                onClick={() => onAddShape('cuboid')}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-98 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Box className="w-3.5 h-3.5" />
                </div>
                <span>직육면체</span>
              </button>

              {/* Cylinder */}
              <button
                id="btn-add-cylinder"
                type="button"
                onClick={() => onAddShape('cylinder')}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-98 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CylinderIcon className="w-3.5 h-3.5" />
                </div>
                <span>원기둥</span>
              </button>

              {/* Cone */}
              <button
                id="btn-add-cone"
                type="button"
                onClick={() => onAddShape('cone')}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-98 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ConeIcon className="w-3.5 h-3.5" />
                </div>
                <span>원뿔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Quick Learning Presets for Students */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              2. 주요 학습 프리셋 (원클릭 배치)
            </span>
          </div>
          <div className="space-y-2">
            <button
              id="preset-line-line"
              type="button"
              onClick={() => onApplyPreset('line-line')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>두 직선의 교점</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  직선 2개가 한 점에서 만나는 상황
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </button>

            <button
              id="preset-line-plane"
              type="button"
              onClick={() => onApplyPreset('line-plane')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white/90 dark:bg-slate-800/90 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>직선과 평면의 교점</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  직선이 평면을 관통하는 상황
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </button>

            <button
              id="preset-plane-plane"
              type="button"
              onClick={() => onApplyPreset('plane-plane')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 bg-white/90 dark:bg-slate-800/90 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>두 평면의 교선</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  두 평면이 만나 직선이 생기는 상황
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
            </button>

            <button
              id="preset-line-solid"
              type="button"
              onClick={() => onApplyPreset('line-solid')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white/90 dark:bg-slate-800/90 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>직선과 입체도형의 교점</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  직선이 원기둥/직육면체를 뚫고 지나가는 점
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </button>

            <button
              id="preset-plane-solid"
              type="button"
              onClick={() => onApplyPreset('plane-solid')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-white/90 dark:bg-slate-800/90 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>평면과 입체도형의 교선</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  평면이 입체도형을 자르는 단면 윤곽선
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
            </button>

            <button
              id="preset-skew-lines"
              type="button"
              onClick={() => onApplyPreset('skew-lines')}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between group cursor-pointer shadow-xs active:scale-99"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>꼬인 위치 탐구</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  공간에서 만나지도 평행하지도 않은 두 직선
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Section 3: Active Scene Objects List & Selected Object Controls */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              3. 생성된 도형 목록 ({objects.length}개)
            </span>
          </div>

          {objects.length === 0 ? (
            <div className="text-center py-6 px-3 bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
              생성된 도형이 없습니다.
              <br />
              위의 버튼을 눌러 도형을 추가하세요.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5 custom-scrollbar">
              {objects.map((obj) => {
                const isSelected = selectedObjectId === obj.id;
                return (
                  <div
                    key={obj.id}
                    onClick={() => onSelectObject(obj.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10 shadow-xs"
                        style={{ backgroundColor: obj.color }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {obj.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({getSolidKoreanName(obj.type)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveShape(obj.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="도형 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
