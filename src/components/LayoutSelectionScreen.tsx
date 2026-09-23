import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Sliders, Check, Palette } from 'lucide-react';
import { PREDEFINED_LAYOUTS, getLayoutById } from '../services/layouts';
import {
  Album,
  AlbumLayout,
  PAGE_SIZE_CONFIGS,
  PageBackgroundConfig,
  PageDimensions,
  PageMargins,
  PageSizePreset,
  StoredPhoto
} from '../types/album';
import { BACKGROUND_GRADIENT_PRESETS, getBackgroundPreviewCss } from '../services/backgrounds';

interface LayoutSelectionScreenProps {
  album: Album;
  photos: StoredPhoto[];
  onGenerate: (
    defaultLayoutId: string,
    margins: PageMargins,
    pageSizePreset: PageSizePreset,
    defaultBgConfig?: PageBackgroundConfig
  ) => void;
  onBack: () => void;
}

interface BgOption {
  id: string;
  name: string;
  description: string;
  config: PageBackgroundConfig;
}

const DEFAULT_BG_THEMES: BgOption[] = [
  {
    id: 'white',
    name: 'Studio White',
    description: 'Crisp, timeless gallery white',
    config: { type: 'color', color: '#ffffff' },
  },
  {
    id: 'ivory',
    name: 'Warm Ivory',
    description: 'Soft editorial fine-art tone',
    config: { type: 'color', color: '#fdfbf7' },
  },
  {
    id: 'linen',
    name: 'Woven Linen',
    description: 'Tactile archival book cloth',
    config: { type: 'texture', color: '#f7f4ed', texture: 'linen', textureBaseColor: '#f7f4ed' },
  },
  {
    id: 'dawn',
    name: 'Morning Glow',
    description: 'Subtle warm luxury gradient',
    config: {
      type: 'gradient',
      color: '#fffbf5',
      gradient: {
        id: 'warm-morning',
        name: 'Warm Morning Glow',
        type: 'linear',
        angle: 135,
        stops: [
          { color: '#ffffff', offset: 0 },
          { color: '#fffbf5', offset: 0.5 },
          { color: '#fef3e2', offset: 1 },
        ],
      },
    },
  },
  {
    id: 'charcoal',
    name: 'Gallery Noir',
    description: 'High contrast dramatic black',
    config: { type: 'color', color: '#18181b' },
  },
  {
    id: 'blush-romance',
    name: 'Blush Rose',
    description: 'Romantic soft pastel for weddings & portraits',
    config: { type: 'color', color: '#fcf2f0' },
  },
  {
    id: 'terrazzo',
    name: 'Handmade Washi',
    description: 'Mineral speckled artisanal paper texture',
    config: { type: 'texture', color: '#fbf9f4', texture: 'terrazzo', textureBaseColor: '#fbf9f4' },
  },
  {
    id: 'cashmere',
    name: 'Cashmere Greige',
    description: 'Modern tonal luxury studio gradation',
    config: {
      type: 'gradient',
      color: '#f7f6f4',
      gradient: {
        id: 'grad-cashmere-greige',
        name: 'Cashmere Greige',
        type: 'linear',
        angle: 150,
        stops: [
          { color: '#f7f6f4', offset: 0 },
          { color: '#e8e6e1', offset: 1 },
        ],
      },
    },
  },
];

