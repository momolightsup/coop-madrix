import React from 'react';
import { Sparkles, Sliders, Layers, Video, FolderOpen, Bookmark } from 'lucide-react';
import { PatchData } from '../types';

interface HeaderProps {
  patch: PatchData | null;
  onOpenPatchManager: () => void;
  onOpenExclusions: () => void;
  onOpenPresets: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patch,
  onOpenPatchManager,
  onOpenExclusions,
  onOpenPresets,
  onOpenExport,
}) => {
  return (
    <header className="h-14 border-b border-studio-800 bg-studio-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 select-none z-10">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-studio-accentGlow to-studio-accent flex items-center justify-center shadow-lg shadow-studio-accent/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-semibold text-sm tracking-wide text-white">MADRIX LIGHT STUDIO</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-800 text-studio-accent font-mono">
              v1.0 • PRODUCTION
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {patch
              ? `${patch.filename} • ${patch.totalCount.toLocaleString()} Fixtures (${patch.bounds.width}×${patch.bounds.height} Area)`
              : 'No patch loaded'}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenPatchManager}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-studio-800 hover:bg-studio-700 text-slate-200 text-xs font-medium transition border border-studio-700"
        >
          <FolderOpen className="w-3.5 h-3.5 text-studio-accent" />
          <span>Patch Manager</span>
        </button>

        <button
          onClick={onOpenExclusions}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-studio-800 hover:bg-studio-700 text-slate-200 text-xs font-medium transition border border-studio-700"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Exclusions & Lines</span>
        </button>

        <button
          onClick={onOpenPresets}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-studio-800 hover:bg-studio-700 text-slate-200 text-xs font-medium transition border border-studio-700"
        >
          <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
          <span>Presets</span>
        </button>

        <div className="w-px h-5 bg-studio-800 mx-1" />

        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-studio-accent hover:from-sky-400 hover:to-sky-300 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Render MP4</span>
        </button>
      </div>
    </header>
  );
};
