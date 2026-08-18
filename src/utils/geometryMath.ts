import * as THREE from 'three';
import { SceneObject, IntersectionPoint, IntersectionLine, IntersectionResult } from '../types';

/**
 * Helper to get 3D segment endpoints for a Line object
 */
export function getLineEndpoints(obj: SceneObject): { start: THREE.Vector3; end: THREE.Vector3; dir: THREE.Vector3 } {
  const len = (obj as any).length || 6;
  const half = len / 2;
  const localStart = new THREE.Vector3(0, 0, -half);
  const localEnd = new THREE.Vector3(0, 0, half);

  const euler = new THREE.Euler(...obj.rotation);
  const pos = new THREE.Vector3(...obj.position);

  const start = localStart.applyEuler(euler).add(pos);
  const end = localEnd.applyEuler(euler).add(pos);
  const dir = end.clone().sub(start).normalize();

  return { start, end, dir };
}

/**
 * Helper to get Plane geometry info (center, normal, 4 corners)
 */
export function getPlaneInfo(obj: SceneObject): {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  corners: THREE.Vector3[];
  uDir: THREE.Vector3;
  vDir: THREE.Vector3;
  halfW: number;
  halfH: number;
} {
  const w = (obj as any).width || 4;
  const h = (obj as any).height || 4;
  const halfW = w / 2;
  const halfH = h / 2;

  const euler = new THREE.Euler(...obj.rotation);
  const center = new THREE.Vector3(...obj.position);

  const normal = new THREE.Vector3(0, 1, 0).applyEuler(euler).normalize();
  const uDir = new THREE.Vector3(1, 0, 0).applyEuler(euler).normalize();
  const vDir = new THREE.Vector3(0, 0, 1).applyEuler(euler).normalize();

  const corners = [
    center.clone().add(uDir.clone().multiplyScalar(-halfW)).add(vDir.clone().multiplyScalar(-halfH)),
    center.clone().add(uDir.clone().multiplyScalar(halfW)).add(vDir.clone().multiplyScalar(-halfH)),
    center.clone().add(uDir.clone().multiplyScalar(halfW)).add(vDir.clone().multiplyScalar(halfH)),
    center.clone().add(uDir.clone().multiplyScalar(-halfW)).add(vDir.clone().multiplyScalar(halfH)),
  ];

  return { center, normal, corners, uDir, vDir, halfW, halfH };
}

/**
 * Line - Line Intersection calculation in 3D
 */
export function intersectLineLine(
  objA: SceneObject,
  objB: SceneObject,
  tolerance = 0.22
): { points: IntersectionPoint[]; relation: string; relationType: IntersectionResult['relationType'] } {
  const lineA = getLineEndpoints(objA);
  const lineB = getLineEndpoints(objB);

  const p1 = lineA.start;
  const d1 = lineA.end.clone().sub(lineA.start);
  const lenA = d1.length();
  const u1 = d1.clone().normalize();

  const p2 = lineB.start;
  const d2 = lineB.end.clone().sub(lineB.start);
  const lenB = d2.length();
  const u2 = d2.clone().normalize();

  const cross = new THREE.Vector3().crossVectors(u1, u2);
  const crossMag = cross.length();

  // Parallel check
  if (crossMag < 0.01) {
    const v12 = p2.clone().sub(p1);
    const distToLine = new THREE.Vector3().crossVectors(v12, u1).length();
    if (distToLine < tolerance) {
      return {
        points: [],
        relation: '두 직선이 일치합니다 (무수히 많은 교점)',
        relationType: 'coincident',
      };
    }
    return {
      points: [],
      relation: '두 직선이 평행합니다 (교점 없음)',
      relationType: 'parallel',
    };
  }

  // Find closest points between lines: p1 + s*u1, p2 + t*u2
  const p12 = p1.clone().sub(p2);
  const a = u1.dot(u1); // 1
  const b = u1.dot(u2);
  const c = u2.dot(u2); // 1
  const d = u1.dot(p12);
  const e = u2.dot(p12);

  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-6) {
    return { points: [], relation: '두 직선이 평행합니다', relationType: 'parallel' };
  }

  const s = (b * e - c * d) / denom;
  const t = (a * e - b * d) / denom;

  const closestPointA = p1.clone().add(u1.clone().multiplyScalar(s));
  const closestPointB = p2.clone().add(u2.clone().multiplyScalar(t));
  const dist = closestPointA.distanceTo(closestPointB);

  // Check if within segment bounds
  const inSegA = s >= -tolerance && s <= lenA + tolerance;
  const inSegB = t >= -tolerance && t <= lenB + tolerance;

  if (dist <= tolerance && inSegA && inSegB) {
    const mid = closestPointA.clone().add(closestPointB).multiplyScalar(0.5);
    return {
      points: [
        {
          id: `line_line_${objA.id}_${objB.id}`,
          position: mid,
          label: '교점',
          description: '두 직선이 만나는 점',
          sourceAId: objA.id,
          sourceBId: objB.id,
        },
      ],
      relation: '두 직선이 한 점에서 만납니다 → 교점 1개 생성',
      relationType: 'intersection_point',
    };
  }

  return {
    points: [],
    relation: '두 직선이 만나지 않는 꼬인 위치에 있습니다',
    relationType: 'skew',
  };
}

