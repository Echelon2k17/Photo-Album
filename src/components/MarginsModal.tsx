import React, { useState } from 'react';
import { Sliders, Check } from 'lucide-react';
import { Album, PAGE_SIZE_CONFIGS, PageDimensions, PageMargins, PageSizePreset } from '../types/album';

interface MarginsModalProps {
  album: Album;
  onSave: (preset: PageSizePreset, margins: PageMargins, customDims?: { widthMm: number; heightMm: number }) => void;
  onClose: () => void;
}

export const MarginsModal: React.FC<MarginsModalProps> = ({ album, onSave, onClose }) => {
  const [preset, setPreset] = useState<PageSizePreset>(album.pageSizePreset);
  const [margins, setMargins] = useState<PageMargins>({ ...album.margins });
  const [customW, setCustomW] = useState(album.customWidthMm || 250);
  const [customH, setCustomH] = useState(album.customHeightMm || 250);

  const selectedDims: PageDimensions =
    preset === 'CUSTOM'
      ? { widthMm: customW, heightMm: customH, name: 'Custom' }
      : PAGE_SIZE_CONFIGS[preset];

  const handleApply = () => {
    onSave(
      preset,
      margins,
      preset === 'CUSTOM' ? { widthMm: customW, heightMm: customH } : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-lg">Page Size & Margins Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-semibold p-1"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5">
          {/* Left: Configuration Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Page Size Preset
              </label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as PageSizePreset)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                {Object.entries(PAGE_SIZE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            {preset === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    min="100"
                    max="600"
                    value={customW}
                    onChange={(e) => setCustomW(Math.max(50, parseInt(e.target.value) || 200))}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    min="100"
                    max="600"
                    value={customH}
                    onChange={(e) => setCustomH(Math.max(50, parseInt(e.target.value) || 200))}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Page Margins (mm)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Top Margin</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={margins.topMm}
                      onChange={(e) => setMargins({ ...margins, topMm: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                    <span className="text-xs text-slate-400">mm</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Bottom Margin</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={margins.bottomMm}
                      onChange={(e) => setMargins({ ...margins, bottomMm: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                    <span className="text-xs text-slate-400">mm</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Left Margin</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={margins.leftMm}
                      onChange={(e) => setMargins({ ...margins, leftMm: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                    <span className="text-xs text-slate-400">mm</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Right Margin</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={margins.rightMm}
                      onChange={(e) => setMargins({ ...margins, rightMm: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                    />
                    <span className="text-xs text-slate-400">mm</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Photo Gap (Spacing)
                </label>
                <span className="text-xs font-mono text-blue-600 font-bold">{margins.gapMm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={margins.gapMm}
                onChange={(e) => setMargins({ ...margins, gapMm: parseInt(e.target.value) || 0 })}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>0 mm (Seamless)</span>
                <span>10 mm</span>
                <span>25 mm</span>
              </div>
            </div>
          </div>

          {/* Right: Visual Margin Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-100/80 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">Live Margin Diagram</span>
            <div
              className="relative bg-white shadow-md border border-slate-300 rounded-[2px] transition-all flex items-center justify-center"
              style={{
                width: 190,
                height: Math.round(190 * (selectedDims.heightMm / selectedDims.widthMm)),
                maxHeight: 220,
              }}
            >
              {/* Margin overlay box */}
              <div
                className="absolute border-2 border-dashed border-blue-500/80 bg-blue-500/5 rounded-[1px] transition-all"
                style={{
                  top: `${Math.min(45, (margins.topMm / selectedDims.heightMm) * 100)}%`,
                  bottom: `${Math.min(45, (margins.bottomMm / selectedDims.heightMm) * 100)}%`,
                  left: `${Math.min(45, (margins.leftMm / selectedDims.widthMm) * 100)}%`,
                  right: `${Math.min(45, (margins.rightMm / selectedDims.widthMm) * 100)}%`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-blue-600">
                  Photo Content Area
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 text-center space-y-0.5">
              <p className="font-semibold text-slate-700">{selectedDims.name}</p>
              <p>
                Print Area: {(selectedDims.widthMm - margins.leftMm - margins.rightMm).toFixed(0)} ×{' '}
                {(selectedDims.heightMm - margins.topMm - margins.bottomMm).toFixed(0)} mm
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span>Apply Page Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
