import React from 'react';
import { X, Layers, AlertCircle, EyeOff, CheckSquare, Square } from 'lucide-react';
import { PatchData, ExclusionFilters } from '../types';

interface ExclusionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  patch: PatchData | null;
  exclusions: ExclusionFilters;
  onChangeExclusions: (newExclusions: ExclusionFilters) => void;
}

export const ExclusionPanel: React.FC<ExclusionPanelProps> = ({
  isOpen,
  onClose,
  patch,
  exclusions,
  onChangeExclusions,
}) => {
  if (!isOpen) return null;

  const toggleType = (typeName: string) => {
    const isCurrentlyDisabled = exclusions.disabledTypes.includes(typeName);
    const newDisabled = isCurrentlyDisabled
      ? exclusions.disabledTypes.filter((t) => t !== typeName)
      : [...exclusions.disabledTypes, typeName];

    onChangeExclusions({
      ...exclusions,
      disabledTypes: newDisabled,
    });
  };

  const toggleVerticalLines = () => {
    onChangeExclusions({
      ...exclusions,
      excludeVerticalLines: !exclusions.excludeVerticalLines,
    });
  };

  const setVerticalSuppression = (val: number) => {
    onChangeExclusions({
      ...exclusions,
      verticalLineSuppression: val,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-studio-900 border border-studio-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Luminaire Masking & Exclusions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-studio-800 rounded-md text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* 1. Fixture Type Filtering */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
              1. Permitted Fixture Types
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Only checked types may illuminate. Unchecked types remain strictly black (0,0,0) in all frames.
            </p>

            {patch ? (
              <div className="space-y-2">
                {Object.entries(patch.types).map(([typeName, count]) => {
                  const isEnabled = !exclusions.disabledTypes.includes(typeName);
                  return (
                    <div
                      key={typeName}
                      onClick={() => toggleType(typeName)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition select-none ${
                        isEnabled
                          ? 'bg-studio-850 border-studio-700 hover:border-studio-600'
                          : 'bg-studio-950/60 border-studio-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isEnabled ? (
                          <CheckSquare className="w-4 h-4 text-studio-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                        <div>
                          <div className="text-xs font-medium text-white">{typeName}</div>
                          <div className="text-[10px] text-slate-400">
                            {count.toLocaleString()} fixtures in patch
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No patch currently loaded</div>
            )}
          </div>

          {/* 2. Vertical Mounting Lines Concealment */}
          <div className="border-t border-studio-800 pt-5">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
              2. Architectural Vertical Line Masking
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Automatically identifies luminaires aligned along the same vertical column (mounting strips). Use this to prevent vertical lines from becoming visible.
            </p>

            <div className="bg-studio-850 p-4 rounded-lg border border-studio-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">
                    Mask / Conceal Vertical Strips
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {patch
                      ? `${patch.verticalLineCount.toLocaleString()} fixtures detected in vertical alignment`
                      : 'Detects fixtures on shared X coordinates'}
                  </div>
                </div>

                <button
                  onClick={toggleVerticalLines}
                  className={`w-11 h-6 rounded-full transition relative p-0.5 ${
                    exclusions.excludeVerticalLines ? 'bg-studio-accent' : 'bg-studio-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      exclusions.excludeVerticalLines ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {exclusions.excludeVerticalLines && (
                <div className="pt-2 border-t border-studio-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Suppression Level:</span>
                    <span className="font-mono text-studio-accent font-medium">
                      {exclusions.verticalLineSuppression}%{' '}
                      {exclusions.verticalLineSuppression === 100 ? '(Completely Off)' : '(Dimmed)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={10}
                    value={exclusions.verticalLineSuppression}
                    onChange={(e) => setVerticalSuppression(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-studio-800 rounded appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Soft Concealment (20%)</span>
                    <span>100% Pure Black</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-800 bg-studio-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-studio-accent hover:bg-sky-400 text-white text-xs font-semibold transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