/**
 * Line - Plane Intersection calculation
 */
export function intersectLinePlane(
  lineObj: SceneObject,
  planeObj: SceneObject
): { points: IntersectionPoint[]; lines: IntersectionLine[]; relation: string; relationType: IntersectionResult['relationType'] } {
  const line = getLineEndpoints(lineObj);
  const plane = getPlaneInfo(planeObj);

  const p1 = line.start;
  const p2 = line.end;
  const d = p2.clone().sub(p1);
  const len = d.length();
  const dir = d.clone().normalize();

  const dot = plane.normal.dot(dir);

  if (Math.abs(dot) < 1e-5) {
    const dist = Math.abs(plane.normal.dot(p1.clone().sub(plane.center)));
    if (dist < 0.1) {
      return {
        points: [],
        lines: [],
        relation: '직선이 평면에 포함되어 있습니다 (무수히 많은 교점)',
        relationType: 'coincident',
      };
    }
    return {
      points: [],
      lines: [],
      relation: '직선과 평면이 평행합니다 (교점 없음)',
      relationType: 'parallel',
    };
  }

  // Parameter t
  const t = plane.normal.dot(plane.center.clone().sub(p1)) / plane.normal.dot(dir);

  if (t >= -0.05 && t <= len + 0.05) {
    const pt = p1.clone().add(dir.clone().multiplyScalar(t));
    const offset = pt.clone().sub(plane.center);
    const uProj = offset.dot(plane.uDir);
    const vProj = offset.dot(plane.vDir);

    const margin = 0.2;
    if (Math.abs(uProj) <= plane.halfW + margin && Math.abs(vProj) <= plane.halfH + margin) {
      return {
        points: [
          {
            id: `line_plane_${lineObj.id}_${planeObj.id}`,
            position: pt,
            label: '교점',
            description: '직선과 평면이 만나는 점',
            sourceAId: lineObj.id,
            sourceBId: planeObj.id,
          },
        ],
        lines: [],
        relation: '직선이 평면을 뚫고 지나가며 한 점에서 만납니다 → 교점 1개',
        relationType: 'intersection_point',
      };
    }
  }

  return {
    points: [],
    lines: [],
    relation: '직선과 평면이 만나지 않습니다',
    relationType: 'none',
  };
}

/**
 * Plane - Plane Intersection Line calculation
 */
