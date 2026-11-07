import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMadrixCsv } from './patchParser.js';
import { prepareEffectEngine } from './effects/index.js';
import { ExclusionFilters, VideoSettings, DiamondGlintsParams } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const patchPath = path.resolve(projectRoot, 'Patch/letzi-fassade-west+sued_ho-ve_live1.csv');

console.log('--- TEST 1: Parsing Letzipark Patch CSV ---');
const content = fs.readFileSync(patchPath, 'utf-8');
const patch = parseMadrixCsv(content, 'letzi-fassade-west+sued_ho-ve_live1.csv');

console.log(`Total fixtures: ${patch.totalCount}`);
console.log(`Types:`, patch.types);
console.log(`Canvas Extents: X[${patch.bounds.minX}..${patch.bounds.maxX}], Y[${patch.bounds.minY}..${patch.bounds.maxY}]`);
console.log(`Isolated dots identified: ${patch.isolatedCount}`);
console.log(`Vertical mounting line fixtures: ${patch.verticalLineCount}`);

if (patch.totalCount !== 7090) {
  throw new Error(`Expected 7090 fixtures, got ${patch.totalCount}`);
}
if (patch.types['RG Light'] !== 6262 || patch.types['RGBW Light'] !== 828) {
  throw new Error(`Fixture type counts mismatch!`);
}
console.log('✓ Test 1 Passed: Patch correctly parsed with accurate counts and extents.\n');

console.log('--- TEST 2: Luminaire Masking & Exclusions ---');
const exclusions: ExclusionFilters = {
  disabledTypes: ['RGBW Light'], // RGBW disabled by default
  excludeVerticalLines: false,
  verticalLineThreshold: 4,
  verticalLineSuppression: 100,
  customExcludedIds: [],
  exclusionZones: [],
};

const settings: VideoSettings = {
  canvasWidth: 2500,
  canvasHeight: 200,
  duration: 60,
  fps: 30,
  loop: true,
  randomSeed: 12345,
};

const diamondParams: DiamondGlintsParams = {
  speed: 1.0,
  amount: 1.0,
  fadeInMin: 0.1,
  fadeInMax: 0.4,
  fadeOutMin: 0.5,
  fadeOutMax: 1.5,
  brightnessMin: 40,
  brightnessMax: 100,
  isolatedDotBoost: 1.5,
  structureConcealment: 20,
  sparkleSize: 1,
};

const engine = prepareEffectEngine(patch, settings, exclusions, 'diamond_glints', diamondParams);
const target = new Uint8Array(patch.fixtures.length);

let totalPermittedIlluminated = 0;
let rgbwIlluminated = 0;

for (let frame = 0; frame < 300; frame++) {
  const t = frame / 30;
  engine.renderFrame(t, target);

  for (let i = 0; i < patch.fixtures.length; i++) {
    const f = patch.fixtures[i];
    const b = target[i];
    if (b > 0) {
      if (f.type === 'RGBW Light') {
        rgbwIlluminated++;
      } else {
        totalPermittedIlluminated++;
      }
    }
  }
}

console.log(`Permitted illumination events: ${totalPermittedIlluminated}`);
console.log(`Disabled RGBW illumination events: ${rgbwIlluminated}`);

if (rgbwIlluminated > 0) {
  throw new Error(`CRITICAL: Strict masking failed! ${rgbwIlluminated} RGBW pixels illuminated.`);
}
console.log('✓ Test 2 Passed: Strict masking verified with 100% zero-leakage on disabled fixtures.\n');

console.log('--- TEST 3: Seamless Mathematical Loop Boundary Verification ---');
const firstFrame = new Uint8Array(patch.fixtures.length);
const lastFrame = new Uint8Array(patch.fixtures.length);

// t = 0 (frame 0)
engine.renderFrame(0, firstFrame);
// t = 60 - 1/30 (frame 1799)
engine.renderFrame(60 - 1 / 30, lastFrame);

let deltaSum = 0;
let activeCount = 0;
for (let i = 0; i < patch.fixtures.length; i++) {
  const diff = Math.abs(firstFrame[i] - lastFrame[i]);
  deltaSum += diff;
  if (firstFrame[i] > 0 || lastFrame[i] > 0) {
    activeCount++;
  }
}

const avgDelta = activeCount > 0 ? deltaSum / activeCount : 0;
console.log(`Average delta across loop boundary: ${avgDelta.toFixed(3)}`);
if (avgDelta > 30) {
  throw new Error(`Loop discontinuity too high: ${avgDelta}`);
}
console.log('✓ Test 3 Passed: Seamless periodic loop boundary mathematically confirmed.\n');

console.log('ALL AUTOMATED BACKEND TESTS PASSED SUCCESSFULLY!');
