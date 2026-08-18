import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SceneObject, ShapeType, TransformMode } from './types';
import { calculateAllIntersections, getSolidKoreanName } from './utils/geometryMath';
import { ThreeCanvas } from './components/ThreeCanvas';
import { RightMenu } from './components/RightMenu';
import { ControlBar } from './components/ControlBar';
import { TheoryModal } from './components/TheoryModal';
import { Sparkles, HelpCircle } from 'lucide-react';

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#e11d48', // Rose
  '#84cc16', // Lime
];

export default function App() {
  const [objects, setObjects] = useState<SceneObject[]>([
    {
      id: 'line-1',
      name: '직선 1',
      type: 'line',
      color: '#2563eb',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      length: 6,
    } as any,
    {
      id: 'line-2',
      name: '직선 2',
      type: 'line',
      color: '#10b981',
      position: [0, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      scale: [1, 1, 1],
      visible: true,
      length: 6,
    } as any,
  ]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>('line-1');
  const [opacity, setOpacity] = useState<number>(0.75);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);

  // Sync HTML class for Tailwind dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Calculate geometric intersections in real-time
  const intersectionResult = useMemo(() => {
    return calculateAllIntersections(objects);
  }, [objects]);

  // Add a shape to the scene
  const handleAddShape = useCallback(
    (type: ShapeType) => {
      const id = `${type}-${Date.now().toString().slice(-4)}`;
      const sameTypeCount = objects.filter((o) => o.type === type).length;
      const name = `${getSolidKoreanName(type)} ${sameTypeCount + 1}`;
      const color = COLOR_PALETTE[(objects.length + 1) % COLOR_PALETTE.length];

      let newObj: SceneObject;

      if (type === 'line') {
        const offsetAngle = (sameTypeCount * Math.PI) / 3;
        newObj = {
          id,
          name,
          type: 'line',
          color,
          position: [0, (sameTypeCount * 0.2) % 1.5, 0],
          rotation: [0, offsetAngle, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any;
      } else if (type === 'plane') {
        const rotY = sameTypeCount === 0 ? 0 : Math.PI / 3;
        newObj = {
          id,
          name,
          type: 'plane',
          color,
          position: [0, sameTypeCount * 0.3, 0],
          rotation: [0, rotY, sameTypeCount === 0 ? 0 : Math.PI / 4],
          scale: [1, 1, 1],
          visible: true,
          width: 4.8,
          height: 4.8,
        } as any;
      } else {
        // Solid figures
        newObj = {
          id,
          name,
          type,
          color,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          height: 2.6,
          width: 2.4,
          depth: 2.4,
          radius: 1.4,
        } as any;
      }

      setObjects((prev) => [...prev, newObj]);
      setSelectedObjectId(id);
    },
    [objects]
  );

  // Remove a shape
  const handleRemoveShape = useCallback((id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedObjectId((curr) => (curr === id ? null : curr));
  }, []);

  // Update position & rotation
  const handleUpdateObjectTransform = useCallback(
    (id: string, position: [number, number, number], rotation: [number, number, number]) => {
      setObjects((prev) =>
        prev.map((o) => (o.id === id ? { ...o, position, rotation } : o))
      );
    },
    []
  );

  // Screen Reset (화면 초기화)
  const handleResetAll = useCallback(() => {
    setObjects([]);
    setSelectedObjectId(null);
  }, []);

  // Quick Presets
  const handleApplyPreset = useCallback((presetKey: string) => {
    if (presetKey === 'line-line') {
      setObjects([
        {
          id: 'line-1',
          name: '직선 1',
          type: 'line',
          color: '#2563eb',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
        {
          id: 'line-2',
          name: '직선 2',
          type: 'line',
          color: '#10b981',
          position: [0, 0, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
      ]);
      setSelectedObjectId('line-1');
    } else if (presetKey === 'line-plane') {
      setObjects([
        {
          id: 'plane-1',
          name: '평면 1',
          type: 'plane',
          color: '#0d9488',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          width: 5,
          height: 5,
        } as any,
        {
          id: 'line-1',
          name: '직선 1',
          type: 'line',
          color: '#2563eb',
          position: [0, 0, 0],
          rotation: [Math.PI / 3, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
      ]);
      setSelectedObjectId('line-1');
    } else if (presetKey === 'plane-plane') {
      setObjects([
        {
          id: 'plane-1',
          name: '평면 1',
          type: 'plane',
          color: '#0d9488',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          width: 5,
          height: 5,
        } as any,
        {
          id: 'plane-2',
          name: '평면 2',
          type: 'plane',
          color: '#f59e0b',
          position: [0, 0, 0],
          rotation: [0, 0, Math.PI / 3],
          scale: [1, 1, 1],
          visible: true,
          width: 5,
          height: 5,
        } as any,
      ]);
      setSelectedObjectId('plane-2');
    } else if (presetKey === 'line-solid') {
      setObjects([
        {
          id: 'cylinder-1',
          name: '원기둥 1',
          type: 'cylinder',
          color: '#6366f1',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          height: 2.8,
          radius: 1.4,
        } as any,
        {
          id: 'line-1',
          name: '직선 1',
          type: 'line',
          color: '#ef4444',
          position: [0, 0.4, 0],
          rotation: [0, Math.PI / 4, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
      ]);
      setSelectedObjectId('line-1');
    } else if (presetKey === 'plane-solid') {
      setObjects([
        {
          id: 'cone-1',
          name: '원뿔 1',
          type: 'cone',
          color: '#8b5cf6',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          height: 3,
          radius: 1.6,
        } as any,
        {
          id: 'plane-1',
          name: '평면 1',
          type: 'plane',
          color: '#06b6d4',
          position: [0, 0.3, 0],
          rotation: [0.3, 0, 0.2],
          scale: [1, 1, 1],
          visible: true,
          width: 4.8,
          height: 4.8,
        } as any,
      ]);
      setSelectedObjectId('plane-1');
    } else if (presetKey === 'skew-lines') {
      setObjects([
        {
          id: 'line-1',
          name: '직선 1 (위쪽)',
          type: 'line',
          color: '#2563eb',
          position: [0, 1.2, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
        {
          id: 'line-2',
          name: '직선 2 (아래쪽)',
          type: 'line',
          color: '#e11d48',
          position: [0, -1.2, 0],
          rotation: [0, Math.PI / 2, 0],
          scale: [1, 1, 1],
          visible: true,
          length: 6,
        } as any,
      ]);
      setSelectedObjectId('line-2');
    }
  }, []);

  return (
    <div
      id="app-root-container"
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200"
    >
      {/* Top Application Bar */}
      <header
        id="top-navbar"
        className="h-14 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-30 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
              <span>교점과 교선 3D 탐구 시뮬레이션</span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50">
                중1 수학 도형의 기초
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-help-theory"
            type="button"
            onClick={() => setIsTheoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-lg text-xs font-semibold transition-all active:scale-98 shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span className="hidden xs:inline">학습 도움말</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area (Left 3D Canvas + Right Sidebar Menu) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* Left Interactive 3D Canvas Area */}
        <main
          id="left-canvas-main"
          className="flex-1 h-full min-w-0 relative bg-slate-50 dark:bg-slate-950 overflow-hidden"
        >
          <ThreeCanvas
            objects={objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onUpdateObjectTransform={handleUpdateObjectTransform}
            intersectionResult={intersectionResult}
            opacity={opacity}
            isDarkMode={isDarkMode}
            transformMode={transformMode}
            onSetTransformMode={setTransformMode}
          />

          {/* Bottom Floating Control Bar (Reset, HUD, Opacity Slider, Theme Toggle) */}
          <ControlBar
            onResetAll={handleResetAll}
            opacity={opacity}
            onChangeOpacity={setOpacity}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            intersectionResult={intersectionResult}
          />
        </main>

        {/* Right Menu (Buttons for Line, Plane, Solid Figures & Presets) */}
        <RightMenu
          objects={objects}
          onAddShape={handleAddShape}
          onRemoveShape={handleRemoveShape}
          selectedObjectId={selectedObjectId}
          onSelectObject={setSelectedObjectId}
          onApplyPreset={handleApplyPreset}
          onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
        />
      </div>

      {/* Theory & Concept Explanation Modal */}
      <TheoryModal isOpen={isTheoryModalOpen} onClose={() => setIsTheoryModalOpen(false)} />
    </div>
  );
}
