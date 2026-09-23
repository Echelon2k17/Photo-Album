import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  Frame,
  Move,
  Plus
} from 'lucide-react';
import { getPhotoById } from '../services/db';
import { getLayoutById } from '../services/layouts';
import { computeSlotFrames, renderAlbumPage, RenderPhotoSource } from '../services/renderer';
import { Album, AlbumPage, PAGE_SIZE_CONFIGS, PageDimensions } from '../types/album';

export interface AlbumPageCanvasProps {
  album: Album;
  page: AlbumPage;
  activeSlotIndex: number | null;
  onSelectSlot: (slotIndex: number | null) => void;
  onUpdatePlacement: (
    slotIndex: number,
    updater: (prev: { scale: number; translationX: number; translationY: number; rotation: number }) => {
      scale: number;
      translationX: number;
      translationY: number;
      rotation: number;
    },
    options?: { skipHistory?: boolean }
  ) => void;
  onCommitPlacementHistory?: () => void;
  onEmptySlotClick?: (slotIndex: number) => void;
  onOpenFramePicker?: () => void;
  onRemovePhoto?: (slotIndex: number) => void;
  showMarginGuides?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  interactive?: boolean;
}

export type PageCanvasProps = AlbumPageCanvasProps;

export const AlbumPageCanvas: React.FC<AlbumPageCanvasProps> = ({
  album,
  page,
  activeSlotIndex,
  onSelectSlot,
  onUpdatePlacement,
  onCommitPlacementHistory,
  onEmptySlotClick,
  onOpenFramePicker,
  onRemovePhoto,
  showMarginGuides = true,
  maxWidth = 850,
  maxHeight = 650,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [photosMap, setPhotosMap] = useState<Map<string, RenderPhotoSource>>(new Map());
  const [hoverSlotIndex, setHoverSlotIndex] = useState<number | null>(null);

  // Interaction dragging states
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initTransX: number; initTransY: number }>({
    x: 0,
    y: 0,
    initTransX: 0,
    initTransY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  const pageDims: PageDimensions =
    album.pageSizePreset === 'CUSTOM' && album.customWidthMm && album.customHeightMm
      ? { widthMm: album.customWidthMm, heightMm: album.customHeightMm, name: 'Custom' }
      : PAGE_SIZE_CONFIGS[album.pageSizePreset] || PAGE_SIZE_CONFIGS.A4_LANDSCAPE;

  const aspectRatio = pageDims.widthMm / pageDims.heightMm;

  // Compute display size that fits in maxWidth / maxHeight
  let displayWidth = Math.max(240, Math.floor(maxWidth));
  let displayHeight = Math.round(displayWidth / aspectRatio);

  if (displayHeight > maxHeight) {
    displayHeight = Math.max(180, Math.floor(maxHeight));
    displayWidth = Math.round(displayHeight * aspectRatio);
  }

  // Load preview/thumbnail images for this page (interactive tier)
  useEffect(() => {
    let isCancelled = false;
    const loadImages = async () => {
      const placementIds = page.placements.map((p) => p.photoId).filter(Boolean);
      const bgPhotoId = page.backgroundConfig?.type === 'image' ? page.backgroundConfig.photoId : undefined;
      const allPhotoIds = bgPhotoId ? [...placementIds, bgPhotoId] : placementIds;
      const requiredPhotoIds = Array.from(new Set(allPhotoIds));
      const newMap = new Map<string, RenderPhotoSource>();

      for (const id of requiredPhotoIds) {
        const photo = await getPhotoById(id);
        if (photo && !isCancelled) {
          // Use previewUrl or thumbnailUrl for crisp lag-free interactive canvas
          const img = new Image();
          let loaded = false;
          await new Promise<void>((res) => {
            img.onload = () => {
              loaded = true;
              res();
            };
            img.onerror = () => {
              if (photo.thumbnailUrl && img.src !== photo.thumbnailUrl) {
                // Try fallback to thumbnail URL
                img.src = photo.thumbnailUrl;
              } else {
                loaded = false;
                res();
              }
            };
            img.src = photo.previewUrl || photo.thumbnailUrl;
          });

          if (loaded && !isCancelled) {
            newMap.set(id, {
              image: img,
              width: photo.width || img.naturalWidth || 800,
              height: photo.height || img.naturalHeight || 600,
            });
          }
        }
      }

      // If custom background image URL is present, load it
      if (page.backgroundConfig?.type === 'image' && page.backgroundConfig.customImageUrl && !isCancelled) {
        const bgImg = new Image();
        let bgLoaded = false;
        await new Promise<void>((res) => {
          bgImg.onload = () => {
            bgLoaded = true;
            res();
          };
          bgImg.onerror = () => {
            bgLoaded = false;
            res();
          };
          bgImg.src = page.backgroundConfig!.customImageUrl!;
        });
        if (bgLoaded && !isCancelled) {
          newMap.set('custom_bg', {
            image: bgImg,
            width: bgImg.naturalWidth || 1200,
            height: bgImg.naturalHeight || 800,
          });
        }
      }

      if (!isCancelled) {
        setPhotosMap(newMap);
      }
    };

    loadImages();
    return () => {
      isCancelled = true;
    };
  }, [page.placements, page.backgroundConfig]);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for super-crisp retina display
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    const layout = getLayoutById(page.layoutId);
    const margins = page.customMargins || album.margins;

    renderAlbumPage(ctx, displayWidth, displayHeight, pageDims, margins, layout, page.placements, photosMap, {
      showSlotBorders: true,
      activeSlotIndex: interactive ? activeSlotIndex : null,
      hoverSlotIndex: interactive ? hoverSlotIndex : null,
      showMarginGuides: interactive && showMarginGuides,
      backgroundColor: page.backgroundColor || '#ffffff',
      backgroundConfig: page.backgroundConfig,
      pageNumber: page.pageNumber,
      showPageNumber: false,
      emptySlotPlaceholderText: interactive,
      isExport: false,
    });

    ctx.restore();
  }, [
    page,
    album.margins,
    pageDims,
    displayWidth,
    displayHeight,
    photosMap,
    activeSlotIndex,
    hoverSlotIndex,
    showMarginGuides,
    interactive,
  ]);

  // Find slot from mouse/touch point
  const getSlotAtPoint = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const layout = getLayoutById(page.layoutId);
    const margins = page.customMargins || album.margins;
    const frames = computeSlotFrames(displayWidth, displayHeight, pageDims, margins, layout);

    for (const f of frames) {
      if (x >= f.x && x <= f.x + f.width && y >= f.y && y <= f.y + f.height) {
        return f.slotIndex;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    const slotIdx = getSlotAtPoint(e.clientX, e.clientY);

    if (slotIdx !== null) {
      onSelectSlot(slotIdx);
      const placement = page.placements.find((p) => p.slotIndex === slotIdx);

      if (placement?.photoId) {
        setIsDragging(true);
        hasMovedRef.current = false;
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // pointer capture safety
        }
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          initTransX: placement.translationX,
          initTransY: placement.translationY,
        };
      } else {
        onEmptySlotClick?.(slotIdx);
      }
    } else {
      onSelectSlot(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive) return;

    if (isDragging && activeSlotIndex !== null) {
      hasMovedRef.current = true;
      const scaleFactor = displayWidth / pageDims.widthMm;
      const deltaX = (e.clientX - dragStartRef.current.x) / scaleFactor;
      const deltaY = (e.clientY - dragStartRef.current.y) / scaleFactor;

      // Realtime drag update with skipHistory to guarantee buttery 60fps responsiveness
      onUpdatePlacement(
        activeSlotIndex,
        (prev) => ({
          ...prev,
          translationX: Math.round(dragStartRef.current.initTransX + deltaX),
          translationY: Math.round(dragStartRef.current.initTransY + deltaY),
        }),
        { skipHistory: true }
      );
    } else {
      const hovered = getSlotAtPoint(e.clientX, e.clientY);
      setHoverSlotIndex(hovered);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture release safety
      }
      if (hasMovedRef.current) {
        onCommitPlacementHistory?.();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom photo on wheel if user holds Ctrl/Cmd or Alt, or if specifically interacting with slot
    if (!interactive || activeSlotIndex === null) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
    
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;

    onUpdatePlacement(activeSlotIndex, (prev) => {
      const newScale = Math.min(4.0, Math.max(1.0, Number((prev.scale + zoomDelta).toFixed(2))));
      return {
        ...prev,
        scale: newScale,
      };
    });
  };

  // Find active slot dimensions for floating quick controls
  const layout = getLayoutById(page.layoutId);
  const margins = page.customMargins || album.margins;
  const slotFrames = computeSlotFrames(displayWidth, displayHeight, pageDims, margins, layout);
  const activeFrame = activeSlotIndex !== null ? slotFrames.find((f) => f.slotIndex === activeSlotIndex) : null;
  const activePlacement = activeSlotIndex !== null ? page.placements.find((p) => p.slotIndex === activeSlotIndex) : null;
  const hasActivePhoto = Boolean(activePlacement?.photoId);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center p-2 select-none"
      onWheel={handleWheel}
    >
      <div
        className="relative shadow-2xl rounded-xs ring-1 ring-black/10 overflow-visible transition-colors duration-200"
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor: page.backgroundColor || '#ffffff',
        }}
      >
        <canvas
          ref={canvasRef}
          className={`block w-full h-full touch-none ${
            interactive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
          }`}
          style={{
            width: displayWidth,
            height: displayHeight,
            backgroundColor: page.backgroundColor || '#ffffff',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* Dragging state indicator */}
        {isDragging && (
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-slate-900/90 text-white text-xs font-medium rounded-full shadow-lg pointer-events-none flex items-center gap-1.5 backdrop-blur-xs">
            <Move className="w-3 h-3 text-blue-400" />
            <span>Panning photo...</span>
          </div>
        )}

        {/* Floating Quick Action Toolbar for Active Slot */}
        {interactive && activeFrame && (
          <div
            className="absolute z-20 transition-all pointer-events-auto"
            style={{
              left: Math.max(8, Math.min(displayWidth - 280, activeFrame.x + activeFrame.width / 2 - 140)),
              top:
                activeFrame.y > 48
                  ? activeFrame.y - 42
                  : Math.min(displayHeight - 44, activeFrame.y + activeFrame.height + 8),
            }}
          >
            <div className="flex items-center gap-1 bg-slate-900/95 text-white px-2 py-1 rounded-full shadow-xl border border-slate-700/80 backdrop-blur-md text-xs">
              {hasActivePhoto ? (
                <>
                  {/* Photo Zoom In / Out */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlacement(activeSlotIndex!, (prev) => ({
                        ...prev,
                        scale: Math.max(1.0, Number((prev.scale - 0.15).toFixed(2))),
                      }));
                    }}
                    title="Zoom Out Photo"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono text-slate-300 px-0.5">
                    {Math.round((activePlacement?.scale || 1) * 100)}%
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlacement(activeSlotIndex!, (prev) => ({
                        ...prev,
                        scale: Math.min(4.0, Number((prev.scale + 0.15).toFixed(2))),
                      }));
                    }}
                    title="Zoom In Photo"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-slate-700 mx-0.5" />

                  {/* Rotate 90° */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlacement(activeSlotIndex!, (prev) => ({
                        ...prev,
                        rotation: (prev.rotation + 90) % 360,
                      }));
                    }}
                    title="Rotate 90°"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Replace Photo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEmptySlotClick?.(activeSlotIndex!);
                    }}
                    title="Change Photo"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition flex items-center gap-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                  </button>

                  {/* Frame Picker */}
                  {onOpenFramePicker && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFramePicker();
                      }}
                      title="Photo Frame & Mats"
                      className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-amber-400 transition"
                    >
                      <Frame className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Reset Pan & Scale */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlacement(activeSlotIndex!, () => ({
                        scale: 1.0,
                        translationX: 0,
                        translationY: 0,
                        rotation: 0,
                      }));
                    }}
                    title="Reset Pan & Zoom"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>

                  {/* Remove Photo */}
                  {onRemovePhoto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhoto(activeSlotIndex!);
                      }}
                      title="Remove Photo"
                      className="p-1 hover:bg-red-950/80 rounded-full text-slate-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </>
              ) : (
                /* Empty slot quick action */
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmptySlotClick?.(activeSlotIndex!);
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 font-semibold text-blue-400 hover:text-white transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PageCanvas = AlbumPageCanvas;

