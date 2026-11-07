import React, { useState } from 'react';
import { X, FolderOpen, Upload, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { PatchData } from '../types';

interface PatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatch: PatchData | null;
  onPatchLoaded: (patch: PatchData) => void;
}

export const PatchManagerModal: React.FC<PatchManagerModalProps> = ({
  isOpen,
  onClose,
  currentPatch,
  onPatchLoaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState<string>(';');
  const [mapping, setMapping] = useState({
    xCol: 'Position X',
    yCol: 'Position Y',
    typeCol: 'Fixture',
    idCol: 'Identifier',
    nameCol: 'Display Name',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);

    // Inspect headers
    const formData = new FormData();
    formData.append('patchFile', file);
    try {
      const res = await fetch('/api/patch/inspect', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setDelimiter(data.delimiter);
        setDetectedHeaders(data.headers);

        // Pre-match columns
        const headers = data.headers as string[];
        const findMatch = (cands: string[]) =>
          headers.find((h) => cands.some((c) => h.toLowerCase().includes(c))) || '';

        setMapping({
          xCol: findMatch(['position x', 'pos x', 'x']) || headers[0] || '',
          yCol: findMatch(['position y', 'pos y', 'y']) || headers[1] || '',
          typeCol: findMatch(['fixture', 'type', 'model']) || headers[2] || '',
          idCol: findMatch(['identifier', 'id', 'index']) || headers[3] || '',
          nameCol: findMatch(['display name', 'name', 'label']) || '',
        });
      }
    } catch (err: any) {
      setError('Failed to inspect file headers');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('patchFile', selectedFile);
    formData.append('delimiter', delimiter);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const res = await fetch('/api/patch/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onPatchLoaded(data);
        onClose();
      } else {
        setError(data.error || 'Failed to parse patch file');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/patch/default');
      const data = await res.json();
      if (res.ok) {
        onPatchLoaded(data);
        onClose();
      } else {
        setError(data.error || 'Failed to load default patch');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading default patch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-studio-900 border border-studio-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-studio-accent" />
            <h2 className="text-sm font-semibold text-white">MADRIX Patch Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-studio-800 rounded-md text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Active Patch Card */}
          {currentPatch && (
            <div className="bg-studio-850 p-3.5 rounded-lg border border-studio-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Active Patch: {currentPatch.filename}</span>
                </span>
                <span className="text-[10px] font-mono text-studio-accent bg-studio-800 px-2 py-0.5 rounded">
                  {currentPatch.totalCount.toLocaleString()} Fixtures
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  Area Extents: <span className="text-slate-200">{currentPatch.bounds.width}×{currentPatch.bounds.height} px</span>
                </div>
                <div>
                  Isolated Dots: <span className="text-amber-400 font-medium">{currentPatch.isolatedCount}</span>
                </div>
                <div>
                  Vertical Strips: <span className="text-sky-400 font-medium">{currentPatch.verticalLineCount}</span>
                </div>
                <div>
                  Types:{' '}
                  {Object.entries(currentPatch.types)
                    .map(([t, c]) => `${t}: ${c}`)
                    .join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Upload New Patch Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Import New CSV Patch
            </h3>

            <div className="border-2 border-dashed border-studio-700 hover:border-studio-500 rounded-lg p-5 text-center transition cursor-pointer bg-studio-950/40 relative">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-studio-accent mx-auto mb-2" />
              <div className="text-xs font-medium text-slate-200">
                {selectedFile ? selectedFile.name : 'Click or drag a MADRIX patch CSV here'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Supports semicolon (;) or comma (,) separated CSV with UTF-8
              </div>
            </div>
          </div>

          {/* Configurable Column Mapping (When file selected) */}
          {detectedHeaders.length > 0 && (
            <div className="bg-studio-850 p-4 rounded-lg border border-studio-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">CSV Column Mapping</span>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Separator:</span>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="bg-studio-800 border border-studio-700 text-white rounded px-2 py-0.5 text-xs font-mono"
                  >
                    <option value=";">Semicolon (;)</option>
                    <option value=",">Comma (,)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Position X Column</label>
                  <select
                    value={mapping.xCol}
                    onChange={(e) => setMapping({ ...mapping, xCol: e.target.value })}
                    className="w-full bg-studio-800 border border-studio-700 rounded px-2 py-1 text-slate-200"
                  >
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Position Y Column</label>
                  <select
                    value={mapping.yCol}
                    onChange={(e) => setMapping({ ...mapping, yCol: e.target.value })}
                    className="w-full bg-studio-800 border border-studio-700 rounded px-2 py-1 text-slate-200"
                  >
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Fixture Type Column</label>
                  <select
                    value={mapping.typeCol}
                    onChange={(e) => setMapping({ ...mapping, typeCol: e.target.value })}
                    className="w-full bg-studio-800 border border-studio-700 rounded px-2 py-1 text-slate-200"
                  >
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Identifier / ID Column</label>
                  <select
                    value={mapping.idCol}
                    onChange={(e) => setMapping({ ...mapping, idCol: e.target.value })}
                    className="w-full bg-studio-800 border border-studio-700 rounded px-2 py-1 text-slate-200"
                  >
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full py-2 bg-studio-accent hover:bg-sky-400 text-white rounded font-medium text-xs shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Processing & Analyzing Fixtures...' : 'Apply & Import Patch'}
              </button>
            </div>
          )}

          {/* Quick Reload Default Façade */}
          <div className="pt-2 border-t border-studio-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Want to reload the original Letzipark Façade?</span>
            <button
              onClick={loadDefaultPatch}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-studio-800 hover:bg-studio-700 text-slate-200 border border-studio-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload Letzipark Façade</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