export function intersectPlanePlane(
  planeAObj: SceneObject,
  planeBObj: SceneObject
): { lines: IntersectionLine[]; relation: string; relationType: IntersectionResult['relationType'] } {
  const pA = getPlaneInfo(planeAObj);
  const pB = getPlaneInfo(planeBObj);

  const nA = pA.normal;
  const nB = pB.normal;

  const lineDir = new THREE.Vector3().crossVectors(nA, nB);
  const lineDirLen = lineDir.length();

  if (lineDirLen < 0.05) {
    const d = Math.abs(nA.dot(pB.center.clone().sub(pA.center)));
    if (d < 0.1) {
      return {
        lines: [],
        relation: '두 평면이 일치합니다',
        relationType: 'coincident',
      };
    }
    return {
      lines: [],
      relation: '두 평면이 평행합니다 (교선 없음)',
      relationType: 'parallel',
    };
  }

  lineDir.normalize();

  // Find a point on intersection line of the two infinite planes
  const dA = nA.dot(pA.center);
  const dB = nB.dot(pB.center);
  const nAdotnB = nA.dot(nB);

  const det = 1.0 - nAdotnB * nAdotnB;
  if (Math.abs(det) < 1e-6) {
    return { lines: [], relation: '두 평면이 평행합니다', relationType: 'parallel' };
  }

  const cA = (dA - dB * nAdotnB) / det;
  const cB = (dB - dA * nAdotnB) / det;
  const p0 = nA.clone().multiplyScalar(cA).add(nB.clone().multiplyScalar(cB));

  // Clip infinite line against both rectangles (convex polygons)
  const segmentsA = clipLineAgainstQuad(p0, lineDir, pA.corners);
  const segmentsB = clipLineAgainstQuad(p0, lineDir, pB.corners);

  if (segmentsA && segmentsB) {
    const tMin = Math.max(segmentsA.tMin, segmentsB.tMin);
    const tMax = Math.min(segmentsA.tMax, segmentsB.tMax);

    if (tMax - tMin > 0.05) {
      const ptStart = p0.clone().add(lineDir.clone().multiplyScalar(tMin));
      const ptEnd = p0.clone().add(lineDir.clone().multiplyScalar(tMax));

      return {
        lines: [
          {
            id: `plane_plane_${planeAObj.id}_${planeBObj.id}`,
            points: [ptStart, ptEnd],
            label: '교선',
            description: '두 평면이 만나서 생기는 선',
            sourceAId: planeAObj.id,
            sourceBId: planeBObj.id,
          },
        ],
        relation: '두 평면이 만나서 직선을 이룹니다 → 교선 생성',
        relationType: 'intersection_line',
      };
    }
  }

  return {
    lines: [],
    relation: '두 평면이 만나지 않거나 교선 범위 밖입니다',
    relationType: 'none',
  };
}

function clipLineAgainstQuad(
  p0: THREE.Vector3,
  dir: THREE.Vector3,
  corners: THREE.Vector3[]
): { tMin: number; tMax: number } | null {
  const ts: number[] = [];

  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    const edge = c2.clone().sub(c1);

    // Segment-line intersection in 3D
    const normal = new THREE.Vector3().crossVectors(dir, edge);
    if (normal.length() < 1e-5) continue;

    const diff = c1.clone().sub(p0);
    const u = new THREE.Vector3().crossVectors(diff, edge).dot(normal) / normal.lengthSq();
    const v = new THREE.Vector3().crossVectors(diff, dir).dot(normal) / normal.lengthSq();

    if (v >= -0.01 && v <= 1.01) {
      ts.push(u);
    }
  }

  if (ts.length >= 2) {
    ts.sort((a, b) => a - b);
    return { tMin: ts[0], tMax: ts[ts.length - 1] };
  }
  return null;
}

/**
 * Generate Mesh geometry representation for solid shapes
 */
