export interface Fixture {
  id: string;
  identifier: number;
  x: number;
  y: number;
  z?: number;
  type: string;
  displayName: string;
  universe: number;
  channel: number;
  group: string;
  isIsolated: boolean;
  verticalColumnX?: number;
  isInVerticalLine: boolean;
}

export interface PatchBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PatchData {
  filename: string;
  totalCount: number;
  fixtures: Fixture[];
  types: Record<string, number>;
  bounds: PatchBounds;
  warnings: string[];
  isolatedCount: number;
  verticalLineCount: number;
}

export interface ExclusionFilters {
  disabledTypes: string[];
  excludeVerticalLines: boolean;
  verticalLineThreshold: number; // min number of fixtures with same X to count as line
  verticalLineSuppression: number; // 0 to 100 (%)
  customExcludedIds: string[];
  exclusionZones: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
}

export interface VideoSettings {
  canvasWidth: number;
  canvasHeight: number;
  duration: number; // in seconds
  fps: number;
  loop: boolean;
  randomSeed: number;
}

export type EffectType =
  | 'diamond_glints'
  | 'christmas_sparkles'
  | 'gentle_snowfall'
  | 'organic_fire'
  | 'rising_hearts'
  | 'stationary_hearts'
  | 'musical_sparkles'
  | 'typography'
  | 'all_lights_on';

export interface BaseEffectParams {
  speed: number;
  amount: number;
  fadeInMin: number;
  fadeInMax: number;
  fadeOutMin: number;
  fadeOutMax: number;
  brightnessMin: number;
  brightnessMax: number;
  isolatedDotBoost: number;
  structureConcealment: number;
}

export interface DiamondGlintsParams extends BaseEffectParams {
  sparkleSize: number;
}

export interface ChristmasSparklesParams extends BaseEffectParams {
  smallPct: number;
  mediumPct: number;
  largePct: number;
  clusterRadius: number;
}

export interface GentleSnowfallParams extends BaseEffectParams {
  verticalSpeed: number;
  horizontalDrift: number;
  shimmerAmount: number;
  upperConcentration: number; // 0 to 100
}

export interface OrganicFireParams extends BaseEffectParams {
  flickerSpeed: number;
  flickerIrregularity: number;
  upwardDrift: number;
  bottomConcentration: number; // 0 to 100
}

export interface RisingHeartsParams extends BaseEffectParams {
  heartCount: number;
  minHeartSize: number;
  maxHeartSize: number;
  minSpeed: number;
  maxSpeed: number;
  shapeReadabilityThreshold: number;
}

export interface StationaryHeartsParams extends BaseEffectParams {
  heartCount: number;
  heartSize: number;
  holdDuration: number;
  positionQualityThreshold: number;
}

export interface MusicalSparklesParams extends BaseEffectParams {
  tempoBpm: number;
  voicesCount: number;
  callResponseDelay: number;
}

export interface TypographyParams extends BaseEffectParams {
  text: string;
  fontSize: number;
  strokeWidth: number;
  textX: number;
  textY: number;
  holdDuration: number;
}

export interface AllLightsOnParams extends BaseEffectParams {
  constantBrightness: number;
}

export type AnyEffectParams =
  | DiamondGlintsParams
  | ChristmasSparklesParams
  | GentleSnowfallParams
  | OrganicFireParams
  | RisingHeartsParams
  | StationaryHeartsParams
  | MusicalSparklesParams
  | TypographyParams
  | AllLightsOnParams;

export interface ProjectState {
  id: string;
  name: string;
  patch: PatchData | null;
  videoSettings: VideoSettings;
  exclusions: ExclusionFilters;
  effectType: EffectType;
  params: Record<EffectType, AnyEffectParams>;
  activePresetName?: string;
}

export interface RenderJobStatus {
  id: string;
  status: 'idle' | 'rendering' | 'validating' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  fps: number;
  outputFilePath?: string;
  outputFileName?: string;
  fileSizeBytes?: number;
  error?: string;
  validationReport?: ValidationReport;
}

export interface ValidationReport {
  isValid: boolean;
  width: number;
  height: number;
  duration: number;
  fps: number;
  totalFrames: number;
  codec: string;
  pixelFormat: string;
  zeroLeakagePassed: boolean;
  maxLeakBrightness: number;
  loopContinuityDelta: number;
  loopSeamlessPassed: boolean;
  warnings: string[];
}
