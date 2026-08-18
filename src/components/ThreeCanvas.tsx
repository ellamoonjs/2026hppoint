import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { SceneObject, IntersectionResult, TransformMode } from '../types';
import { getSolidKoreanName } from '../utils/geometryMath';
import {
  RotateCw,
  Move,
  Check,
  HelpCircle,
  Sparkles,
  Navigation,
  Compass,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Sliders,
  Hand,
} from 'lucide-react';

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
  const helperGroupRef = useRef<THREE.Group | null>(null);

  // Direct dragging state refs
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const isDirectDraggingRef = useRef<boolean>(false);
  const directDragTargetIdRef = useRef<string | null>(null);
  const directDragModeRef = useRef<'translate' | 'rotate' | 'endpoint-start' | 'endpoint-end'>('translate');
  const dragStartPointRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragObjStartPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragObjStartRotRef = useRef<THREE.Euler>(new THREE.Euler());
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Selected object state helper
  const selectedObj = objects.find((o) => o.id === selectedObjectId);

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

    // Subtle floor circular grid for perspective (clean educational look)
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

    // Group for angle handles & line endpoints
    const helperGroup = new THREE.Group();
    scene.add(helperGroup);
    helperGroupRef.current = helperGroup;

    // TransformControls for 3D gizmo manipulation
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.size = 0.85;
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

    // Direct Mouse / Touch Dragging & Raycaster Ray setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastHits = (e: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Check helper group handles first (endpoint angle handles)
      const handleHits = raycaster.intersectObjects(helperGroup.children, true);
      if (handleHits.length > 0) {
        return { type: 'handle', hit: handleHits[0] };
      }

      // Check scene objects
      const interactables: THREE.Object3D[] = [];
      meshMapRef.current.forEach((obj3D) => {
        interactables.push(obj3D);
      });
      const objectHits = raycaster.intersectObjects(interactables, true);
      if (objectHits.length > 0) {
        let target = objectHits[0].object;
        while (target && !meshMapRef.current.has(target.name) && target.parent) {
          target = target.parent;
        }
        if (target && meshMapRef.current.has(target.name)) {
          return { type: 'object', hit: objectHits[0], objectId: target.name };
        }
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only primary mouse button
      if (transformControls.dragging) return;

      const result = getRaycastHits(e);
      if (result) {
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

        if (result.type === 'handle') {
          // Clicked an endpoint angle handle
          const handleName = result.hit.object.name || (result.hit.object.parent && result.hit.object.parent.name);
          const parentId = result.hit.object.userData.targetId || (result.hit.object.parent && result.hit.object.parent.userData.targetId);

          if (parentId) {
            onSelectObject(parentId);
            directDragTargetIdRef.current = parentId;
            isDirectDraggingRef.current = true;
            controls.enabled = false;

            if (handleName && handleName.includes('endpoint-start')) {
              directDragModeRef.current = 'endpoint-start';
            } else if (handleName && handleName.includes('endpoint-end')) {
              directDragModeRef.current = 'endpoint-end';
            } else {
              directDragModeRef.current = 'rotate';
            }

            const targetMesh = meshMapRef.current.get(parentId);
            if (targetMesh) {
              dragObjStartPosRef.current.copy(targetMesh.position);
              dragObjStartRotRef.current.copy(targetMesh.rotation);

              // Set drag plane facing camera at object position
              const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
              dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, targetMesh.position);
              raycaster.ray.intersectPlane(dragPlaneRef.current, dragStartPointRef.current);
            }
          }
        } else if (result.type === 'object' && result.objectId) {
          onSelectObject(result.objectId);
          directDragTargetIdRef.current = result.objectId;
          isDirectDraggingRef.current = true;
          controls.enabled = false;

          // Determine mode: if Shift is pressed or transformMode is 'rotate', rotate; else translate
          if (e.shiftKey || transformMode === 'rotate') {
            directDragModeRef.current = 'rotate';
          } else {
            directDragModeRef.current = 'translate';
          }

          const targetMesh = meshMapRef.current.get(result.objectId);
          if (targetMesh) {
            dragObjStartPosRef.current.copy(targetMesh.position);
            dragObjStartRotRef.current.copy(targetMesh.rotation);

            // Drag plane parallel to camera viewport passing through object position
            const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
            dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, targetMesh.position);
            raycaster.ray.intersectPlane(dragPlaneRef.current, dragStartPointRef.current);
          }
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // If direct dragging an object or endpoint
      if (isDirectDraggingRef.current && directDragTargetIdRef.current) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const targetMesh = meshMapRef.current.get(directDragTargetIdRef.current);
        if (!targetMesh) return;

        const currentIntersect = new THREE.Vector3();
        const hitPlane = raycaster.ray.intersectPlane(dragPlaneRef.current, currentIntersect);

        if (directDragModeRef.current === 'translate' && hitPlane) {
          const delta = currentIntersect.clone().sub(dragStartPointRef.current);
          const newPos = dragObjStartPosRef.current.clone().add(delta);

          // Constrain coordinates within pedagogical workspace
          newPos.x = Math.max(-5, Math.min(5, newPos.x));
          newPos.y = Math.max(-2, Math.min(4, newPos.y));
          newPos.z = Math.max(-5, Math.min(5, newPos.z));

          targetMesh.position.copy(newPos);
          onUpdateObjectTransform(
            directDragTargetIdRef.current,
            [newPos.x, newPos.y, newPos.z],
            [targetMesh.rotation.x, targetMesh.rotation.y, targetMesh.rotation.z]
          );
        } else if (
          (directDragModeRef.current === 'endpoint-start' || directDragModeRef.current === 'endpoint-end') &&
          hitPlane
        ) {
          // Direct Line Angle Manipulation by Dragging Endpoints!
          const center = targetMesh.position;
          let dir = currentIntersect.clone().sub(center);

          if (directDragModeRef.current === 'endpoint-end') {
            dir.negate();
          }

          if (dir.lengthSq() > 0.001) {
            dir.normalize();

            // Cylinder base in create3DObject is along local Z axis
            const baseDir = new THREE.Vector3(0, 0, 1);
            const quat = new THREE.Quaternion().setFromUnitVectors(baseDir, dir);
            const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

            targetMesh.rotation.copy(euler);
            onUpdateObjectTransform(
              directDragTargetIdRef.current,
              [targetMesh.position.x, targetMesh.position.y, targetMesh.position.z],
              [euler.x, euler.y, euler.z]
            );
          }
        } else if (directDragModeRef.current === 'rotate') {
          // Direct rotation by dragging
          const dx = e.clientX - lastPointerPosRef.current.x;
          const dy = e.clientY - lastPointerPosRef.current.y;

          const rotSpeed = 0.012;
          const newRot = new THREE.Euler(
            targetMesh.rotation.x + dy * rotSpeed,
            targetMesh.rotation.y + dx * rotSpeed,
            targetMesh.rotation.z,
            'XYZ'
          );

          targetMesh.rotation.copy(newRot);
          onUpdateObjectTransform(
            directDragTargetIdRef.current,
            [targetMesh.position.x, targetMesh.position.y, targetMesh.position.z],
            [newRot.x, newRot.y, newRot.z]
          );
          lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
        }
      } else {
        // Hover pointer cursor detection
        const result = getRaycastHits(e);
        if (result) {
          renderer.domElement.style.cursor = 'grab';
        } else {
          renderer.domElement.style.cursor = 'default';
        }
      }
    };

    const handlePointerUp = () => {
      if (isDirectDraggingRef.current) {
        isDirectDraggingRef.current = false;
        directDragTargetIdRef.current = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

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

      // Animate pulsing handles for line endpoints
      if (helperGroupRef.current) {
        helperGroupRef.current.children.forEach((groupChild) => {
          groupChild.children.forEach((child) => {
            if (child.userData && child.userData.isPulsingHandle) {
              const s = 1 + Math.sin(elapsedTime * 5) * 0.1;
              child.scale.set(s, s, s);
            }
          });
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
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
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

  // Render Interactive Endpoint Angle Handles for Selected Line / Plane
  useEffect(() => {
    if (!helperGroupRef.current) return;
    const helperGroup = helperGroupRef.current;

    // Clear old helpers
    while (helperGroup.children.length > 0) {
      const child = helperGroup.children[0];
      helperGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    if (!selectedObj) return;

    if (selectedObj.type === 'line') {
      const len = (selectedObj as any).length || 6;
      const halfLen = len / 2;

      // Transform group for handles matching line position and rotation
      const lineHandleGroup = new THREE.Group();
      lineHandleGroup.position.set(selectedObj.position[0], selectedObj.position[1], selectedObj.position[2]);
      lineHandleGroup.rotation.set(selectedObj.rotation[0], selectedObj.rotation[1], selectedObj.rotation[2]);

      // Start Handle (Endpoint +Z)
      const startHandleGeo = new THREE.SphereGeometry(0.22, 20, 20);
      const startHandleMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6, // Blue
        emissive: 0x2563eb,
        emissiveIntensity: 0.5,
        roughness: 0.2,
      });
      const startHandleMesh = new THREE.Mesh(startHandleGeo, startHandleMat);
      startHandleMesh.position.set(0, 0, halfLen + 0.35);
      startHandleMesh.name = 'endpoint-start';
      startHandleMesh.userData = { isPulsingHandle: true, targetId: selectedObj.id };

      // Glowing outer ring for start handle
      const ringGeo = new THREE.RingGeometry(0.28, 0.42, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const startRing = new THREE.Mesh(ringGeo, ringMat);
      startRing.position.copy(startHandleMesh.position);
      startRing.rotateY(Math.PI / 2);

      // End Handle (Endpoint -Z)
      const endHandleGeo = new THREE.SphereGeometry(0.22, 20, 20);
      const endHandleMat = new THREE.MeshStandardMaterial({
        color: 0x10b981, // Emerald
        emissive: 0x059669,
        emissiveIntensity: 0.5,
        roughness: 0.2,
      });
      const endHandleMesh = new THREE.Mesh(endHandleGeo, endHandleMat);
      endHandleMesh.position.set(0, 0, -halfLen - 0.35);
      endHandleMesh.name = 'endpoint-end';
      endHandleMesh.userData = { isPulsingHandle: true, targetId: selectedObj.id };

      const endRing = new THREE.Mesh(ringGeo, ringMat);
      endRing.position.copy(endHandleMesh.position);
      endRing.rotateY(Math.PI / 2);

      lineHandleGroup.add(startHandleMesh);
      lineHandleGroup.add(startRing);
      lineHandleGroup.add(endHandleMesh);
      lineHandleGroup.add(endRing);

      helperGroup.add(lineHandleGroup);
    }
  }, [selectedObj]);

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

      // Vibrant core sphere (Neon Red)
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
      haloMesh.lookAt(new THREE.Vector3(7, 6, 8));
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
        // High visibility tube for intersection line
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

  // Quick Angle Adjustment Handlers
  const handleRotateAngle = (axisIndex: 0 | 1 | 2, deltaDegrees: number) => {
    if (!selectedObj) return;
    const deltaRad = (deltaDegrees * Math.PI) / 180;
    const newRot: [number, number, number] = [
      selectedObj.rotation[0],
      selectedObj.rotation[1],
      selectedObj.rotation[2],
    ];
    newRot[axisIndex] = (newRot[axisIndex] + deltaRad) % (Math.PI * 2);
    onUpdateObjectTransform(selectedObj.id, selectedObj.position, newRot);
  };

  const handleSetAnglePreset = (preset: 'horizontal' | 'vertical' | 'tilt45' | 'tiltNeg45') => {
    if (!selectedObj) return;
    let newRot: [number, number, number] = [0, 0, 0];
    if (preset === 'horizontal') {
      newRot = [0, selectedObj.rotation[1], 0];
    } else if (preset === 'vertical') {
      newRot = [Math.PI / 2, selectedObj.rotation[1], 0];
    } else if (preset === 'tilt45') {
      newRot = [Math.PI / 4, selectedObj.rotation[1], 0];
    } else if (preset === 'tiltNeg45') {
      newRot = [-Math.PI / 4, selectedObj.rotation[1], 0];
    }
    onUpdateObjectTransform(selectedObj.id, selectedObj.position, newRot);
  };

  // Degrees for display
  const rotDegX = selectedObj ? Math.round(((selectedObj.rotation[0] * 180) / Math.PI) % 360) : 0;
  const rotDegY = selectedObj ? Math.round(((selectedObj.rotation[1] * 180) / Math.PI) % 360) : 0;
  const rotDegZ = selectedObj ? Math.round(((selectedObj.rotation[2] * 180) / Math.PI) % 360) : 0;

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
                top: `${badge.y - 12}px`,
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
                <div
                  className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mt-0.5 ${
                    badge.type === 'point' ? 'border-t-red-500/95' : 'border-t-amber-500/95'
                  }`}
                />
              </div>
            </div>
          )
      )}

      {/* Top Left Canvas HUD - Active Object Info & Direct Manipulation Panel */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        {selectedObj ? (
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-lg min-w-[270px] max-w-[320px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: selectedObj.color }}
                />
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                  {selectedObj.name} ({getSolidKoreanName(selectedObj.type)})
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-800/50">
                선택됨
              </span>
            </div>

            {/* Transform Mode Switcher (Drag Move vs Drag Rotate) */}
            <div className="mt-2.5 flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                id="btn-transform-translate"
                type="button"
                onClick={() => onSetTransformMode('translate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  transformMode === 'translate'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="도형을 잡고 위치를 드래그 이동합니다"
              >
                <Move className="w-3.5 h-3.5" />
                <span>위치 이동</span>
              </button>
              <button
                id="btn-transform-rotate"
                type="button"
                onClick={() => onSetTransformMode('rotate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  transformMode === 'rotate'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="도형을 잡고 각도를 회전합니다"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>각도 조절</span>
              </button>
            </div>

            {/* Direct Line Endpoint Rotation Guide for Students */}
            {selectedObj.type === 'line' && (
              <div className="mt-2.5 p-2 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                <Compass className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
                <span>
                  <strong>직선 끝점 핸들:</strong> 직선의 파란색/초록색 끝점을 마우스로 드래그하면 원하는 방향으로 각도가 회전합니다.
                </span>
              </div>
            )}

            {/* Angle Manipulation Controls (각도 조작) */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <div className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-blue-500" />
                  <span>실시간 각도 조절 ({rotDegY}°)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRotateAngle(1, -15)}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                    title="각도 -15° 회전"
                  >
                    -15°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateAngle(1, 15)}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[10px] font-mono cursor-pointer"
                    title="각도 +15° 회전"
                  >
                    +15°
                  </button>
                </div>
              </div>

              {/* Angle Presets for Fast Learning */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => handleSetAnglePreset('horizontal')}
                  className="py-1 px-1 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-medium text-slate-700 dark:text-slate-300 rounded-lg text-center transition-colors cursor-pointer"
                >
                  수평 (0°)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAnglePreset('tilt45')}
                  className="py-1 px-1 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-medium text-slate-700 dark:text-slate-300 rounded-lg text-center transition-colors cursor-pointer"
                >
                  기울임 (45°)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAnglePreset('vertical')}
                  className="py-1 px-1 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-medium text-slate-700 dark:text-slate-300 rounded-lg text-center transition-colors cursor-pointer"
                >
                  수직 (90°)
                </button>
              </div>

              {/* Angle Sliders (Y축 회전 & X축 기울기) */}
              <div className="space-y-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>수평 회전각(Y):</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.PI * 2}
                    step="0.05"
                    value={selectedObj.rotation[1]}
                    onChange={(e) =>
                      onUpdateObjectTransform(selectedObj.id, selectedObj.position, [
                        selectedObj.rotation[0],
                        parseFloat(e.target.value),
                        selectedObj.rotation[2],
                      ])
                    }
                    className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    {rotDegY}°
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>상하 기울기(X):</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.PI * 2}
                    step="0.05"
                    value={selectedObj.rotation[0]}
                    onChange={(e) =>
                      onUpdateObjectTransform(selectedObj.id, selectedObj.position, [
                        parseFloat(e.target.value),
                        selectedObj.rotation[1],
                        selectedObj.rotation[2],
                      ])
                    }
                    className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                    {rotDegX}°
                  </span>
                </div>
              </div>
            </div>

            {/* Position Controls (위치 조작) */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>X 좌우 위치:</span>
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
                  className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                  {selectedObj.position[0].toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Y 상하 높이:</span>
                <input
                  type="range"
                  min="-2"
                  max="3"
                  step="0.1"
                  value={selectedObj.position[1]}
                  onChange={(e) =>
                    onUpdateObjectTransform(
                      selectedObj.id,
                      [selectedObj.position[0], parseFloat(e.target.value), selectedObj.position[2]],
                      selectedObj.rotation
                    )
                  }
                  className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                  {selectedObj.position[1].toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Z 앞뒤 깊이:</span>
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
                  className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                  {selectedObj.position[2].toFixed(1)}
                </span>
              </div>

              {/* Center align button */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateObjectTransform(selectedObj.id, [0, 0, 0], [0, 0, 0])}
                  className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>원점(0,0,0) 초기화</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 shadow-sm max-w-[280px]">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>직관적인 3D 드래그 탐구:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              화면의 <strong>직선, 평면, 입체도형</strong>을 직접 마우스로 드래그하여 위치와 각도를 움직여보세요!
            </p>
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
    // Main cylinder line (thicker line with high click hit area for students)
    const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, len, 16);
    cylGeo.rotateX(Math.PI / 2);
    const cylMat = new THREE.MeshStandardMaterial({
      color: parsedColor,
      roughness: 0.3,
      metalness: 0.2,
      transparent: opacity < 0.99,
      opacity: Math.max(opacity, 0.5),
    });
    const cylMesh = new THREE.Mesh(cylGeo, cylMat);
    cylMesh.castShadow = true;
    group.add(cylMesh);

    // End arrow caps indicating infinite line concept in middle school math
    const arrowGeo1 = new THREE.ConeGeometry(0.16, 0.45, 16);
    arrowGeo1.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshStandardMaterial({ color: parsedColor });
    const arrow1 = new THREE.Mesh(arrowGeo1, arrowMat);
    arrow1.position.z = len / 2 + 0.22;
    group.add(arrow1);

    const arrowGeo2 = new THREE.ConeGeometry(0.16, 0.45, 16);
    arrowGeo2.rotateX(-Math.PI / 2);
    const arrow2 = new THREE.Mesh(arrowGeo2, arrowMat);
    arrow2.position.z = -len / 2 - 0.22;
    group.add(arrow2);
  } else if (obj.type === 'plane') {
    const w = (obj as any).width || 4.8;
    const h = (obj as any).height || 4.8;

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
          mat.opacity = Math.max(opacity, 0.5);
        } else if (obj.type === 'plane') {
          mat.opacity = Math.min(opacity, 0.85);
        } else {
          mat.opacity = opacity;
        }
      }
      if (isSelected) {
        mat.emissive = new THREE.Color(0x3b82f6);
        mat.emissiveIntensity = 0.3;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  });
}
