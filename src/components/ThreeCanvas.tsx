import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SceneObject, IntersectionResult, TransformMode } from '../types';
import { getSolidKoreanName } from '../utils/geometryMath';
import { RotateCw, Move, Check, HelpCircle, Sparkles, Navigation } from 'lucide-react';

interface ThreeCanvasProps {
  objects: SceneObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObjectTransform: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
  intersectionResult: IntersectionResult;
  opacity: number;
  isDarkMode: boolean;
  transformMode: TransformMode;
  onSetTransformMode: (mode: TransformMode) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  objects,
  selectedObjectId,
  onSelectObject,
  onUpdateObjectTransform,
  intersectionResult,
  opacity,
  isDarkMode,
  transformMode,
  onSetTransformMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Mesh map to track rendered 3D objects
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const intersectionGroupRef = useRef<THREE.Group | null>(null);

  // 2D screen positions of intersection badges for overlay
  const [badgeOverlays, setBadgeOverlays] = useState<
    Array<{
      id: string;
      type: 'point' | 'line';
      label: string;
      description?: string;
      x: number;
      y: number;
      visible: boolean;
    }>
  >([]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(isDarkMode ? 0x0f172a : 0xf8fafc);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7, 6, 8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 30;
    controls.minDistance = 2;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.7 : 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, isDarkMode ? 1.2 : 1.4);
    dirLight1.position.set(8, 12, 8);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.5);
    dirLight2.position.set(-8, -6, -8);
    scene.add(dirLight2);

    // Subtle floor circular grid for perspective (NO coordinate axes, clean educational look)
    const floorGeo = new THREE.CircleGeometry(7, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isDarkMode ? 0x1e293b : 0xe2e8f0,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: isDarkMode ? 0.4 : 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -2.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle concentric grid rings on floor
    const ringGroup = new THREE.Group();
    for (let r = 1; r <= 6; r += 1.5) {
      const ringGeo = new THREE.RingGeometry(r - 0.01, r + 0.01, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isDarkMode ? 0x334155 : 0xcfd8dc,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -2.49;
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    // Group for dynamic intersection highlights
    const intersectionGroup = new THREE.Group();
    scene.add(intersectionGroup);
    intersectionGroupRef.current = intersectionGroup;

    // TransformControls for direct 3D dragging
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.75;
    transformControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
    });
    transformControls.addEventListener('objectChange', () => {
      if (transformControls.object) {
        const obj = transformControls.object;
        const objId = obj.name;
        if (objId) {
          onUpdateObjectTransform(
            objId,
            [obj.position.x, obj.position.y, obj.position.z],
            [obj.rotation.x, obj.rotation.y, obj.rotation.z]
          );
        }
      }
    });
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    // Click to select raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      // Ignore if clicking on transform gizmo
      if (transformControls.dragging) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const interactables: THREE.Object3D[] = [];
      meshMapRef.current.forEach((obj3D) => {
        interactables.push(obj3D);
      });

      const intersects = raycaster.intersectObjects(interactables, true);
      if (intersects.length > 0) {
        // Find top parent that has a recorded ID
        let target = intersects[0].object;
        while (target && !meshMapRef.current.has(target.name) && target.parent) {
          target = target.parent;
        }
        if (target && meshMapRef.current.has(target.name)) {
          onSelectObject(target.name);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      controls.update();

      // Animate pulsing intersection points
      if (intersectionGroupRef.current) {
        intersectionGroupRef.current.children.forEach((child) => {
          if (child.userData.isPulsing) {
            const scale = 1 + Math.sin(elapsedTime * 4) * 0.15;
            child.scale.set(scale, scale, scale);
          }
        });
      }

      renderer.render(scene, camera);

      // Project 3D intersection points/lines to 2D screen coordinates
      if (cameraRef.current && containerRef.current) {
        const widthHalf = width / 2;
        const heightHalf = height / 2;
        const newBadges: typeof badgeOverlays = [];

        // Project intersection points
        intersectionResult.points.forEach((pt) => {
          const v = pt.position.clone();
          v.project(cameraRef.current!);
          // Check if in front of camera
          const isVisible = v.z < 1;
          const x = v.x * widthHalf + widthHalf;
          const y = -(v.y * heightHalf) + heightHalf;
          newBadges.push({
            id: pt.id,
            type: 'point',
            label: '교점',
            description: pt.description,
            x,
            y,
            visible: isVisible,
          });
        });

        // Project intersection lines midpoint
        intersectionResult.lines.forEach((line) => {
          if (line.points.length >= 2) {
            const mid = new THREE.Vector3();
            line.points.forEach((p) => mid.add(p));
            mid.divideScalar(line.points.length);
            mid.project(cameraRef.current!);
            const isVisible = mid.z < 1;
            const x = mid.x * widthHalf + widthHalf;
            const y = -(mid.y * heightHalf) + heightHalf;
            newBadges.push({
              id: line.id,
              type: 'line',
              label: '교선',
              description: line.description,
              x,
              y,
              visible: isVisible,
            });
          }
        });

        setBadgeOverlays(newBadges);
      }
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.domElement.removeEventListener('click', handleClick);
      transformControls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDarkMode]);

  // Update Scene Theme (Background, ambient, floor)
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(isDarkMode ? 0x0f172a : 0xf8fafc);
  }, [isDarkMode]);

  // Update Transform Mode (Translate / Rotate)
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  // Re-build 3D objects when `objects` list or opacity changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const meshMap = meshMapRef.current;

    // Remove obsolete meshes
    const currentIds = new Set(objects.map((o) => o.id));
    meshMap.forEach((mesh, id) => {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        meshMap.delete(id);
      }
    });

    // Create or update meshes
    objects.forEach((obj) => {
      let group = meshMap.get(obj.id);
      const isSelected = selectedObjectId === obj.id;

      if (!group) {
        group = create3DObject(obj, opacity, isSelected);
        group.name = obj.id;
        scene.add(group);
        meshMap.set(obj.id, group);
      } else {
        // Update transform
        group.position.set(...obj.position);
        group.rotation.set(...obj.rotation);
        group.scale.set(...obj.scale);

        // Update materials opacity & selection highlight
        updateObjectMaterials(group, obj, opacity, isSelected);
      }
    });

    // Attach/detach transform controls
    if (transformControlsRef.current) {
      if (selectedObjectId && meshMap.has(selectedObjectId)) {
        const targetMesh = meshMap.get(selectedObjectId)!;
        transformControlsRef.current.attach(targetMesh);
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [objects, opacity, selectedObjectId]);

  // Render Intersections (Points and Lines) in 3D
  useEffect(() => {
    if (!intersectionGroupRef.current) return;
    const group = intersectionGroupRef.current;

    // Clear old intersection visuals
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    // 1. Draw Intersection Points (교점)
    intersectionResult.points.forEach((pt) => {
      const ptGroup = new THREE.Group();
      ptGroup.position.copy(pt.position);
      ptGroup.userData = { isPulsing: true };

      // Vibrant core sphere (Neon Red / Magenta / Orange)
      const coreGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xef4444, // Tailwind Red 500
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      ptGroup.add(coreMesh);

      // Glowing outer ring/halo
      const haloGeo = new THREE.RingGeometry(0.24, 0.38, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfca5a5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.lookAt(new THREE.Vector3(7, 6, 8)); // Orient towards initial camera
      ptGroup.add(haloMesh);

      // 3D Pointing Arrow down to the point
      const arrowDir = new THREE.Vector3(0, -1, 0);
      const arrowOrigin = new THREE.Vector3(0, 0.9, 0);
      const arrowLength = 0.65;
      const arrowColor = 0xdc2626;
      const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.25, 0.16);
      ptGroup.add(arrowHelper);

      group.add(ptGroup);
    });

    // 2. Draw Intersection Lines (교선)
    intersectionResult.lines.forEach((line) => {
      const lineGroup = new THREE.Group();

      if (line.points.length >= 2) {
        // High visibility tube or bold line
        const curve = new THREE.CatmullRomCurve3(
          line.isClosed && line.points.length > 2 ? [...line.points, line.points[0]] : line.points,
          false,
          'catmullrom',
          0.1
        );

        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.07, 12, !!line.isClosed);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b, // Amber 500
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        lineGroup.add(tubeMesh);

        // Glowing outer casing for 교선
        const outerTubeGeo = new THREE.TubeGeometry(curve, 64, 0.12, 12, !!line.isClosed);
        const outerTubeMat = new THREE.MeshBasicMaterial({
          color: 0xfde68a,
          transparent: true,
          opacity: 0.45,
        });
        const outerTubeMesh = new THREE.Mesh(outerTubeGeo, outerTubeMat);
        lineGroup.add(outerTubeMesh);

        // 3D Arrow pointing towards middle of intersection line
        const midPoint = new THREE.Vector3();
        line.points.forEach((p) => midPoint.add(p));
        midPoint.divideScalar(line.points.length);

        const arrowDir = new THREE.Vector3(0, -1, 0);
        const arrowOrigin = midPoint.clone().add(new THREE.Vector3(0, 0.95, 0));
        const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.7, 0xd97706, 0.28, 0.18);
        lineGroup.add(arrowHelper);
      }

      group.add(lineGroup);
    });
  }, [intersectionResult]);

  // Camera Reset Helper
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(7, 6, 8);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  const selectedObj = objects.find((o) => o.id === selectedObjectId);

  return (
    <div className="relative w-full h-full select-none overflow-hidden" id="simulation-canvas-container">
      {/* 3D Canvas WebGL DOM mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 2D Intersection Badges with Callout Arrows */}
      {badgeOverlays.map(
        (badge) =>
          badge.visible && (
            <div
              key={badge.id}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-10 transition-all duration-75"
              style={{
                left: `${badge.x}px`,
                top: `${badge.y - 32}px`,
              }}
            >
              <div
                className={`flex flex-col items-center shadow-lg rounded-xl px-3 py-1.5 border backdrop-blur-md animate-bounce-subtle ${
                  badge.type === 'point'
                    ? 'bg-red-500/95 text-white border-red-300 shadow-red-500/30'
                    : 'bg-amber-500/95 text-white border-amber-300 shadow-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{badge.label}</span>
                </div>
                {badge.description && (
                  <div className="text-[10px] font-medium opacity-90 tracking-tight text-center max-w-[160px] line-clamp-1">
                    {badge.description}
                  </div>
                )}
                {/* Arrow indicator tip */}
                <div
                  className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mt-0.5 ${
                    badge.type === 'point' ? 'border-t-red-500/95' : 'border-t-amber-500/95'
                  }`}
                />
              </div>
            </div>
          )
      )}

      {/* Top Left Canvas HUD - Active Object Info & Quick Interaction Helpers */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        {selectedObj ? (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-lg min-w-[250px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: selectedObj.color }}
                />
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  {selectedObj.name} ({getSolidKoreanName(selectedObj.type)})
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-800/50">
                선택됨
              </span>
            </div>

            {/* Transform Mode Switcher */}
            <div className="mt-2.5 flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                id="btn-transform-translate"
                type="button"
                onClick={() => onSetTransformMode('translate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  transformMode === 'translate'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>위치 이동</span>
              </button>
              <button
                id="btn-transform-rotate"
                type="button"
                onClick={() => onSetTransformMode('rotate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  transformMode === 'rotate'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>각도 회전</span>
              </button>
            </div>

            {/* Fine-tuning Position/Rotation Sliders for precision manipulation */}
            <div className="mt-3 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="font-medium">X 축 위치:</span>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="0.1"
                  value={selectedObj.position[0]}
                  onChange={(e) =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      [parseFloat(e.target.value), selectedObj.position[1], selectedObj.position[2]],
                      selectedObj.rotation
                    )
                  }
                  className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-7 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedObj.position[0].toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Y 축 높이:</span>
                <input
                  type="range"
                  min="-3"
                  max="4"
                  step="0.1"
                  value={selectedObj.position[1]}
                  onChange={(e) =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      [selectedObj.position[0], parseFloat(e.target.value), selectedObj.position[2]],
                      selectedObj.rotation
                    )
                  }
                  className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-7 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedObj.position[1].toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Z 축 깊이:</span>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="0.1"
                  value={selectedObj.position[2]}
                  onChange={(e) =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      [selectedObj.position[0], selectedObj.position[1], parseFloat(e.target.value)],
                      selectedObj.rotation
                    )
                  }
                  className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-7 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedObj.position[2].toFixed(1)}</span>
              </div>

              {/* Quick Rotation Angle Buttons */}
              <div className="pt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      selectedObj.position,
                      [selectedObj.rotation[0], selectedObj.rotation[1] + Math.PI / 4, selectedObj.rotation[2]]
                    )
                  }
                  className="flex-1 py-1.5 px-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                >
                  +45° 회전
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      selectedObj.position,
                      [selectedObj.rotation[0] + Math.PI / 2, selectedObj.rotation[1], selectedObj.rotation[2]]
                    )
                  }
                  className="flex-1 py-1.5 px-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                >
                  직각 회전
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateObjectTransform(selectedObj.id, [0, 0, 0], [0, 0, 0])
                  }
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                  title="원점 정렬"
                >
                  중앙
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
            <span className="font-bold text-slate-800 dark:text-slate-200">Tip:</span> 화면의 도형을 직접 클릭하여 이동/회전 핸들을 사용할 수 있습니다.
          </div>
        )}
      </div>

      {/* Camera View Guide / Reset Button on Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          id="btn-reset-camera-view"
          type="button"
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-md text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer"
          title="3D 카메라 시점 원래대로"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-500" />
          <span>시점 초기화</span>
        </button>
      </div>
    </div>
  );
};

/**
 * 3D Geometry Builder helper for Line, Plane, and 3D Solids
 */
function create3DObject(obj: SceneObject, opacity: number, isSelected: boolean): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...obj.position);
  group.rotation.set(...obj.rotation);
  group.scale.set(...obj.scale);

  const parsedColor = new THREE.Color(obj.color);

  if (obj.type === 'line') {
    const len = (obj as any).length || 6;
    // Main cylinder line
    const cylGeo = new THREE.CylinderGeometry(0.06, 0.06, len, 16);
    cylGeo.rotateX(Math.PI / 2);
    const cylMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      roughness: 0.3,
      metalness: 0.2,
      transparent: opacity < 0.99,
      opacity: Math.max(opacity, 0.4),
    });
    const cylMesh = new THREE.Mesh(cylGeo, cylMat);
    cylMesh.castShadow = true;
    group.add(cylMesh);

    // End arrow caps indicating infinite line concept in middle school math
    const arrowGeo1 = new THREE.ConeGeometry(0.14, 0.4, 16);
    arrowGeo1.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshStandardMaterial({ color: parsedColor });
    const arrow1 = new THREE.Mesh(arrowGeo1, arrowMat);
    arrow1.position.z = len / 2 + 0.2;
    group.add(arrow1);

    const arrowGeo2 = new THREE.ConeGeometry(0.14, 0.4, 16);
    arrowGeo2.rotateX(-Math.PI / 2);
    const arrow2 = new THREE.Mesh(arrowGeo2, arrowMat);
    arrow2.position.z = -len / 2 - 0.2;
    group.add(arrow2);
  } else if (obj.type === 'plane') {
    const w = (obj as any).width || 4;
    const h = (obj as any).height || 4;

    // Plane mesh (double sided)
    const planeGeo = new THREE.PlaneGeometry(w, h);
    planeGeo.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: Math.min(opacity, 0.85),
      roughness: 0.4,
      metalness: 0.1,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.receiveShadow = true;
    group.add(planeMesh);

    // Outline edge wireframe
    const edgesGeo = new THREE.EdgesGeometry(planeGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: parsedColor.clone().offsetHSL(0, 0, -0.2),
      linewidth: 2,
    });
    const edgesMesh = new THREE.LineSegments(edgesGeo, edgesMat);
    group.add(edgesMesh);
  } else if (obj.type === 'tetrahedron') {
    const radius = 1.6;
    const tetraGeo = new THREE.TetrahedronGeometry(radius);
    const tetraMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(tetraGeo, tetraMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Edge wireframe for high clarity
    const edgesGeo = new THREE.EdgesGeometry(tetraGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat));
  } else if (obj.type === 'cuboid') {
    const w = (obj as any).width || 2.4;
    const h = obj.height || 2.4;
    const d = (obj as any).depth || 2.4;
    const boxGeo = new THREE.BoxGeometry(w, h, d);
    const boxMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat));
  } else if (obj.type === 'cylinder') {
    const r = (obj as any).radius || 1.4;
    const h = obj.height || 2.8;
    const cylGeo = new THREE.CylinderGeometry(r, r, h, 32);
    const cylMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(cylGeo, cylMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgesGeo = new THREE.EdgesGeometry(cylGeo, 30);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat));
  } else if (obj.type === 'cone') {
    const r = (obj as any).radius || 1.5;
    const h = obj.height || 2.8;
    const coneGeo = new THREE.ConeGeometry(r, h, 32);
    const coneMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: opacity,
      roughness: 0.3,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(coneGeo, coneMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgesGeo = new THREE.EdgesGeometry(coneGeo, 30);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
    group.add(new THREE.LineSegments(edgesGeo, edgesMat));
  }

  return group;
}

function updateObjectMaterials(group: THREE.Group, obj: SceneObject, opacity: number, isSelected: boolean) {
  const parsedColor = new THREE.Color(obj.color);
  group.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat.transparent !== undefined) {
        if (obj.type === 'line') {
          mat.opacity = Math.max(opacity, 0.4);
        } else if (obj.type === 'plane') {
          mat.opacity = Math.min(opacity, 0.85);
        } else {
          mat.opacity = opacity;
        }
      }
      if (isSelected) {
        mat.emissive = new THREE.Color(0x3b82f6);
        mat.emissiveIntensity = 0.25;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  });
}