export const LayoutSelectionScreen: React.FC<LayoutSelectionScreenProps> = ({
  album,
  photos,
  onGenerate,
  onBack,
}) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(album.defaultLayoutId || PREDEFINED_LAYOUTS[1].id);
  const [pageSizePreset, setPageSizePreset] = useState<PageSizePreset>(album.pageSizePreset);
  const [margins, setMargins] = useState<PageMargins>({ ...album.margins });
  const [selectedBgId, setSelectedBgId] = useState<string>('white');

  const selectedLayout = getLayoutById(selectedLayoutId);
  const selectedDims: PageDimensions = PAGE_SIZE_CONFIGS[pageSizePreset];
  const selectedTheme = DEFAULT_BG_THEMES.find((t) => t.id === selectedBgId) || DEFAULT_BG_THEMES[0];

  // Automatic page calculation
  const slotsPerPage = Math.max(1, selectedLayout.slotsCount);
  const estimatedPagesCount = Math.ceil(photos.length / slotsPerPage);

  const handleApply = () => {
    onGenerate(selectedLayoutId, margins, pageSizePreset, selectedTheme.config);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Step 3 of 3</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{album.name}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Choose Default Layout & Margins
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the default layout template for your pages. Individual pages can be customized independently later.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate {estimatedPagesCount} Album Pages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Layout Templates Visual Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Select Page Layout Template
            </h2>
            <span className="text-xs text-slate-500">{PREDEFINED_LAYOUTS.length} Predefined Templates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {PREDEFINED_LAYOUTS.map((layout) => {
              const isSelected = layout.id === selectedLayoutId;
              return (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayoutId(layout.id)}
                  className={`p-3.5 text-left rounded-xl border-2 transition flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  {/* Visual slot representation preview */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 rounded-md border border-slate-200 p-1.5 mb-3 group-hover:scale-101 transition duration-200">
                    {layout.slots.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className={`absolute rounded-[2px] transition ${
                          isSelected
                            ? 'bg-blue-300 border border-blue-500'
                            : 'bg-slate-300 border border-white'
                        }`}
                        style={{
                          left: `${s.x * 100}%`,
                          top: `${s.y * 100}%`,
                          width: `${s.width * 100}%`,
                          height: `${s.height * 100}%`,
                        }}
                      />
                    ))}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900">{layout.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{layout.description}</p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {layout.slotsCount} {layout.slotsCount === 1 ? 'photo' : 'photos'} per page
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Page Settings, Margins & Generation Summary */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>2. Page Size & Margins</span>
            </h2>

            {/* Page Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Page Format</label>
              <select
                value={pageSizePreset}
                onChange={(e) => setPageSizePreset(e.target.value as PageSizePreset)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-600"
              >
                {Object.entries(PAGE_SIZE_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Page Margins (mm)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Top</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={margins.topMm}
                    onChange={(e) => setMargins({ ...margins, topMm: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Bottom</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={margins.bottomMm}
                    onChange={(e) => setMargins({ ...margins, bottomMm: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Left</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={margins.leftMm}
                    onChange={(e) => setMargins({ ...margins, leftMm: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Right</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={margins.rightMm}
                    onChange={(e) => setMargins({ ...margins, rightMm: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Gap */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">Photo Gap (Spacing)</span>
                <span className="text-xs font-mono text-blue-600 font-bold">{margins.gapMm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={margins.gapMm}
                onChange={(e) => setMargins({ ...margins, gapMm: parseInt(e.target.value) || 0 })}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Background Theme Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                <span>Page Background Theme</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Customizable per page</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_BG_THEMES.map((theme) => {
                const isSelected = selectedBgId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedBgId(theme.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg border border-slate-300 shadow-2xs flex-shrink-0 flex items-center justify-center"
                      style={{ background: getBackgroundPreviewCss(theme.config) }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 drop-shadow-xs" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">{theme.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{theme.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automatic Generation Calculation Box */}
          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-2">
            <h3 className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Automatic Page Distribution</span>
            </h3>
            <div className="space-y-1 text-blue-800">
              <p>
                <span className="font-semibold">{photos.length} photos</span> selected ÷{' '}
                <span className="font-semibold">{selectedLayout.slotsCount} photos</span> per page
              </p>
              <p className="text-sm font-extrabold text-blue-950">
                = {estimatedPagesCount} Album {estimatedPagesCount === 1 ? 'Page' : 'Pages'} will be created
              </p>
              <p className="text-[11px] text-blue-700 leading-relaxed pt-1">
                Photos will be automatically distributed into slots. You can rearrange, crop, change layouts, and adjust photos on any page in the editor.
              </p>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Create & Open Album Studio →
          </button>
        </div>
      </div>
    </div>
  );
};
