import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sliders,
  CheckCheck,
  Upload
} from 'lucide-react';
import { AlbumPage, PageBackgroundConfig, StoredPhoto } from '../types/album';
import {
  BackgroundColorPreset,
  BackgroundTexturePreset,
  BACKGROUND_COLOR_PRESETS,
  BACKGROUND_GRADIENT_PRESETS,
  BACKGROUND_TEXTURE_PRESETS,
  getBackgroundPreviewCss
} from '../services/backgrounds';

interface BackgroundModalProps {
  currentPage: AlbumPage;
  totalPagesCount: number;
  albumPhotos: StoredPhoto[];
  onApply: (bgConfig: PageBackgroundConfig, applyToAll: boolean) => void;
  onClose: () => void;
}

type TabType = 'color' | 'gradient' | 'texture' | 'image';

export const BackgroundModal: React.FC<BackgroundModalProps> = ({
  currentPage,
  totalPagesCount,
  albumPhotos,
  onApply,
  onClose,
}) => {
  const initialBg: PageBackgroundConfig = currentPage.backgroundConfig || {
    type: 'color',
    color: currentPage.backgroundColor || '#ffffff',
  };

  const [activeTab, setActiveTab] = useState<TabType>(initialBg.type || 'color');

  // Solid Color State
  const [selectedColor, setSelectedColor] = useState<string>(
    initialBg.type === 'color' ? initialBg.color || '#ffffff' : '#ffffff'
  );

  // Gradient State
  const [selectedGradId, setSelectedGradId] = useState<string>(
    initialBg.type === 'gradient' ? initialBg.gradient?.id || BACKGROUND_GRADIENT_PRESETS[0].id : BACKGROUND_GRADIENT_PRESETS[0].id
  );
  const [gradAngle, setGradAngle] = useState<number>(
    initialBg.type === 'gradient' ? initialBg.gradient?.angle ?? 135 : 135
  );

  // Texture State
  const [selectedTexture, setSelectedTexture] = useState<BackgroundTexturePreset['id']>(
    initialBg.type === 'texture' ? (initialBg.texture || 'linen') : 'linen'
  );
  const [textureBaseColor, setTextureBaseColor] = useState<string>(
    initialBg.type === 'texture' ? initialBg.textureBaseColor || '#f7f4ed' : '#f7f4ed'
  );

  // Photo Background State
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(
    initialBg.type === 'image' && initialBg.photoId ? initialBg.photoId : albumPhotos[0]?.id || ''
  );
  const [photoOpacity, setPhotoOpacity] = useState<number>(
    initialBg.type === 'image' ? initialBg.photoOpacity ?? 0.35 : 0.35
  );
  const [photoBlur, setPhotoBlur] = useState<number>(
    initialBg.type === 'image' ? initialBg.photoBlur ?? 0 : 0
  );

  // Build current candidate PageBackgroundConfig
  const buildCurrentConfig = (): PageBackgroundConfig => {
    if (activeTab === 'color') {
      return {
        type: 'color',
        color: selectedColor,
      };
    }

    if (activeTab === 'gradient') {
      const preset = BACKGROUND_GRADIENT_PRESETS.find((g) => g.id === selectedGradId) || BACKGROUND_GRADIENT_PRESETS[0];
      return {
        type: 'gradient',
        color: preset.stops[0].color,
        gradient: {
          id: preset.id,
          name: preset.name,
          type: preset.type,
          angle: preset.type === 'linear' ? gradAngle : undefined,
          stops: preset.stops,
        },
      };
    }

    if (activeTab === 'texture') {
      return {
        type: 'texture',
        color: textureBaseColor,
        texture: selectedTexture,
        textureBaseColor: textureBaseColor,
      };
    }

    if (activeTab === 'image') {
      return {
        type: 'image',
        color: '#f8fafc',
        photoId: selectedPhotoId,
        photoOpacity: photoOpacity,
        photoBlur: photoBlur,
      };
    }

    return { type: 'color', color: '#ffffff' };
  };

  const currentConfig = buildCurrentConfig();
  const previewCss = getBackgroundPreviewCss(currentConfig);

  const handleApplySingle = () => {
    onApply(currentConfig, false);
    onClose();
  };

  const handleApplyAll = () => {
    onApply(currentConfig, true);
    onClose();
  };

  const handleResetWhite = () => {
    setSelectedColor('#ffffff');
    setActiveTab('color');
    onApply({ type: 'color', color: '#ffffff' }, false);
    onClose();
  };

  // Group color presets by category
  const categories: BackgroundColorPreset['category'][] = [
    'Neutral & Clean',
    'Warm & Earthy',
    'Wedding & Romance',
    'Elegance & Pastel',
    'Vibrant & Contemporary',
    'Dramatic & Dark',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Page Background Studio</h3>
              <p className="text-xs text-slate-500">
                Customize background color, subtle gradients, fine paper textures, or photo watermarks
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-semibold p-1">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-3">
          {[
            { id: 'color', label: 'Solid Color', icon: Palette },
            { id: 'gradient', label: 'Designer Gradients', icon: Sparkles },
            { id: 'texture', label: 'Paper Textures', icon: Layers },
            { id: 'image', label: 'Photo Watermark', icon: ImageIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* 1. SOLID COLOR TAB */}
          {activeTab === 'color' && (
            <div className="space-y-4">
              {categories.map((cat) => {
                const presets = BACKGROUND_COLOR_PRESETS.filter((p) => p.category === cat);
                return (
                  <div key={cat} className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {cat}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {presets.map((preset) => {
                        const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedColor(preset.hex)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                              isSelected
                                ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/30'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: preset.hex }}
                            >
                              {isSelected && (
                                <Check
                                  className={`w-3.5 h-3.5 ${
                                    preset.textColorHint === 'light' ? 'text-white' : 'text-slate-900'
                                  }`}
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{preset.name}</p>
                              <p className="text-[10px] font-mono text-slate-400">{preset.hex}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Custom Color Input */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Custom Color</p>
                  <p className="text-[11px] text-slate-500">Pick any custom shade or enter hex code</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-24 px-2 py-1 text-xs rounded border border-slate-300 font-mono text-center"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. GRADIENTS TAB */}
          {activeTab === 'gradient' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BACKGROUND_GRADIENT_PRESETS.map((preset) => {
                  const isSelected = selectedGradId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedGradId(preset.id)}
                      className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-lg border border-slate-300 shadow-2xs flex-shrink-0 flex items-center justify-center"
                        style={{ background: preset.cssString }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{preset.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{preset.type} blend</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Angle control for linear gradients */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Gradient Flow Angle</span>
                  <span className="font-mono text-blue-600 font-bold">{gradAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={gradAngle}
                  onChange={(e) => setGradAngle(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* 3. TEXTURES TAB */}
          {activeTab === 'texture' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BACKGROUND_TEXTURE_PRESETS.map((preset) => {
                  const isSelected = selectedTexture === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedTexture(preset.id);
                        setTextureBaseColor(preset.defaultBaseColor);
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-900">{preset.name}</p>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">{preset.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Texture Base Color Picker */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Texture Underlying Tint</p>
                  <p className="text-[11px] text-slate-500">Paper tone beneath the pattern</p>
                </div>
                <div className="flex items-center gap-2">
                  {['#ffffff', '#fdfbf7', '#f7f4ed', '#ece5d8', '#27272a'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTextureBaseColor(col)}
                      className={`w-6 h-6 rounded-md border shadow-2xs transition ${
                        textureBaseColor === col ? 'ring-2 ring-blue-600 scale-110' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. PHOTO WATERMARK TAB */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              {albumPhotos.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-600 font-medium">No photos found in album</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Choose Background Photo
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {albumPhotos.map((photo) => {
                      const isSelected = selectedPhotoId === photo.id;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setSelectedPhotoId(photo.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-600/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img src={photo.thumbnailUrl} alt={photo.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Opacity and Blur Sliders */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Watermark Opacity</span>
                        <span className="font-mono text-blue-600 font-bold">
                          {Math.round(photoOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={photoOpacity}
                        onChange={(e) => setPhotoOpacity(parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Artistic Blur Softness</span>
                        <span className="font-mono text-blue-600 font-bold">{photoBlur} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="16"
                        step="1"
                        value={photoBlur}
                        onChange={(e) => setPhotoBlur(parseInt(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Preview Strip & Scope Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetWhite}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset White</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplySingle}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <Check className="w-4 h-4 text-blue-600" />
              <span>Apply to Page {currentPage.pageNumber}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyAll}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Apply to All {totalPagesCount} Pages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
