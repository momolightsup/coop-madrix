import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { PatchData, VideoSettings, ExclusionFilters, Fixture } from '../types';
import { isFixturePermitted, PreparedPreviewEngine, clamp } from '../engine/previewEngine';

interface ViewportProps {
  patch: PatchData | null;
  settings: VideoSettings;
  exclusions: ExclusionFilters;
  previewEngine: PreparedPreviewEngine | null;
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

export type DisplayMode = 'preview' | 'layout' | 'allowed' | 'heatmap';

export const Viewport: React.FC<ViewportProps> = ({
  patch,
  settings,
  exclusions,
  previewEngine,
  isPlaying,
  playbackSpeed,
  currentTime,
  onTimeUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<DisplayMode>('preview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredFixture, setHoveredFixture] = useState<Fixture | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // References for high-performance 60fps render loop
  const timeRef = useRef<number>(currentTime);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const playbackSpeedRef = useRef<number>(playbackSpeed);
  const previewEngineRef = useRef<PreparedPreviewEngine | null>(previewEngine);
  const exclusionsRef = useRef<ExclusionFilters>(exclusions);
  const patchRef = useRef<PatchData | null>(patch);
  const settingsRef = useRef<VideoSettings>(settings);
  const modeRef = useRef<DisplayMode>(mode);
  const zoomRef = useRef<number>(zoom);
  const panRef = useRef<{ x: number; y: number }>(pan);

  // Synchronously update refs on every render
  timeRef.current = currentTime;
  isPlayingRef.current = isPlaying;
  playbackSpeedRef.current = playbackSpeed;
  previewEngineRef.current = previewEngine;
  exclusionsRef.current = exclusions;
  patchRef.current = patch;
  settingsRef.current = settings;
  modeRef.current = mode;
  zoomRef.current = zoom;
  panRef.current = pan;

  // Heatmap accumulator
  const heatmapAccumulator = useRef<Float32Array | null>(null);
  const fixtureBufferRef = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    if (patch) {
      heatmapAccumulator.current = new Float32Array(patch.fixtures.length);
      fixtureBufferRef.current = new Uint8Array(patch.fixtures.length);
    }
  }, [patch]);

  // Fit to screen helper
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !patch) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 30;
    const availWidth = Math.max(100, clientWidth - padding * 2);
    const availHeight = Math.max(100, clientHeight - padding * 2);

    const scaleX = availWidth / settings.canvasWidth;
    const scaleY = availHeight / settings.canvasHeight;
    const newZoom = Math.min(scaleX, scaleY);

