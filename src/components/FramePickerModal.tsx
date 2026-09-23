import React, { useState } from 'react';
import { Check, Frame, Sliders, Sparkles, X } from 'lucide-react';
import { PhotoFrameConfig, StoredPhoto } from '../types/album';
import { FRAME_PRESETS, FramePreset, getFramePresetById } from '../services/frames';

interface FramePickerModalProps {
  currentFrameConfig?: PhotoFrameConfig;
  photo?: StoredPhoto | null;
  onApply: (config: PhotoFrameConfig, scope: 'slot' | 'page' | 'album') => void;
  onClose: () => void;
}

type FrameCategoryTab = 'all' | 'mat' | 'wood' | 'metallic' | 'vintage' | 'minimal';

export const FramePickerModal: React.FC<FramePickerModalProps> = ({
  currentFrameConfig,
  photo,
  onApply,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<FrameCategoryTab>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    currentFrameConfig?.styleId || (currentFrameConfig?.type === 'none' ? 'none' : 'classic-white-mat')
  );

  // Editable configuration initialized from current or selected preset
  const initialPreset = getFramePresetById(selectedPresetId);
  const [config, setConfig] = useState<PhotoFrameConfig>({
    ...initialPreset.config,
    ...currentFrameConfig,
  });

  const [captionText, setCaptionText] = useState<string>(currentFrameConfig?.caption || '');

  const filteredPresets = FRAME_PRESETS.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  const handleSelectPreset = (preset: FramePreset) => {
    setSelectedPresetId(preset.id);
    setConfig({
      ...preset.config,
      caption: captionText || preset.config.caption || '',
    });
  };

  const handleApplyScope = (scope: 'slot' | 'page' | 'album') => {
    onApply(
      {
        ...config,
        caption: config.type === 'polaroid' ? captionText : undefined,
      },
      scope
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Frame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Photo Frame & Mat Studio</h3>
              <p className="text-xs text-slate-500">
                Choose from archival mats, natural timber, luxury metallics, or vintage polaroid frames
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-semibold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto py-3 border-b border-slate-100">
          {[
            { id: 'all', label: 'All Frames' },
            { id: 'mat', label: 'Archival Mats' },
            { id: 'wood', label: 'Natural Wood' },
            { id: 'metallic', label: 'Luxe Metallics' },
            { id: 'vintage', label: 'Vintage & Polaroid' },
            { id: 'minimal', label: 'Modern Minimal' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as FrameCategoryTab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Modal Body: Split between Preset Grid and Custom Adjustments */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Preset Cards Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Sample Frame Styles ({filteredPresets.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col items-center group ${
                      isSelected
                        ? 'border-amber-600 ring-2 ring-amber-600/25 bg-amber-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Micro Frame Preview Thumbnail */}
                    <div className="w-full h-24 mb-2.5 rounded flex items-center justify-center p-2 relative overflow-hidden bg-slate-50">
                      <div
                        className="w-20 h-16 rounded-xs relative flex items-center justify-center transition group-hover:scale-105"
                        style={{
                          border: `${Math.max(2, preset.config.borderWidthMm * 0.75)}px solid ${preset.config.borderColor || '#cbd5e1'}`,
                          backgroundColor: preset.config.matColor || '#ffffff',
                          borderRadius: `${preset.config.cornerRadiusMm || 0}px`,
                          boxShadow: preset.config.shadow ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                        }}
                      >
                        {/* Inner photo mock */}
                        <div className="w-full h-full bg-slate-200 overflow-hidden flex items-center justify-center">
                          {photo ? (
                            <img
                              src={photo.thumbnailUrl || photo.previewUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[8px] text-slate-400 font-mono">PHOTO</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{preset.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tuning Controls */}
          {config.type !== 'none' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Fine-Tune Frame Attributes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Border Width Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Frame Thickness</span>
                    <span className="font-mono text-amber-600 font-bold">{config.borderWidthMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="0.5"
                    value={config.borderWidthMm}
                    onChange={(e) => setConfig({ ...config, borderWidthMm: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Corner Radius Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Corner Radius</span>
                    <span className="font-mono text-amber-600 font-bold">{config.cornerRadiusMm || 0} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="0.5"
                    value={config.cornerRadiusMm || 0}
                    onChange={(e) => setConfig({ ...config, cornerRadiusMm: parseFloat(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Polaroid Bottom Margin & Caption */}
                {config.type === 'polaroid' && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Polaroid Bottom Margin</span>
                        <span className="font-mono text-amber-600 font-bold">{config.bottomExtraMm || 8} mm</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="20"
                        step="1"
                        value={config.bottomExtraMm || 8}
                        onChange={(e) => setConfig({ ...config, bottomExtraMm: parseFloat(e.target.value) })}
                        className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Caption / Note on Polaroid
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Paris • May 2024"
                        value={captionText}
                        onChange={(e) => {
                          setCaptionText(e.target.value);
                          setConfig({ ...config, caption: e.target.value });
                        }}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                  </>
                )}

                {/* Color and Shadow row */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-700">Frame Tint:</label>
                    <input
                      type="color"
                      value={config.borderColor.startsWith('#') ? config.borderColor : '#ffffff'}
                      onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config.shadow}
                      onChange={(e) => setConfig({ ...config, shadow: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>Soft Ambient Shadow</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => handleApplyScope('slot')}
            className="text-xs text-slate-500 hover:text-rose-600 font-semibold transition"
          >
            Remove Frame (Borderless)
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleApplyScope('album')}
              title="Apply this frame to all photos in the entire album"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Apply to All in Album
            </button>
            <button
              onClick={() => handleApplyScope('page')}
              title="Apply this frame to all photos on this page"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Apply to Page
            </button>
            <button
              onClick={() => handleApplyScope('slot')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              Apply to Selected Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
