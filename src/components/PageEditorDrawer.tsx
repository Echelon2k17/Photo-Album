import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  Move,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  LayoutGrid,
  ChevronRight,
  Maximize2,
  Palette,
  Frame,
  X
} from 'lucide-react';
import { AlbumLayout, AlbumPage, PhotoFrameConfig, PhotoPlacement, StoredPhoto } from '../types/album';
import { PREDEFINED_LAYOUTS, getLayoutById } from '../services/layouts';
import { getBackgroundPreviewCss } from '../services/backgrounds';
import { FramePickerModal } from './FramePickerModal';
import { getFramePresetById } from '../services/frames';

interface PageEditorDrawerProps {
  page: AlbumPage;
  activeSlotIndex: number | null;
  albumPhotos: StoredPhoto[];
  onUpdatePlacement: (
    slotIndex: number,
    updater: (prev: { scale: number; translationX: number; translationY: number; rotation: number }) => {
      scale: number;
      translationX: number;
      translationY: number;
      rotation: number;
    }
  ) => void;
  onUpdatePlacementFrame: (
    slotIndex: number,
    frameConfig: PhotoFrameConfig,
    scope: 'slot' | 'page' | 'album'
  ) => void;
  onReplacePhoto: (slotIndex: number, photoId: string) => void;
  onRemovePhotoFromSlot: (slotIndex: number) => void;
  onChangePageLayout: (newLayoutId: string) => void;
  onOpenBackgroundModal: () => void;
  onUploadNewPhoto: (files: FileList) => Promise<string | undefined>;
  onClose?: () => void;
}