    setZoom(newZoom);
    setPan({
      x: (clientWidth - settings.canvasWidth * newZoom) / 2,
      y: (clientHeight - settings.canvasHeight * newZoom) / 2,
    });
  }, [patch, settings.canvasWidth, settings.canvasHeight]);

  // Auto-fit on initial patch load
  useEffect(() => {
    if (patch) {
      fitToScreen();
    }
  }, [patch, fitToScreen]);

  // Continuous 60 FPS Canvas Render Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastTimelineUpdate = 0;

    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const p = patchRef.current;
      const s = settingsRef.current;
      const currentMode = modeRef.current;
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const curExclusions = exclusionsRef.current;
      const engine = previewEngineRef.current;
      const canvas = canvasRef.current;

      // Update time if playing
      if (isPlayingRef.current && dt > 0 && dt < 0.5) {
        let nextT = timeRef.current + dt * playbackSpeedRef.current;
        if (nextT >= s.duration) {
          nextT = s.loop ? nextT % s.duration : s.duration;
        }
        timeRef.current = nextT;

        // Throttled update to parent timeline (~20 fps) so React is not flooded
        if (now - lastTimelineUpdate > 50) {
          lastTimelineUpdate = now;
          onTimeUpdate(nextT);
        }
      }

      // Render to canvas
      if (canvas && p && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear viewport background
          ctx.fillStyle = '#07090e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          ctx.translate(curPan.x, curPan.y);
          ctx.scale(curZoom, curZoom);

          // Draw Canvas Frame (2500 x 200)
          ctx.fillStyle = '#030508';
          ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1 / curZoom;
          ctx.strokeRect(0, 0, s.canvasWidth, s.canvasHeight);

          // Compute effect illumination if in preview or heatmap mode
          const buf = fixtureBufferRef.current;
          if (engine && buf.length === p.fixtures.length) {
            engine.renderFrame(timeRef.current, buf);

            if (currentMode === 'heatmap' && heatmapAccumulator.current) {
              for (let i = 0; i < buf.length; i++) {
                if (buf[i] > 0) {
                  heatmapAccumulator.current[i] += buf[i] / 255;
                }
              }
            }
          }

          const fixtures = p.fixtures;
          // Scale-independent visible point sizing
          const pointRadius = Math.max(1.2, 1.8 / Math.sqrt(curZoom));
          const glowRadius = pointRadius * 2.2;

          for (let i = 0; i < fixtures.length; i++) {
            const f = fixtures[i];
            const permitted = isFixturePermitted(f, curExclusions);

            if (currentMode === 'preview') {
              const b = buf.length > 0 ? buf[i] : 0;
              if (b > 0) {
                // Active luminaire: soft halo + intense white center
                ctx.fillStyle = `rgba(${b},${b},${b}, 0.35)`;
                ctx.fillRect(f.x - glowRadius, f.y - glowRadius, glowRadius * 2, glowRadius * 2);

                ctx.fillStyle = `rgb(${b},${b},${b})`;
                ctx.fillRect(f.x - pointRadius, f.y - pointRadius, pointRadius * 2, pointRadius * 2);
              } else {
                // Inactive fixture point
                if (permitted) {
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(f.x - 0.7, f.y - 0.7, 1.4, 1.4);
                } else {
                  ctx.fillStyle = '#0f172a';
                  ctx.fillRect(f.x - 0.5, f.y - 0.5, 1.0, 1.0);
                }
              }
            } else if (currentMode === 'layout') {
              if (f.type.includes('RGBW')) {
                ctx.fillStyle = '#f59e0b';
              } else if (f.type.includes('RG')) {
                ctx.fillStyle = '#38bdf8';
              } else {
                ctx.fillStyle = '#10b981';
              }
              ctx.fillRect(f.x - pointRadius, f.y - pointRadius, pointRadius * 2, pointRadius * 2);
            } else if (currentMode === 'allowed') {
              if (permitted) {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(f.x - pointRadius, f.y - pointRadius, pointRadius * 2, pointRadius * 2);
              } else {
                ctx.fillStyle = '#ef444455';
                ctx.fillRect(f.x - 0.6, f.y - 0.6, 1.2, 1.2);
              }
            } else if (currentMode === 'heatmap') {
              const heat = heatmapAccumulator.current ? heatmapAccumulator.current[i] : 0;
              const norm = Math.min(1, heat / 20);
              if (norm > 0) {
                const r = Math.round(norm * 255);
                const g = Math.round((1 - Math.abs(norm - 0.5) * 2) * 255);
                const blue = Math.round((1 - norm) * 200);
                ctx.fillStyle = `rgb(${r},${g},${blue})`;
                ctx.fillRect(f.x - pointRadius, f.y - pointRadius, pointRadius * 2, pointRadius * 2);
              } else {
                ctx.fillStyle = '#111827';
                ctx.fillRect(f.x - 0.6, f.y - 0.6, 1.2, 1.2);
              }
            }
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [onTimeUpdate]);

  // Pan & Zoom Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }

    if (!containerRef.current || !patch) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasX = Math.round((mouseX - pan.x) / zoom);
    const canvasY = Math.round((mouseY - pan.y) / zoom);

    let found: Fixture | null = null;
    const threshold = Math.max(3, 8 / zoom);

    for (let i = 0; i < patch.fixtures.length; i++) {
      const f = patch.fixtures[i];
      if (Math.abs(f.x - canvasX) <= threshold && Math.abs(f.y - canvasY) <= threshold) {
        found = f;
        break;
      }
    }

    setHoveredFixture(found);
    setHoverPos({ x: mouseX + 15, y: mouseY + 15 });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = clamp(zoom * zoomFactor, 0.1, 50);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Resize canvas when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-studio-950 overflow-hidden cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Display Mode Toggle */}
      <div className="absolute top-3 left-4 flex items-center space-x-2 bg-studio-900/80 backdrop-blur border border-studio-800 rounded-lg p-1 text-xs">
        <button
          onClick={() => setMode('preview')}
          className={`px-2.5 py-1 rounded font-medium transition ${
            mode === 'preview'
              ? 'bg-studio-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Animation Preview
        </button>
        <button
          onClick={() => setMode('layout')}
          className={`px-2.5 py-1 rounded font-medium transition ${
            mode === 'layout'
              ? 'bg-studio-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Physical Layout
        </button>
        <button
          onClick={() => setMode('allowed')}
          className={`px-2.5 py-1 rounded font-medium transition ${
            mode === 'allowed'
              ? 'bg-studio-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Allowed Luminaires
        </button>
        <button
          onClick={() => setMode('heatmap')}
          className={`px-2.5 py-1 rounded font-medium transition ${
            mode === 'heatmap'
              ? 'bg-studio-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Activity Heatmap
        </button>
      </div>

      {/* Zoom / Navigation Widget */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-studio-900/80 backdrop-blur border border-studio-800 rounded-lg p-1 text-xs text-slate-300">
        <span className="font-mono text-[11px] px-2 text-slate-400">
          {(zoom * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => setZoom((z) => clamp(z * 1.25, 0.1, 50))}
          className="p-1.5 hover:bg-studio-800 rounded text-slate-300 hover:text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => clamp(z * 0.8, 0.1, 50))}
          className="p-1.5 hover:bg-studio-800 rounded text-slate-300 hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-1.5 hover:bg-studio-800 rounded text-slate-300 hover:text-white"
          title="Fit to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 50, y: 50 });
          }}
          className="p-1.5 hover:bg-studio-800 rounded text-slate-300 hover:text-white"
          title="Reset (100%)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fixture Inspection Tooltip */}
      {hoveredFixture && (
        <div
          className="absolute pointer-events-none bg-studio-900/95 backdrop-blur border border-studio-700 text-slate-200 text-xs p-2.5 rounded-lg shadow-xl z-20 font-mono"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="flex items-center space-x-2 font-semibold text-white">
            <span className="text-studio-accent">{hoveredFixture.displayName}</span>
            <span className="text-[10px] px-1 rounded bg-studio-800 text-slate-300">
              ID: {hoveredFixture.id}
            </span>
          </div>
          <div className="mt-1 space-y-0.5 text-[11px] text-slate-400">
            <div>
              Position: <span className="text-white">X={hoveredFixture.x}, Y={hoveredFixture.y}</span>
            </div>
            <div>
              Type: <span className="text-amber-300">{hoveredFixture.type}</span>
            </div>
            <div>
              DMX: Univ {hoveredFixture.universe}, Chan {hoveredFixture.channel}
            </div>
            <div className="flex items-center space-x-1.5 pt-1">
              {hoveredFixture.isIsolated && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                  Isolated Dot
                </span>
              )}
              {hoveredFixture.isInVerticalLine && (
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px]">
                  Vertical Strip
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