export function getSolidTriangles(solid: SceneObject): THREE.Triangle[] {
  let geo: THREE.BufferGeometry;

  if (solid.type === 'tetrahedron') {
    geo = new THREE.TetrahedronGeometry(1.6);
  } else if (solid.type === 'cuboid') {
    const w = (solid as any).width || 2.4;
    const h = solid.height || 2.4;
    const d = (solid as any).depth || 2.4;
    geo = new THREE.BoxGeometry(w, h, d);
  } else if (solid.type === 'cylinder') {
    const r = (solid as any).radius || 1.4;
    const h = solid.height || 2.8;
    geo = new THREE.CylinderGeometry(r, r, h, 32);
  } else if (solid.type === 'cone') {
    const r = (solid as any).radius || 1.5;
    const h = solid.height || 2.8;
    geo = new THREE.ConeGeometry(r, h, 32);
  } else {
    return [];
  }

  const matrix = new THREE.Matrix4();
  const euler = new THREE.Euler(...solid.rotation);
  const pos = new THREE.Vector3(...solid.position);
  const scale = new THREE.Vector3(...solid.scale);
  matrix.compose(pos, new THREE.Quaternion().setFromEuler(euler), scale);

  const posAttr = geo.getAttribute('position');
  const indexAttr = geo.getIndex();
  const triangles: THREE.Triangle[] = [];

  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i += 3) {
      const aIdx = indexAttr.getX(i);
      const bIdx = indexAttr.getX(i + 1);
      const cIdx = indexAttr.getX(i + 2);

      const a = new THREE.Vector3().fromBufferAttribute(posAttr, aIdx).applyMatrix4(matrix);
      const b = new THREE.Vector3().fromBufferAttribute(posAttr, bIdx).applyMatrix4(matrix);
      const c = new THREE.Vector3().fromBufferAttribute(posAttr, cIdx).applyMatrix4(matrix);

      triangles.push(new THREE.Triangle(a, b, c));
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(matrix);
      const b = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1).applyMatrix4(matrix);
      const c = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2).applyMatrix4(matrix);

      triangles.push(new THREE.Triangle(a, b, c));
    }
  }

  geo.dispose();
  return triangles;
}

/**
 * Line - Solid Intersection calculation
 */
export function intersectLineSolid(
  lineObj: SceneObject,
  solidObj: SceneObject
): { points: IntersectionPoint[]; relation: string; relationType: IntersectionResult['relationType'] } {
  const line = getLineEndpoints(lineObj);
  const ray = new THREE.Ray(line.start, line.dir);
  const maxDist = line.end.distanceTo(line.start);

  const triangles = getSolidTriangles(solidObj);
  const hitPoints: THREE.Vector3[] = [];

  for (const tri of triangles) {
    const target = new THREE.Vector3();
    const hit = ray.intersectTriangle(tri.a, tri.b, tri.c, false, target);
    if (hit) {
      const dist = hit.distanceTo(line.start);
      if (dist <= maxDist + 0.05) {
        // Check duplicate
        const isDup = hitPoints.some((p) => p.distanceTo(hit) < 0.15);
        if (!isDup) {
          hitPoints.push(hit.clone());
        }
      }
    }
  }

  if (hitPoints.length > 0) {
    const pts: IntersectionPoint[] = hitPoints.map((pt, idx) => ({
      id: `line_solid_${lineObj.id}_${solidObj.id}_${idx}`,
      position: pt,
      label: '교점',
      description: `직선과 ${getSolidKoreanName(solidObj.type)}의 면이 만나는 점`,
      sourceAId: lineObj.id,
      sourceBId: solidObj.id,
    }));

    return {
      points: pts,
      relation: `직선과 ${getSolidKoreanName(solidObj.type)}이(가) 만나 교점 ${pts.length}개가 생깁니다`,
      relationType: 'intersection_point',
    };
  }

  return {
    points: [],
    relation: `직선과 ${getSolidKoreanName(solidObj.type)}이(가) 만나지 않습니다`,
    relationType: 'none',
  };
}

/**
 * Plane - Solid Intersection Line calculation
 */