export const PageEditorDrawer: React.FC<PageEditorDrawerProps> = ({
  page,
  activeSlotIndex,
  albumPhotos,
  onUpdatePlacement,
  onUpdatePlacementFrame,
  onReplacePhoto,
  onRemovePhotoFromSlot,
  onChangePageLayout,
  onOpenBackgroundModal,
  onUploadNewPhoto,
  onClose,
}) => {
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [showLayoutPickerModal, setShowLayoutPickerModal] = useState(false);
  const [showFramePickerModal, setShowFramePickerModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentLayout = getLayoutById(page.layoutId);
  const activePlacement = activeSlotIndex !== null
    ? page.placements.find(p => p.slotIndex === activeSlotIndex)
    : null;
  const currentPhoto = activePlacement?.photoId
    ? albumPhotos.find(p => p.id === activePlacement.photoId)
    : null;

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeSlotIndex === null) return;
    const val = parseFloat(e.target.value);
    onUpdatePlacement(activeSlotIndex, prev => ({ ...prev, scale: val }));
  };

  const handleRotate = (deg: number) => {
    if (activeSlotIndex === null) return;
    onUpdatePlacement(activeSlotIndex, prev => {
      const nextRot = (prev.rotation + deg + 360) % 360;
      return { ...prev, rotation: nextRot };
    });
  };

  const handleReset = () => {
    if (activeSlotIndex === null) return;
    onUpdatePlacement(activeSlotIndex, () => ({
      scale: 1.0,
      translationX: 0,
      translationY: 0,
      rotation: 0
    }));
  };

  const handleUploadAndPlace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || activeSlotIndex === null) return;
    setIsUploading(true);
    try {
      const newPhotoId = await onUploadNewPhoto(e.target.files);
      if (newPhotoId) {
        onReplacePhoto(activeSlotIndex, newPhotoId);
        setShowPhotoPickerModal(false);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-80 lg:w-84 max-w-full bg-white border-l border-slate-200 flex flex-col h-full text-slate-800 shadow-sm shrink-0">
      {/* Drawer Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Page Inspector</span>
          <h3 className="font-bold text-slate-900 text-sm">Page {page.pageNumber}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLayoutPickerModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Layout</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Inspector (Maximize canvas)"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Selected Frame Section */}
        {activeSlotIndex !== null ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {activeSlotIndex + 1}
                </span>
                <span className="font-semibold text-slate-900 text-sm">Frame {activeSlotIndex + 1} Selected</span>
              </div>
              <button
                onClick={handleReset}
                title="Reset adjustments"
                className="text-slate-400 hover:text-slate-700 p-1 text-xs flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {currentPhoto ? (
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <img
                  src={currentPhoto.thumbnailUrl}
                  alt={currentPhoto.name}
                  className="w-12 h-12 object-cover rounded shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{currentPhoto.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {currentPhoto.width} × {currentPhoto.height} px
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200">
                This frame is currently empty. Tap below to select or upload a photo.
              </div>
            )}

            {/* Replace / Remove Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowPhotoPickerModal(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{currentPhoto ? 'Replace Photo' : 'Add Photo'}</span>
              </button>

              {currentPhoto && (
                <button
                  onClick={() => onRemovePhotoFromSlot(activeSlotIndex)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {currentPhoto && (
              <>
                {/* Zoom Control */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                      Zoom
                    </span>
                    <span className="font-mono text-slate-500">
                      {((activePlacement?.scale || 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.05"
                    value={activePlacement?.scale || 1.0}
                    onChange={handleZoomChange}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>100%</span>
                    <span>250%</span>
                    <span>400%</span>
                  </div>
                </div>

                {/* Rotation Control */}
                <div className="space-y-2">
                  <span className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                    Rotate ({activePlacement?.rotation || 0}°)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRotate(-90)}
                      className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>-90°</span>
                    </button>
                    <button
                      onClick={() => handleRotate(90)}
                      className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

                {/* Photo Frame & Matting Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                      <Frame className="w-3.5 h-3.5 text-amber-600" />
                      <span>Photo Frame</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {activePlacement?.frameConfig?.type && activePlacement.frameConfig.type !== 'none'
                        ? activePlacement.frameConfig.name || 'Custom Frame'
                        : 'Borderless'}
                    </span>
                  </div>

                  {/* Quick Preset Selector Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'None', border: '#cbd5e1' },
                      { id: 'classic-white-mat', label: 'White Mat', border: '#e2e8f0' },
                      { id: 'light-oak', label: 'Warm Oak', border: '#d4a373' },
                      { id: 'luxe-gold', label: 'Luxe Gold', border: '#d4af37' },
                      { id: 'classic-polaroid', label: 'Polaroid', border: '#cbd5e1' },
                      { id: 'gallery-black-wood', label: 'Black Wood', border: '#1e293b' },
                    ].map((preset) => {
                      const isCur =
                        (preset.id === 'none' && (!activePlacement?.frameConfig || activePlacement.frameConfig.type === 'none')) ||
                        activePlacement?.frameConfig?.styleId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            if (activeSlotIndex === null) return;
                            const fullPreset = getFramePresetById(preset.id);
                            onUpdatePlacementFrame(activeSlotIndex, fullPreset.config, 'slot');
                          }}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition ${
                            isCur
                              ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold ring-1 ring-amber-500/20'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-xs border border-slate-300 shrink-0"
                            style={{ backgroundColor: preset.border }}
                          />
                          <span className="truncate">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Button to open FramePickerModal */}
                  <button
                    onClick={() => setShowFramePickerModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                  >
                    <Frame className="w-3.5 h-3.5 text-amber-700" />
                    <span>Browse All Frames & Fine-Tune...</span>
                  </button>
                </div>

                {/* Move / Pan Instructions */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Move className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pan / Move</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Click and drag inside the photo frame to adjust its composition or crop. Use the mouse wheel to zoom.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 px-2 text-slate-400">
            <Maximize2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No Frame Selected</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Click any photo slot on the canvas to zoom, pan, rotate, or replace photos.
            </p>
          </div>
        )}

        {/* Current Layout Overview */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Page Layout</span>
            <span className="text-xs text-slate-500">{currentLayout.slotsCount} photos</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">{currentLayout.name}</p>
              <p className="text-[11px] text-slate-500">{currentLayout.category}</p>
            </div>
            <button
              onClick={() => setShowLayoutPickerModal(true)}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center"
            >
              Change <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Page Background Overview */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Page Background</span>
            <span className="text-xs text-slate-500 capitalize">
              {page.backgroundConfig?.type || 'Solid Color'}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-md border border-slate-300 shadow-2xs"
                style={{ background: getBackgroundPreviewCss(page.backgroundConfig, page.backgroundColor) }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">
                  {page.backgroundConfig?.type === 'gradient'
                    ? page.backgroundConfig.gradient?.name || 'Custom Gradient'
                    : page.backgroundConfig?.type === 'texture'
                    ? `Texture: ${page.backgroundConfig.texture}`
                    : page.backgroundConfig?.type === 'image'
                    ? 'Photo Watermark'
                    : page.backgroundColor || '#ffffff'}
                </p>
                <p className="text-[11px] text-slate-400">Current page backdrop</p>
              </div>
            </div>
            <button
              onClick={onOpenBackgroundModal}
              className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Page Photo Frames Overview */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Photo Frames</span>
            <span className="text-xs text-slate-500">Page & Album</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <Frame className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">Photo Frames & Mats</p>
                <p className="text-[11px] text-slate-400">Choose frame presets or custom styles</p>
              </div>
            </div>
            <button
              onClick={() => setShowFramePickerModal(true)}
              className="text-xs text-amber-700 font-medium hover:underline flex items-center gap-1"
            >
              <Frame className="w-3.5 h-3.5" />
              <span>Browse</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Select / Replace Photo */}
      {showPhotoPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-base">Select Photo for Frame {(activeSlotIndex ?? 0) + 1}</h4>
              <button
                onClick={() => setShowPhotoPickerModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Upload directly to slot */}
            <div className="py-3">
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-lg cursor-pointer text-xs font-semibold text-blue-700 transition">
                <ImageIcon className="w-4 h-4" />
                <span>Upload New High-Res Photo from Device</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAndPlace}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Gallery of photos in this album */}
            <div className="flex-1 overflow-y-auto py-2">
              <p className="text-xs font-semibold text-slate-500 mb-2">Or pick from Album Photos ({albumPhotos.length}):</p>
              {albumPhotos.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No photos uploaded to this album yet.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2.5">
                  {albumPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        if (activeSlotIndex !== null) {
                          onReplacePhoto(activeSlotIndex, photo.id);
                          setShowPhotoPickerModal(false);
                        }
                      }}
                      className="group relative aspect-square rounded-md overflow-hidden border border-slate-200 hover:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPhotoPickerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Change Layout for THIS Page Only */}
      {showLayoutPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Change Layout for Page {page.pageNumber}</h4>
                <p className="text-xs text-slate-500">Only Page {page.pageNumber} will be changed. Other pages remain untouched.</p>
              </div>
              <button
                onClick={() => setShowLayoutPickerModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PREDEFINED_LAYOUTS.map((layout) => {
                const isSelected = layout.id === page.layoutId;
                return (
                  <button
                    key={layout.id}
                    onClick={() => {
                      onChangePageLayout(layout.id);
                      setShowLayoutPickerModal(false);
                    }}
                    className={`p-3 text-left rounded-lg border-2 transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Visual representation of slots */}
                    <div className="relative aspect-4/3 w-full bg-slate-100 rounded border border-slate-200 p-1 mb-2">
                      {layout.slots.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          className="absolute bg-slate-300 border border-white rounded-[2px]"
                          style={{
                            left: `${s.x * 100}%`,
                            top: `${s.y * 100}%`,
                            width: `${s.width * 100}%`,
                            height: `${s.height * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate">{layout.name}</p>
                      <p className="text-[11px] text-slate-500">{layout.slotsCount} {layout.slotsCount === 1 ? 'photo' : 'photos'}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowLayoutPickerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Frame Picker & Fine-Tuning */}
      {showFramePickerModal && (
        <FramePickerModal
          currentFrameConfig={activePlacement?.frameConfig}
          photo={currentPhoto}
          onApply={(cfg, scope) => {
            onUpdatePlacementFrame(activeSlotIndex ?? 0, cfg, scope);
          }}
          onClose={() => setShowFramePickerModal(false)}
        />
      )}
    </div>
  );
};
