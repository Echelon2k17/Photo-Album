import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Sun,
  Contrast as ContrastIcon,
  Check,
  RotateCcw,
  Sliders,
  X,
  Layers
} from 'lucide-react';
import { PhotoFilterAdjustments, PhotoFilterType, PHOTO_FILTERS, StoredPhoto } from '../types/album';
import { DEFAULT_PHOTO_ADJUSTMENTS, isAdjustmentsActive, processImageWithCanvasApi } from '../services/imageProcessing';

interface PhotoFilterModalProps {
  photo: StoredPhoto | null;
  currentFilter?: PhotoFilterType;
  currentAdjustments?: PhotoFilterAdjustments;
  slotIndex: number;
  onApply: (
    filter: PhotoFilterType,
    adjustments: PhotoFilterAdjustments,
    applyToAllOnPage: boolean
  ) => void;
  onClose: () => void;
}

export const PhotoFilterModal: React.FC<PhotoFilterModalProps> = ({
  photo,
  currentFilter = 'none',
  currentAdjustments,
  slotIndex,
  onApply,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterType>(currentFilter);
  const [adjustments, setAdjustments] = useState<PhotoFilterAdjustments>({
    brightness: currentAdjustments?.brightness ?? DEFAULT_PHOTO_ADJUSTMENTS.brightness,
    contrast: currentAdjustments?.contrast ?? DEFAULT_PHOTO_ADJUSTMENTS.contrast,
    grayscale: currentAdjustments?.grayscale ?? DEFAULT_PHOTO_ADJUSTMENTS.grayscale,
    sepia: currentAdjustments?.sepia ?? DEFAULT_PHOTO_ADJUSTMENTS.sepia,
  });

  const [applyToAll, setApplyToAll] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Load preview photo
  useEffect(() => {
    if (!photo) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageElementRef.current = img;
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      setIsImageLoaded(false);
    };
    img.src = photo.previewUrl || photo.thumbnailUrl;
  }, [photo]);

  // Real-time Canvas API live preview processing
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    const img = imageElementRef.current;
    if (!canvas || !img || !isImageLoaded) return;

    // Determine preview target resolution (max 480x360 for high-performance live rendering)
    const maxW = 480;
    const maxH = 360;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1.0);
    const targetW = Math.max(120, Math.round(img.naturalWidth * scale));
    const targetH = Math.max(90, Math.round(img.naturalHeight * scale));

    canvas.width = targetW;
    canvas.height = targetH;

    // Execute the Canvas API processing layer
    const processedCanvas = processImageWithCanvasApi(
      img,
      targetW,
      targetH,
      adjustments,
      selectedFilter
    );

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(processedCanvas, 0, 0);
    }
  }, [adjustments, selectedFilter, isImageLoaded]);

  const handleResetAdjustments = () => {
    setSelectedFilter('none');
    setAdjustments({
      brightness: DEFAULT_PHOTO_ADJUSTMENTS.brightness,
      contrast: DEFAULT_PHOTO_ADJUSTMENTS.contrast,
      grayscale: DEFAULT_PHOTO_ADJUSTMENTS.grayscale,
      sepia: DEFAULT_PHOTO_ADJUSTMENTS.sepia,
    });
  };

  const handleApplyBlackAndWhite = () => {
    setSelectedFilter('none');
    setAdjustments((prev) => ({
      ...prev,
      grayscale: prev.grayscale === 100 ? 0 : 100,
      sepia: 0,
    }));
  };

  const handleApplySepia = () => {
    setSelectedFilter('none');
    setAdjustments((prev) => ({
      ...prev,
      sepia: prev.sepia === 100 ? 0 : 100,
      grayscale: 0,
    }));
  };

  const handleSelectPreset = (presetId: PhotoFilterType) => {
    setSelectedFilter(presetId);
    if (presetId === 'grayscale') {
      setAdjustments((prev) => ({ ...prev, grayscale: 0, sepia: 0 }));
    } else if (presetId === 'sepia') {
      setAdjustments((prev) => ({ ...prev, grayscale: 0, sepia: 0 }));
    }
  };

  const hasModifications =
    selectedFilter !== 'none' || isAdjustmentsActive(adjustments);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-stone-900 text-white rounded-xl">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-normal text-stone-900 tracking-tight">
                Darkroom & Color Studio
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-normal">
                <span>Photo Slot {slotIndex + 1}</span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>Fine-Art Filtering & Tonal Adjustments</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Live Canvas Preview Stage */}
          <div className="flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-md max-w-full flex items-center justify-center min-h-[190px] p-3">
              <canvas
                ref={previewCanvasRef}
                className="max-h-56 max-w-full rounded object-contain shadow-inner"
              />
              {!isImageLoaded && (
                <div className="text-xs text-stone-400">Loading photo preview...</div>
              )}

              {/* Status Badge */}
              <div className="absolute top-3 left-3 bg-stone-900/90 backdrop-blur-md text-stone-200 text-[11px] px-2.5 py-1 rounded-lg border border-stone-700/80 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="font-medium">
                  {selectedFilter !== 'none'
                    ? PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.name
                    : adjustments.grayscale === 100
                    ? 'Black & White'
                    : adjustments.sepia === 100
                    ? 'Warm Sepia'
                    : hasModifications
                    ? 'Custom Adjustments'
                    : 'Original'}
                </span>
              </div>

              {hasModifications && (
                <button
                  type="button"
                  onClick={handleResetAdjustments}
                  className="absolute top-3 right-3 bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white text-[11px] px-2.5 py-1 rounded-lg border border-stone-700/80 flex items-center gap-1 transition"
                  title="Reset to Original"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Buttons (Black & White, Sepia, Original) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Quick Filter Presets
              </span>
              <span className="text-[11px] text-slate-400">One-click Canvas processing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Original */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('none');
                  setAdjustments({ brightness: 100, contrast: 100, grayscale: 0, sepia: 0 });
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  selectedFilter === 'none' && !isAdjustmentsActive(adjustments)
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Original</span>
                {selectedFilter === 'none' && !isAdjustmentsActive(adjustments) && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </button>

              {/* Black & White */}
              <button
                type="button"
                onClick={handleApplyBlackAndWhite}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  adjustments.grayscale === 100 || selectedFilter === 'grayscale'
                    ? 'border-slate-800 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-slate-700 inline-block border border-white" />
                <span>Black & White</span>
                {(adjustments.grayscale === 100 || selectedFilter === 'grayscale') && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </button>

              {/* Sepia */}
              <button
                type="button"
                onClick={handleApplySepia}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  adjustments.sepia === 100 || selectedFilter === 'sepia'
                    ? 'border-amber-700 bg-amber-700 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-amber-600 inline-block border border-white" />
                <span>Warm Sepia</span>
                {(adjustments.sepia === 100 || selectedFilter === 'sepia') && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </button>

              {/* Vintage / Warm */}
              <button
                type="button"
                onClick={() => handleSelectPreset('vintage')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  selectedFilter === 'vintage'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Vintage 70s</span>
                {selectedFilter === 'vintage' && (
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                )}
              </button>
            </div>
          </div>

          {/* Granular Sliders: Brightness, Contrast, Black & White, Sepia */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fine-Tuning Adjustments
            </span>

            {/* Brightness Slider */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Brightness</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {adjustments.brightness ?? 100}%
                  </span>
                  {(adjustments.brightness ?? 100) !== 100 && (
                    <button
                      type="button"
                      onClick={() => setAdjustments((prev) => ({ ...prev, brightness: 100 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono w-7">50%</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={adjustments.brightness ?? 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustments((prev) => ({ ...prev, brightness: val }));
                  }}
                  className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-7 text-right">150%</span>
              </div>
            </div>

            {/* Contrast Slider */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ContrastIcon className="w-4 h-4 text-indigo-500" />
                  <span>Contrast</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {adjustments.contrast ?? 100}%
                  </span>
                  {(adjustments.contrast ?? 100) !== 100 && (
                    <button
                      type="button"
                      onClick={() => setAdjustments((prev) => ({ ...prev, contrast: 100 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono w-7">50%</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={adjustments.contrast ?? 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustments((prev) => ({ ...prev, contrast: val }));
                  }}
                  className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-7 text-right">150%</span>
              </div>
            </div>

            {/* Black & White Intensity Slider */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-white" />
                  <span>B&W (Grayscale) Intensity</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {adjustments.grayscale ?? 0}%
                  </span>
                  {(adjustments.grayscale ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdjustments((prev) => ({ ...prev, grayscale: 0 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono w-7">0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={adjustments.grayscale ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustments((prev) => ({
                      ...prev,
                      grayscale: val,
                      sepia: val > 0 ? 0 : prev.sepia,
                    }));
                  }}
                  className="flex-1 accent-slate-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-7 text-right">100%</span>
              </div>
            </div>

            {/* Sepia Tone Slider */}
            <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-600 border border-white" />
                  <span>Sepia Warmth</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {adjustments.sepia ?? 0}%
                  </span>
                  {(adjustments.sepia ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdjustments((prev) => ({ ...prev, sepia: 0 }))}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono w-7">0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={adjustments.sepia ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setAdjustments((prev) => ({
                      ...prev,
                      sepia: val,
                      grayscale: val > 0 ? 0 : prev.grayscale,
                    }));
                  }}
                  className="flex-1 accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-7 text-right">100%</span>
              </div>
            </div>
          </div>

          {/* Additional Creative Presets Carousel */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Additional Filters
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PHOTO_FILTERS.filter(
                (f) => f.id !== 'none' && f.id !== 'grayscale' && f.id !== 'sepia'
              ).map((preset) => {
                const isActive = selectedFilter === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`py-2 px-2 rounded-lg border text-center text-xs transition ${
                      isActive
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="truncate">{preset.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apply to All Photos on Page Checkbox */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Apply this filter & adjustments to all photos on current page</span>
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetAdjustments}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            Reset All
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(selectedFilter, adjustments, applyToAll);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
