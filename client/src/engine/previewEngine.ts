import {
  Fixture,
  PatchData,
  VideoSettings,
  ExclusionFilters,
  EffectType,
  AnyEffectParams,
  DiamondGlintsParams,
  ChristmasSparklesParams,
  GentleSnowfallParams,
  OrganicFireParams,
  RisingHeartsParams,
  StationaryHeartsParams,
  MusicalSparklesParams,
  TypographyParams,
  AllLightsOnParams,
} from '../types';

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

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function periodicTime(t: number, duration: number): number {
  const mod = t % duration;
  return mod < 0 ? mod + duration : mod;
}

export function isFixturePermitted(fixture: Fixture, exclusions: ExclusionFilters): boolean {
  if (exclusions.disabledTypes.includes(fixture.type)) return false;
  if (exclusions.customExcludedIds.includes(fixture.id)) return false;

  for (const zone of exclusions.exclusionZones) {
    const minX = Math.min(zone.x1, zone.x2);
    const maxX = Math.max(zone.x1, zone.x2);
    const minY = Math.min(zone.y1, zone.y2);
    const maxY = Math.max(zone.y1, zone.y2);
    if (fixture.x >= minX && fixture.x <= maxX && fixture.y >= minY && fixture.y <= maxY) {
      return false;
    }
  }

  if (exclusions.excludeVerticalLines && fixture.isInVerticalLine) {
    if (exclusions.verticalLineSuppression >= 100) return false;
  }
  return true;
}

export function getFixtureExclusionMultiplier(fixture: Fixture, exclusions: ExclusionFilters): number {
  if (exclusions.excludeVerticalLines && fixture.isInVerticalLine) {
    return 1 - clamp(exclusions.verticalLineSuppression / 100, 0, 1);
  }
  return 1;
}

export interface PreparedPreviewEngine {
  renderFrame: (t: number, targetBuffer: Uint8Array) => void;
}

interface PermittedFixtureItem {
  fixture: Fixture;
  index: number;
  mult: number;
}

