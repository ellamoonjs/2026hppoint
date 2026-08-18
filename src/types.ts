import * as THREE from 'three';

export type ShapeType = 'line' | 'plane' | 'tetrahedron' | 'cuboid' | 'cylinder' | 'cone';

export interface BaseObjectState {
  id: string;
  name: string;
  type: ShapeType;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number]; // in radians
  scale: [number, number, number];
  visible: boolean;
}

export interface LineObjectState extends BaseObjectState {
  type: 'line';
  length: number;
}

export interface PlaneObjectState extends BaseObjectState {
  type: 'plane';
  width: number;
  height: number;
}

export interface SolidObjectState extends BaseObjectState {
  type: 'tetrahedron' | 'cuboid' | 'cylinder' | 'cone';
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  width?: number;
  height: number;
  depth?: number;
}

export type SceneObject = LineObjectState | PlaneObjectState | SolidObjectState;

export interface IntersectionPoint {
  id: string;
  position: THREE.Vector3;
  label: string; // '교점'
  description?: string;
  sourceAId: string;
  sourceBId: string;
}

export interface IntersectionLine {
  id: string;
  points: THREE.Vector3[]; // Line segment or polygon loop
  label: string; // '교선'
  description?: string;
  sourceAId: string;
  sourceBId: string;
  isClosed?: boolean;
}

export interface IntersectionResult {
  points: IntersectionPoint[];
  lines: IntersectionLine[];
  relationshipText: string;
  relationType: 'intersection_point' | 'intersection_line' | 'parallel' | 'skew' | 'coincident' | 'none';
}

export type TransformMode = 'translate' | 'rotate';
