import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { Viewport } from './components/Viewport';
import { Timeline } from './components/Timeline';
import { EffectControls } from './components/EffectControls';
import { ExclusionPanel } from './components/ExclusionPanel';
import { PatchManagerModal } from './components/PatchManagerModal';
import { ExportModal } from './components/ExportModal';
import { PresetsModal } from './components/PresetsModal';
import { createPreviewEngine } from './engine/previewEngine';
import {
  PatchData,
  VideoSettings,
  ExclusionFilters,
  EffectType,
  AnyEffectParams,
  Preset,
} from './types';

export const App: React.FC = () => {
  // 1. Core State
  const [patch, setPatch] = useState<PatchData | null>(null);
  const [settings, setSettings] = useState<VideoSettings>({
    canvasWidth: 2500,
    canvasHeight: 200,
    duration: 60,
    fps: 30,
    loop: true,
    randomSeed: 12345,
  });

  const [exclusions, setExclusions] = useState<ExclusionFilters>({
    disabledTypes: ['RGBW Light'], // Default: RG enabled, RGBW disabled
    excludeVerticalLines: false,
    verticalLineThreshold: 4,
    verticalLineSuppression: 100,
    customExcludedIds: [],
    exclusionZones: [],
  });

  const [effectType, setEffectType] = useState<EffectType>('diamond_glints');

  // Default parameters for each effect
  const [allParams, setAllParams] = useState<Record<EffectType, AnyEffectParams>>({
    diamond_glints: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0.1,
      fadeInMax: 0.35,
      fadeOutMin: 0.4,
      fadeOutMax: 1.6,
      brightnessMin: 40,
      brightnessMax: 100,
      isolatedDotBoost: 1.5,
      structureConcealment: 20,
      sparkleSize: 1,
    },
    christmas_sparkles: {
      speed: 1.0,
      amount: 1.2,
      fadeInMin: 0.1,
      fadeInMax: 0.4,
      fadeOutMin: 0.5,
      fadeOutMax: 1.8,
      brightnessMin: 50,
      brightnessMax: 100,
      isolatedDotBoost: 1.2,
      structureConcealment: 10,
      smallPct: 60,
      mediumPct: 30,
      largePct: 10,
      clusterRadius: 4,
    },
    gentle_snowfall: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0.2,
      fadeInMax: 0.5,
      fadeOutMin: 0.5,
      fadeOutMax: 1.2,
      brightnessMin: 30,
      brightnessMax: 90,
      isolatedDotBoost: 1.0,
      structureConcealment: 0,
      verticalSpeed: 1.2,
      horizontalDrift: 0.4,
      shimmerAmount: 0.5,
      upperConcentration: 60,
    },
    organic_fire: {
      speed: 1.0,
      amount: 1.2,
      fadeInMin: 0.1,
      fadeInMax: 0.4,
      fadeOutMin: 0.3,
      fadeOutMax: 1.5,
      brightnessMin: 50,
      brightnessMax: 100,
      isolatedDotBoost: 1.4,
      structureConcealment: 30,
      flickerSpeed: 1.0,
      flickerIrregularity: 0.7,
      upwardDrift: 50,
      bottomConcentration: 75,
    },
    rising_hearts: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0.5,
      fadeInMax: 1.0,
      fadeOutMin: 1.0,
      fadeOutMax: 2.0,
      brightnessMin: 80,
      brightnessMax: 100,
      isolatedDotBoost: 0.5,
      structureConcealment: 0,
      heartCount: 8,
      minHeartSize: 8,
      maxHeartSize: 20,
      minSpeed: 0.8,
      maxSpeed: 2.2,
      shapeReadabilityThreshold: 60,
    },
    stationary_hearts: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 1.0,
      fadeInMax: 1.5,
      fadeOutMin: 1.0,
      fadeOutMax: 2.0,
      brightnessMin: 90,
      brightnessMax: 100,
      isolatedDotBoost: 0.5,
      structureConcealment: 0,
      heartCount: 6,
      heartSize: 14,
      holdDuration: 4.0,
      positionQualityThreshold: 70,
    },
    musical_sparkles: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0.05,
      fadeInMax: 0.15,
      fadeOutMin: 0.2,
      fadeOutMax: 0.8,
      brightnessMin: 50,
      brightnessMax: 100,
      isolatedDotBoost: 1.0,
      structureConcealment: 20,
      tempoBpm: 120,
      voicesCount: 4,
      callResponseDelay: 1.0,
    },
    typography: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0.8,
      fadeInMax: 1.2,
      fadeOutMin: 0.8,
      fadeOutMax: 1.5,
      brightnessMin: 80,
      brightnessMax: 100,
      isolatedDotBoost: 0.2,
      structureConcealment: 0,
      text: 'LETZIPARK',
      fontSize: 28,
      strokeWidth: 2,
      textX: 300,
      textY: 100,
      holdDuration: 5.0,
    },
    all_lights_on: {
      speed: 1.0,
      amount: 1.0,
      fadeInMin: 0,
      fadeInMax: 0,
      fadeOutMin: 0,
      fadeOutMax: 0,
      brightnessMin: 100,
      brightnessMax: 100,
      isolatedDotBoost: 1.0,
      structureConcealment: 0,
      constantBrightness: 100,
    },
  });

  // Current active effect params
  const currentParams = allParams[effectType];
  const updateCurrentParams = (newP: AnyEffectParams) => {
    setAllParams((prev) => ({
      ...prev,
      [effectType]: newP,
    }));
  };

  // 2. Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // 3. Modals State
  const [isPatchManagerOpen, setIsPatchManagerOpen] = useState(false);
  const [isExclusionOpen, setIsExclusionOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // 4. Initial Boot: Load default Letzipark patch
  useEffect(() => {
    const fetchDefault = async () => {
      try {
        const res = await fetch('/api/patch/default');
        if (res.ok) {
          const data: PatchData = await res.json();
          setPatch(data);
        }
      } catch (err) {
        console.error('Failed to load default patch', err);
      }
    };
    fetchDefault();
  }, []);

  // 5. Build Preview Engine
  const previewEngine = useMemo(() => {
    if (!patch) return null;
    return createPreviewEngine(patch, settings, exclusions, effectType, currentParams);
  }, [patch, settings, exclusions, effectType, currentParams]);

  // 6. Keyboard Shortcuts (Space to play/pause, Left/Right to scrub 1 frame)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1 / settings.fps));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((t) => Math.min(settings.duration, t + 1 / settings.fps));
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        setCurrentTime(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.fps, settings.duration]);

  // Preset load handler
  const handleLoadPreset = (preset: Preset) => {
    setEffectType(preset.effectType);
    setAllParams((prev) => ({
      ...prev,
      [preset.effectType]: preset.params,
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-950 text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        patch={patch}
        onOpenPatchManager={() => setIsPatchManagerOpen(true)}
        onOpenExclusions={() => setIsExclusionOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Studio Center Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Interactive Façade Viewport */}
        <Viewport
          patch={patch}
          settings={settings}
          exclusions={exclusions}
          previewEngine={previewEngine}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
        />

        {/* Right Parameters Sidebar */}
        <EffectControls
          effectType={effectType}
          onChangeEffectType={setEffectType}
          params={currentParams}
          onChangeParams={updateCurrentParams}
        />
      </div>

      {/* Bottom Timeline */}
      <Timeline
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onRestart={() => setCurrentTime(0)}
        currentTime={currentTime}
        onSeek={(t) => setCurrentTime(t)}
        settings={settings}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        onToggleLoop={() => setSettings((s) => ({ ...s, loop: !s.loop }))}
      />

      {/* Modals */}
      <PatchManagerModal
        isOpen={isPatchManagerOpen}
        onClose={() => setIsPatchManagerOpen(false)}
        currentPatch={patch}
        onPatchLoaded={(newPatch) => {
          setPatch(newPatch);
          // Set canvas dimensions based on bounds if custom
          if (newPatch.bounds.maxX >= settings.canvasWidth) {
            setSettings((s) => ({ ...s, canvasWidth: Math.ceil(newPatch.bounds.maxX / 100) * 100 }));
          }
        }}
      />

      <ExclusionPanel
        isOpen={isExclusionOpen}
        onClose={() => setIsExclusionOpen(false)}
        patch={patch}
        exclusions={exclusions}
        onChangeExclusions={setExclusions}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        patch={patch}
        settings={settings}
        onChangeSettings={setSettings}
        exclusions={exclusions}
        effectType={effectType}
        params={currentParams}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        currentEffectType={effectType}
        currentParams={currentParams}
        onLoadPreset={handleLoadPreset}
      />
    </div>
  );
};
