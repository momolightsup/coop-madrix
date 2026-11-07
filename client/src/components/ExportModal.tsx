import React, { useState, useEffect } from 'react';
import { X, Video, Download, CheckCircle2, AlertCircle, Loader2, Play } from 'lucide-react';
import { PatchData, VideoSettings, ExclusionFilters, EffectType, AnyEffectParams, RenderJobStatus } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patch: PatchData | null;
  settings: VideoSettings;
  onChangeSettings: (newSettings: VideoSettings) => void;
  exclusions: ExclusionFilters;
  effectType: EffectType;
  params: AnyEffectParams;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  patch,
  settings,
  onChangeSettings,
  exclusions,
  effectType,
  params,
}) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<RenderJobStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll render status
  useEffect(() => {
    if (!jobId || !isOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/render/status/${jobId}`);
        if (res.ok) {
          const data: RenderJobStatus = await res.json();
          setJobStatus(data);
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [jobId, isOpen]);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    if (!patch) return;
    setIsStarting(true);
    setError(null);
    setJobStatus(null);

    try {
      const res = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patch,
          videoSettings: settings,
          exclusions,
          effectType,
          params,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setJobId(data.id);
        setJobStatus(data);
      } else {
        setError(data.error || 'Failed to start render');
      }
    } catch (err: any) {
      setError(err.message || 'Render request failed');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    await fetch(`/api/render/cancel/${jobId}`, { method: 'POST' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-studio-900 border border-studio-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-studio-accent" />
            <h2 className="text-sm font-semibold text-white">Export Video for MADRIX 5</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-studio-800 rounded-md text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Render Specifications Card */}
          <div className="bg-studio-850 p-4 rounded-lg border border-studio-800 space-y-3">
            <h3 className="text-xs font-semibold text-white">Video Project Settings</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Canvas Width (px)</label>
                <input
                  type="number"
                  value={settings.canvasWidth}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, canvasWidth: parseInt(e.target.value) || 2500 })
                  }
                  className="w-full bg-studio-800 border border-studio-700 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Canvas Height (px)</label>
                <input
                  type="number"
                  value={settings.canvasHeight}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, canvasHeight: parseInt(e.target.value) || 200 })
                  }
                  className="w-full bg-studio-800 border border-studio-700 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Duration (Seconds)</label>
                <select
                  value={settings.duration}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, duration: parseInt(e.target.value) || 60 })
                  }
                  className="w-full bg-studio-800 border border-studio-700 rounded px-2 py-1 text-white font-mono"
                >
                  <option value={10}>10 Seconds (Diagnostic test)</option>
                  <option value={30}>30 Seconds (900 frames)</option>
                  <option value={60}>60 Seconds (1,800 frames • Standard)</option>
                  <option value={120}>120 Seconds (3,600 frames)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Frame Rate</label>
                <input
                  type="text"
                  disabled
                  value={`${settings.fps} FPS (Standard)`}
                  className="w-full bg-studio-800/60 border border-studio-800 rounded px-2.5 py-1 text-slate-400 font-mono"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
              <span>Encoding: H.264 High Profile • yuv420p (MADRIX 5 Compatible)</span>
              <span className="font-mono text-studio-accent">
                {Math.round(settings.duration * settings.fps)} Total Frames
              </span>
            </div>
          </div>

          {/* Active Render Progress */}
          {jobStatus && (
            <div className="bg-studio-850 p-4 rounded-lg border border-studio-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {jobStatus.status === 'rendering' && (
                    <Loader2 className="w-4 h-4 text-studio-accent animate-spin" />
                  )}
                  {jobStatus.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-xs font-semibold text-white capitalize">
                    {jobStatus.status === 'rendering'
                      ? 'Generating & Streaming Frames to FFmpeg...'
                      : jobStatus.status === 'validating'
                      ? 'Validating Video Stream...'
                      : jobStatus.status === 'completed'
                      ? 'Render Complete & Verified!'
                      : `Status: ${jobStatus.status}`}
                  </span>
                </div>
                <span className="font-mono text-xs text-studio-accent font-semibold">
                  {jobStatus.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-studio-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-studio-accent transition-all duration-300"
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>
                  Frame {jobStatus.currentFrame} / {jobStatus.totalFrames}
                </span>
                {jobStatus.status === 'rendering' && (
                  <button
                    onClick={handleCancel}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Cancel Render
                  </button>
                )}
              </div>

              {/* Validation Report */}
              {jobStatus.validationReport && (
                <div className="pt-3 border-t border-studio-800 space-y-1.5 text-[11px]">
                  <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Technical Quality Control Report</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-slate-400 font-mono text-[10px]">
                    <div>Resolution: {jobStatus.validationReport.width}×{jobStatus.validationReport.height}</div>
                    <div>Duration: {jobStatus.validationReport.duration}s ({jobStatus.validationReport.fps} fps)</div>
                    <div>Zero Leakage: {jobStatus.validationReport.zeroLeakagePassed ? 'PASSED (0 leaks)' : 'FAILED'}</div>
                    <div>Loop Continuity: {jobStatus.validationReport.loopSeamlessPassed ? 'PASSED (Seamless)' : 'Warning'}</div>
                    <div>Codec: {jobStatus.validationReport.codec}</div>
                    <div>File Size: {jobStatus.fileSizeBytes ? (jobStatus.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              {jobStatus.status === 'completed' && jobStatus.outputFileName && (
                <a
                  href={`/api/render/download/${jobStatus.outputFileName}`}
                  download={jobStatus.outputFileName}
                  className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Finished MP4 Video</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-800 bg-studio-950 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md hover:bg-studio-800 text-slate-300 text-xs transition"
          >
            Close
          </button>
          {(!jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed') && (
            <button
              onClick={handleStartRender}
              disabled={isStarting || !patch}
              className="px-5 py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-studio-accent hover:from-sky-400 hover:to-sky-300 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition disabled:opacity-50"
            >
              {isStarting ? 'Starting...' : 'Start Full MP4 Render'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
