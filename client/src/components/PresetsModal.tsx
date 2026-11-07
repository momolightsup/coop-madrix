import React, { useState, useEffect } from 'react';
import { X, Bookmark, Plus, Download, Upload, Trash2, Check } from 'lucide-react';
import { EffectType, AnyEffectParams, Preset } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEffectType: EffectType;
  currentParams: AnyEffectParams;
  onLoadPreset: (preset: Preset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  currentEffectType,
  currentParams,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load presets from server
  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error('Failed to load presets', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    setLoading(true);

    const preset: Preset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      effectType: currentEffectType,
      params: currentParams,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      });
      if (res.ok) {
        setNewPresetName('');
        fetchPresets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `madrix_presets_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-studio-900 border border-studio-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Lighting Effect Presets</h2>
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
          {/* Save current as new preset */}
          <div className="bg-studio-850 p-3.5 rounded-lg border border-studio-800 space-y-2">
            <label className="text-xs font-semibold text-white block">
              Save Current Effect Configuration
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. Diamond Glints - Subtle White"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 bg-studio-800 border border-studio-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500"
              />
              <button
                onClick={handleSavePreset}
                disabled={loading || !newPresetName.trim()}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded font-medium text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Preset List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Saved Presets ({presets.length})
              </span>
              {presets.length > 0 && (
                <button
                  onClick={handleExportJson}
                  className="flex items-center space-x-1 text-[11px] text-studio-accent hover:underline"
                >
                  <Download className="w-3 h-3" />
                  <span>Export JSON</span>
                </button>
              )}
            </div>

            {presets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-studio-950/40 rounded-lg border border-studio-800/60">
                No saved presets yet. Customize an effect and click Save to create your first preset!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {presets.map((preset) => (
                  <div
                    key={preset.id || preset.name}
                    className="p-3 bg-studio-850 hover:bg-studio-800 rounded-lg border border-studio-800 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {preset.effectType.replace('_', ' ')} • Speed: {preset.params.speed}x • Amount: {preset.params.amount}x
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onLoadPreset(preset);
                        onClose();
                      }}
                      className="px-3 py-1 bg-studio-700 hover:bg-studio-600 text-white rounded text-xs font-medium transition"
                    >
                      Load
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-studio-800 bg-studio-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md hover:bg-studio-800 text-slate-300 text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