export function intersectPlaneSolid(
  planeObj: SceneObject,
  solidObj: SceneObject
): { lines: IntersectionLine[]; relation: string; relationType: IntersectionResult['relationType'] } {
  const plane = getPlaneInfo(planeObj);
  const triangles = getSolidTriangles(solidObj);

  const threePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(plane.normal, plane.center);
  const rawSegments: [THREE.Vector3, THREE.Vector3][] = [];

  // Slice each triangle with the plane
  for (const tri of triangles) {
    const da = threePlane.distanceToPoint(tri.a);
    const db = threePlane.distanceToPoint(tri.b);
    const dc = threePlane.distanceToPoint(tri.c);

    const pts: THREE.Vector3[] = [];

    if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
      const t = da / (da - db);
      pts.push(tri.a.clone().lerp(tri.b, t));
    }
    if ((db > 0 && dc < 0) || (db < 0 && dc > 0)) {
      const t = db / (db - dc);
      pts.push(tri.b.clone().lerp(tri.c, t));
    }
    if ((dc > 0 && da < 0) || (dc < 0 && da > 0)) {
      const t = dc / (dc - da);
      pts.push(tri.c.clone().lerp(tri.a, t));
    }

    if (pts.length === 2) {
      // Check if within plane rectangular bounds
      const inA = isPointInPlane(pts[0], plane);
      const inB = isPointInPlane(pts[1], plane);
      if (inA && inB) {
        rawSegments.push([pts[0], pts[1]]);
      }
    }
  }

  if (rawSegments.length > 0) {
    // Chain segments into connected loop or continuous polylines
    const chained = chainSegments(rawSegments);

    const lines: IntersectionLine[] = chained.map((poly, idx) => ({
      id: `plane_solid_${planeObj.id}_${solidObj.id}_${idx}`,
      points: poly,
      label: '교선',
      description: `평면과 ${getSolidKoreanName(solidObj.type)}의 면이 만나는 교선(단면 윤곽선)`,
      sourceAId: planeObj.id,
      sourceBId: solidObj.id,
      isClosed: true,
    }));

    return {
      lines,
      relation: `평면과 ${getSolidKoreanName(solidObj.type)}의 표면이 만나 교선(단면 윤곽선)이 생깁니다`,
      relationType: 'intersection_line',
    };
  }

  return {
    lines: [],
    relation: `평면과 ${getSolidKoreanName(solidObj.type)}이(가) 만나지 않습니다`,
    relationType: 'none',
  };
}

function isPointInPlane(
  pt: THREE.Vector3,
  plane: { center: THREE.Vector3; uDir: THREE.Vector3; vDir: THREE.Vector3; halfW: number; halfH: number }
): boolean {
  const diff = pt.clone().sub(plane.center);
  const u = diff.dot(plane.uDir);
  const v = diff.dot(plane.vDir);
  const margin = 0.2;
  return Math.abs(u) <= plane.halfW + margin && Math.abs(v) <= plane.halfH + margin;
}

function chainSegments(segments: [THREE.Vector3, THREE.Vector3][]): THREE.Vector3[][] {
  if (segments.length === 0) return [];
  const remaining = [...segments];
  const polylines: THREE.Vector3[][] = [];

  while (remaining.length > 0) {
    const first = remaining.pop()!;
    const chain: THREE.Vector3[] = [first[0], first[1]];

    let extended = true;
    while (extended && remaining.length > 0) {
      extended = false;
      const head = chain[0];
      const tail = chain[chain.length - 1];

      for (let i = 0; i < remaining.length; i++) {
        const [p1, p2] = remaining[i];
        if (tail.distanceTo(p1) < 0.12) {
          chain.push(p2);
          remaining.splice(i, 1);
          extended = true;
          break;
        } else if (tail.distanceTo(p2) < 0.12) {
          chain.push(p1);
          remaining.splice(i, 1);
          extended = true;
          break;
        } else if (head.distanceTo(p2) < 0.12) {
          chain.unshift(p1);
          remaining.splice(i, 1);
          extended = true;
          break;
        } else if (head.distanceTo(p1) < 0.12) {
          chain.unshift(p2);
          remaining.splice(i, 1);
          extended = true;
          break;
        }
      }
    }
    if (chain.length >= 2) {
      polylines.push(chain);
    }
  }

  return polylines;
}

