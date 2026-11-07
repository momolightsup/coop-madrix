import { Fixture, ExclusionFilters } from '../types.js';

// Deterministic PRNG: Mulberry32
export class PRNG {
  private s: number;

  constructor(seed: number) {
    this.s = seed | 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function periodicTime(t: number, duration: number): number {
  const mod = t % duration;
  return mod < 0 ? mod + duration : mod;
}

// Check if a fixture is permitted to illuminate according to exclusion filters
export function isFixturePermitted(fixture: Fixture, exclusions: ExclusionFilters): boolean {
  // Check fixture type (e.g. RGBW Light disabled)
  if (exclusions.disabledTypes.includes(fixture.type)) {
    return false;
  }

  // Check specific excluded IDs
  if (exclusions.customExcludedIds.includes(fixture.id)) {
    return false;
  }

  // Check exclusion zones
  for (const zone of exclusions.exclusionZones) {
    const minX = Math.min(zone.x1, zone.x2);
    const maxX = Math.max(zone.x1, zone.x2);
    const minY = Math.min(zone.y1, zone.y2);
    const maxY = Math.max(zone.y1, zone.y2);
    if (fixture.x >= minX && fixture.x <= maxX && fixture.y >= minY && fixture.y <= maxY) {
      return false;
    }
  }

  // Check vertical lines exclusion
  if (exclusions.excludeVerticalLines && fixture.isInVerticalLine) {
    if (exclusions.verticalLineSuppression >= 100) {
      return false;
    }
  }

  return true;
}

// Multiplier based on vertical line suppression (if suppression is 50%, vertical lines are dimmed)
export function getFixtureExclusionMultiplier(fixture: Fixture, exclusions: ExclusionFilters): number {
  if (exclusions.excludeVerticalLines && fixture.isInVerticalLine) {
    return 1 - clamp(exclusions.verticalLineSuppression / 100, 0, 1);
  }
  return 1;
}