export function createPreviewEngine(
  patch: PatchData,
  settings: VideoSettings,
  exclusions: ExclusionFilters,
  effectType: EffectType,
  params: AnyEffectParams
): PreparedPreviewEngine {
  const prng = new PRNG(settings.randomSeed);
  const duration = settings.duration;
  const width = settings.canvasWidth;
  const height = settings.canvasHeight;

  // Filter permitted fixtures
  const permittedFixtures: PermittedFixtureItem[] = [];
  for (let i = 0; i < patch.fixtures.length; i++) {
    const f = patch.fixtures[i];
    if (isFixturePermitted(f, exclusions)) {
      const mult = getFixtureExclusionMultiplier(f, exclusions);
      permittedFixtures.push({ fixture: f, index: i, mult });
    }
  }

  // High-performance spatial lookup grid indexed by X coordinate
  const spatialGrid = new Map<number, PermittedFixtureItem[]>();
  for (const pf of permittedFixtures) {
    let list = spatialGrid.get(pf.fixture.x);
    if (!list) {
      list = [];
      spatialGrid.set(pf.fixture.x, list);
    }
    list.push(pf);
  }

  // Fast nearby query: finds fixtures within radius R of (cx, cy)
  const forNearbyFixtures = (
    cx: number,
    cy: number,
    radius: number,
    callback: (pf: PermittedFixtureItem, dist: number) => void
  ) => {
    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const rSq = radius * radius;

    for (let x = minX; x <= maxX; x++) {
      const list = spatialGrid.get(x);
      if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const pf = list[i];
        const dy = pf.fixture.y - cy;
        if (Math.abs(dy) > radius) continue;
        const dx = pf.fixture.x - cx;
        const distSq = dx * dx + dy * dy;
        if (distSq <= rSq) {
          callback(pf, Math.sqrt(distSq));
        }
      }
    }
  };

  const speed = Math.max(0.1, params.speed || 1.0);

  switch (effectType) {
    // 1. DIAMOND GLINTS
    case 'diamond_glints': {
      const p = params as DiamondGlintsParams;
      const totalEvents = Math.floor((p.amount * 450 * duration) / 60);

      const weightedPool: number[] = [];
      permittedFixtures.forEach((f, idx) => {
        const weight = f.fixture.isIsolated ? Math.max(1, Math.round(p.isolatedDotBoost * 4)) : 1;
        for (let w = 0; w < weight; w++) weightedPool.push(idx);
      });

      const sparkles = Array.from({ length: totalEvents }, () => ({
        fIdx: prng.choice(weightedPool),
        birthTime: prng.range(0, duration),
        attack: prng.range(p.fadeInMin, p.fadeInMax),
        decay: prng.range(p.fadeOutMin, p.fadeOutMax),
        peak: prng.range(p.brightnessMin, p.brightnessMax),
      }));

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          if (permittedFixtures.length === 0) return;
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < sparkles.length; i++) {
            const s = sparkles[i];
            let dt = time - s.birthTime;
            if (dt < 0) dt += duration;
            const totalLife = s.attack + s.decay;

            if (dt < totalLife) {
              const env = dt < s.attack
                ? (s.attack > 0 ? smoothstep(0, s.attack, dt) : 1)
                : (s.decay > 0 ? smoothstep(totalLife, s.attack, dt) : 0);
              const f = permittedFixtures[s.fIdx];
              const b = Math.round(s.peak * env * f.mult * 2.55);
              if (b > target[f.index]) target[f.index] = b;
            }
          }
        },
      };
    }

    // 2. CHRISTMAS SPARKLES
    case 'christmas_sparkles': {
      const p = params as ChristmasSparklesParams;
      const totalEvents = Math.floor((p.amount * 500 * duration) / 60);

      const sparkles = Array.from({ length: totalEvents }, () => {
        const fIdx = Math.floor(prng.next() * permittedFixtures.length);
        const birthTime = prng.range(0, duration);
        const attack = prng.range(p.fadeInMin, p.fadeInMax);
        const decay = prng.range(p.fadeOutMin, p.fadeOutMax);
        const peak = prng.range(p.brightnessMin, p.brightnessMax);

        const roll = prng.next() * 100;
        let radius = 0;
        if (roll < p.smallPct) radius = 0;
        else if (roll < p.smallPct + p.mediumPct) radius = p.clusterRadius * 0.5;
        else radius = p.clusterRadius;

        return { fIdx, birthTime, attack, decay, peak, radius };
      });

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          if (permittedFixtures.length === 0) return;
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < sparkles.length; i++) {
            const s = sparkles[i];
            let dt = time - s.birthTime;
            if (dt < 0) dt += duration;
            const totalLife = s.attack + s.decay;

            if (dt < totalLife) {
              const env = dt < s.attack
                ? (s.attack > 0 ? smoothstep(0, s.attack, dt) : 1)
                : (s.decay > 0 ? smoothstep(totalLife, s.attack, dt) : 0);

              const center = permittedFixtures[s.fIdx];
              const bVal = Math.round(s.peak * env * center.mult * 2.55);
              if (bVal > target[center.index]) target[center.index] = bVal;

              if (s.radius > 0) {
                forNearbyFixtures(center.fixture.x, center.fixture.y, s.radius, (pf, dist) => {
                  if (pf.index === center.index) return;
                  const nb = Math.round(bVal * (1 - dist / s.radius) * 0.6);
                  if (nb > target[pf.index]) target[pf.index] = nb;
                });
              }
            }
          }
        },
      };
    }

    // 3. GENTLE SNOWFALL
    case 'gentle_snowfall': {
      const p = params as GentleSnowfallParams;
      const flakeCount = Math.floor(p.amount * 500);
      const vy = (p.verticalSpeed || 1.2) * 12;
      const vx = (p.horizontalDrift || 0.4) * 6;

      const flakes = Array.from({ length: flakeCount }, () => {
        const yBias = Math.pow(prng.next(), 1 + p.upperConcentration / 40);
        return {
          startX: prng.range(0, width),
          startY: yBias * height,
          speedVariation: prng.range(0.7, 1.3),
          shimmerPhase: prng.range(0, Math.PI * 2),
          shimmerFreq: prng.range(2, 6),
          maxB: prng.range(p.brightnessMin, p.brightnessMax),
        };
      });

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < flakes.length; i++) {
            const flake = flakes[i];
            const curY = (flake.startY + vy * flake.speedVariation * time) % height;
            const curX =
              (flake.startX +
                vx * time +
                Math.sin(time * flake.shimmerFreq + flake.shimmerPhase) * p.shimmerAmount * 4 +
                width) %
              width;

            const shimmer = 0.7 + 0.3 * Math.sin(time * flake.shimmerFreq * 2 + flake.shimmerPhase);
            const rawB = flake.maxB * shimmer;

            forNearbyFixtures(curX, curY, 2.0, (pf, dist) => {
              const b = Math.round(rawB * (1 - dist / 2.0) * pf.mult * 2.55);
              if (b > target[pf.index]) target[pf.index] = b;
            });
          }
        },
      };
    }

    // 4. ORGANIC FIRE SPARKLES
    case 'organic_fire': {
      const p = params as OrganicFireParams;
      const emberCount = Math.floor(p.amount * 450);
      const embers = Array.from({ length: emberCount }, () => {
        const yBias = Math.pow(prng.next(), 0.3 + (100 - p.bottomConcentration) / 100);
        return {
          startX: prng.range(0, width),
          startY: height - yBias * (height * 0.7),
          birthTime: prng.range(0, duration),
          lifetime: prng.range(0.8, 3.5),
          riseDist: prng.range(5, 35) * (p.upwardDrift / 50),
          swayAmp: prng.range(1, 6),
          swayFreq: prng.range(2, 8),
          peak: prng.range(p.brightnessMin, p.brightnessMax),
        };
      });

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < embers.length; i++) {
            const e = embers[i];
            let dt = time - e.birthTime;
            if (dt < 0) dt += duration;

            if (dt < e.lifetime) {
              const progress = dt / e.lifetime;
              const flicker =
                0.6 +
                0.4 *
                  Math.sin(progress * Math.PI * e.swayFreq + p.flickerIrregularity);
              const env = Math.sin(progress * Math.PI) * flicker;

              const curY = e.startY - progress * e.riseDist;
              const curX =
                (e.startX + Math.sin(progress * Math.PI * 2 * e.swayFreq) * e.swayAmp + width) %
                width;
              const bVal = Math.round(e.peak * env * 2.55);

              forNearbyFixtures(curX, curY, 2.5, (pf, dist) => {
                const b = Math.round(bVal * (1 - dist / 2.5) * pf.mult);
                if (b > target[pf.index]) target[pf.index] = b;
              });
            }
          }
        },
      };
    }

    // 5. RISING HEARTS
    case 'rising_hearts': {
      const p = params as RisingHeartsParams;
      const heartCount = Math.max(1, p.heartCount || 8);
      const hearts = Array.from({ length: heartCount }, () => ({
        size: prng.range(p.minHeartSize, p.maxHeartSize),
        speed: prng.range(p.minSpeed, p.maxSpeed) * 10,
        startX: prng.range(p.maxHeartSize * 1.5, width - p.maxHeartSize * 1.5),
        startY: prng.range(0, height),
        brightness: prng.range(p.brightnessMin, p.brightnessMax),
      }));

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < hearts.length; i++) {
            const h = hearts[i];
            const curY = (h.startY - h.speed * time + height * 100) % height;
            const curX = h.startX;
            const s = h.size;

            forNearbyFixtures(curX, curY, s * 1.6, (pf) => {
              const dx = pf.fixture.x - curX;
              const dy = -(pf.fixture.y - curY);
              const nx = dx / s;
              const ny = dy / s + 0.2;
              const term = nx * nx + ny * ny - 1;
              const inside = term * term * term - nx * nx * ny * ny * ny;

              if (inside <= 0.05) {
                const b = Math.round(h.brightness * pf.mult * 2.55);
                if (b > target[pf.index]) target[pf.index] = b;
              }
            });
          }
        },
      };
    }

    // 6. STATIONARY FADING HEARTS
    case 'stationary_hearts': {
      const p = params as StationaryHeartsParams;
      const heartCount = Math.max(1, p.heartCount || 6);
      const interval = duration / heartCount;
      const s = p.heartSize || 14;

      const candidates = Array.from({ length: heartCount }, () => {
        const f = prng.choice(permittedFixtures);
        return {
          cx: clamp(f.fixture.x, s * 2, width - s * 2),
          cy: clamp(f.fixture.y, s * 2, height - s * 2),
        };
      });

      const fadeIn = Math.max(0.3, p.fadeInMin);
      const hold = Math.max(0.5, p.holdDuration || 3.0);
      const fadeOut = Math.max(0.3, p.fadeOutMin);
      const cycleLife = fadeIn + hold + fadeOut;

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < candidates.length; i++) {
            const center = candidates[i];
            let dt = time - i * interval;
            if (dt < 0) dt += duration;

            if (dt < cycleLife) {
              const env = dt < fadeIn
                ? smoothstep(0, fadeIn, dt)
                : dt < fadeIn + hold
                ? 1
                : smoothstep(cycleLife, fadeIn + hold, dt);

              const peakB = p.brightnessMax * env;

              forNearbyFixtures(center.cx, center.cy, s * 1.6, (pf) => {
                const dx = pf.fixture.x - center.cx;
                const dy = -(pf.fixture.y - center.cy);
                const nx = dx / s;
                const ny = dy / s + 0.2;
                const term = nx * nx + ny * ny - 1;
                const inside = term * term * term - nx * nx * ny * ny * ny;

                if (inside <= 0.05) {
                  const b = Math.round(peakB * pf.mult * 2.55);
                  if (b > target[pf.index]) target[pf.index] = b;
                }
              });
            }
          }
        },
      };
    }

    // 7. MUSICAL SPARKLES
    case 'musical_sparkles': {
      const p = params as MusicalSparklesParams;
      const bpm = (p.tempoBpm || 120);
      const beatSec = 60 / bpm;
      const totalBeats = Math.floor(duration / beatSec);
      const voices = Math.max(1, p.voicesCount || 4);

      const voiceZones = Array.from({ length: voices }, (_, v) => {
        const minX = (v / voices) * width;
        const maxX = ((v + 1) / voices) * width;
        return permittedFixtures.filter((f) => f.fixture.x >= minX && f.fixture.x < maxX);
      });

      const notes: Array<{
        voice: number;
        beatTime: number;
        fixtureIndex: number;
        peak: number;
        attack: number;
        decay: number;
      }> = [];

      for (let b = 0; b < totalBeats; b++) {
        for (let v = 0; v < voices; v++) {
          const zone = voiceZones[v];
          if (zone.length === 0) continue;
          const noteTime = b * beatSec + ((v * p.callResponseDelay * 0.1) % beatSec);
          if (noteTime >= duration) continue;

          const f = prng.choice(zone);
          notes.push({
            voice: v,
            beatTime: noteTime,
            fixtureIndex: f.index,
            peak: prng.range(p.brightnessMin, p.brightnessMax),
            attack: p.fadeInMin * 0.5,
            decay: beatSec * 0.8,
          });
        }
      }

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);

          for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            let dt = time - n.beatTime;
            if (dt < 0) dt += duration;

            const totalLife = n.attack + n.decay;
            if (dt < totalLife) {
              const env = dt < n.attack ? (n.attack > 0 ? dt / n.attack : 1) : 1 - (dt - n.attack) / n.decay;
              const b = Math.round(n.peak * env * 2.55);
              if (b > target[n.fixtureIndex]) target[n.fixtureIndex] = b;
            }
          }
        },
      };
    }

    // 8. TYPOGRAPHY
    case 'typography': {
      const p = params as TypographyParams;
      const text = (p.text || 'LETZIPARK').toUpperCase();
      const textX = p.textX || width * 0.2;
      const textY = p.textY || height * 0.5;
      const fontSize = p.fontSize || 32;

      const font5x7: Record<string, number[]> = {
        A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
        B: [0x7f, 0x49, 0x49, 0x49, 0x36],
        C: [0x3e, 0x41, 0x41, 0x41, 0x22],
        D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
        E: [0x7f, 0x49, 0x49, 0x49, 0x41],
        F: [0x7f, 0x09, 0x09, 0x09, 0x01],
        G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
        H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
        I: [0x00, 0x41, 0x7f, 0x41, 0x00],
        K: [0x7f, 0x08, 0x14, 0x22, 0x41],
        L: [0x7f, 0x40, 0x40, 0x40, 0x40],
        M: [0x7f, 0x02, 0x0c, 0x02, 0x7f],
        N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
        O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
        P: [0x7f, 0x09, 0x09, 0x09, 0x06],
        R: [0x7f, 0x09, 0x19, 0x29, 0x46],
        S: [0x46, 0x49, 0x49, 0x49, 0x31],
        T: [0x01, 0x01, 0x7f, 0x01, 0x01],
        U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
        W: [0x7f, 0x20, 0x18, 0x20, 0x7f],
        Z: [0x61, 0x51, 0x49, 0x45, 0x43],
        ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
      };

      const scale = Math.max(1, Math.round(fontSize / 7));
      const activeGlyphPixels: Array<{ x: number; y: number }> = [];

      let curX = textX;
      for (let c = 0; c < text.length; c++) {
        const matrix = font5x7[text[c]] || font5x7[' '];
        for (let col = 0; col < 5; col++) {
          const colBits = matrix[col];
          for (let row = 0; row < 7; row++) {
            if ((colBits & (1 << row)) !== 0) {
              for (let sx = 0; sx < scale; sx++) {
                for (let sy = 0; sy < scale; sy++) {
                  activeGlyphPixels.push({
                    x: curX + col * scale + sx,
                    y: textY - 3 * scale + row * scale + sy,
                  });
                }
              }
            }
          }
        }
        curX += 6 * scale;
      }

      const textFixtures: Array<{ fixtureIndex: number; mult: number }> = [];
      for (let j = 0; j < permittedFixtures.length; j++) {
        const f = permittedFixtures[j];
        for (const pt of activeGlyphPixels) {
          if (Math.abs(f.fixture.x - pt.x) <= 1 && Math.abs(f.fixture.y - pt.y) <= 1) {
            textFixtures.push({ fixtureIndex: f.index, mult: f.mult });
            break;
          }
        }
      }

      const fadeIn = p.fadeInMin;
      const hold = p.holdDuration || 4.0;
      const fadeOut = p.fadeOutMin;
      const cycle = fadeIn + hold + fadeOut;

      return {
        renderFrame(t: number, target: Uint8Array) {
          target.fill(0);
          const time = periodicTime(t * speed, duration);
          let env = 1;
          if (cycle < duration) {
            const phase = time % (cycle + 2);
            if (phase < fadeIn) env = smoothstep(0, fadeIn, phase);
            else if (phase < fadeIn + hold) env = 1;
            else if (phase < cycle) env = smoothstep(cycle, fadeIn + hold, phase);
            else env = 0;
          }

          const peakB = Math.round(p.brightnessMax * env * 2.55);
          for (let i = 0; i < textFixtures.length; i++) {
            const tf = textFixtures[i];
            target[tf.fixtureIndex] = Math.round(peakB * tf.mult);
          }
        },
      };
    }

    // 9. ALL LIGHTS ON
    case 'all_lights_on':
    default: {
      const p = params as AllLightsOnParams;
      const b = Math.round((p.constantBrightness || 100) * 2.55);
      return {
        renderFrame(_t: number, target: Uint8Array) {
          target.fill(0);
          for (let i = 0; i < permittedFixtures.length; i++) {
            const f = permittedFixtures[i];
            target[f.index] = Math.round(b * f.mult);
          }
        },
      };
    }
  }
}