export function getSolidKoreanName(type: string): string {
  switch (type) {
    case 'tetrahedron':
      return '사면체';
    case 'cuboid':
      return '직육면체';
    case 'cylinder':
      return '원기둥';
    case 'cone':
      return '원뿔';
    case 'line':
      return '직선';
    case 'plane':
      return '평면';
    default:
      return '도형';
  }
}

/**
 * Global calculation of all intersections across active objects in the scene
 */
export function calculateAllIntersections(objects: SceneObject[]): IntersectionResult {
  const points: IntersectionPoint[] = [];
  const lines: IntersectionLine[] = [];
  const relationTexts: string[] = [];
  let mainRelationType: IntersectionResult['relationType'] = 'none';

  if (objects.length < 2) {
    return {
      points: [],
      lines: [],
      relationshipText: objects.length === 1 ? '도형 1개가 생성되었습니다. 다른 도형을 추가해보세요!' : '오른쪽 메뉴에서 도형을 선택해주세요.',
      relationType: 'none',
    };
  }

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const objA = objects[i];
      const objB = objects[j];

      // Line + Line
      if (objA.type === 'line' && objB.type === 'line') {
        const res = intersectLineLine(objA, objB);
        points.push(...res.points);
        relationTexts.push(res.relation);
        if (res.points.length > 0) mainRelationType = 'intersection_point';
      }
      // Line + Plane
      else if (objA.type === 'line' && objB.type === 'plane') {
        const res = intersectLinePlane(objA, objB);
        points.push(...res.points);
        lines.push(...res.lines);
        relationTexts.push(res.relation);
        if (res.points.length > 0) mainRelationType = 'intersection_point';
      } else if (objA.type === 'plane' && objB.type === 'line') {
        const res = intersectLinePlane(objB, objA);
        points.push(...res.points);
        lines.push(...res.lines);
        relationTexts.push(res.relation);
        if (res.points.length > 0) mainRelationType = 'intersection_point';
      }
      // Plane + Plane
      else if (objA.type === 'plane' && objB.type === 'plane') {
        const res = intersectPlanePlane(objA, objB);
        lines.push(...res.lines);
        relationTexts.push(res.relation);
        if (res.lines.length > 0) mainRelationType = 'intersection_line';
      }
      // Line + Solid
      else if (objA.type === 'line' && isSolid(objB.type)) {
        const res = intersectLineSolid(objA, objB);
        points.push(...res.points);
        relationTexts.push(res.relation);
        if (res.points.length > 0) mainRelationType = 'intersection_point';
      } else if (isSolid(objA.type) && objB.type === 'line') {
        const res = intersectLineSolid(objB, objA);
        points.push(...res.points);
        relationTexts.push(res.relation);
        if (res.points.length > 0) mainRelationType = 'intersection_point';
      }
      // Plane + Solid
      else if (objA.type === 'plane' && isSolid(objB.type)) {
        const res = intersectPlaneSolid(objA, objB);
        lines.push(...res.lines);
        relationTexts.push(res.relation);
        if (res.lines.length > 0) mainRelationType = 'intersection_line';
      } else if (isSolid(objA.type) && objB.type === 'plane') {
        const res = intersectPlaneSolid(objB, objA);
        lines.push(...res.lines);
        relationTexts.push(res.relation);
        if (res.lines.length > 0) mainRelationType = 'intersection_line';
      }
    }
  }

  return {
    points,
    lines,
    relationshipText: relationTexts.join(' | ') || '도형들이 배치되었습니다.',
    relationType: mainRelationType,
  };
}

function isSolid(type: string): boolean {
  return ['tetrahedron', 'cuboid', 'cylinder', 'cone'].includes(type);
}
