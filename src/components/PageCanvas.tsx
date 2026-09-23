import React, { useEffect, useRef, useState } from 'react';
import { getPhotoById } from '../services/db';
import { getLayoutById } from '../services/layouts';
import { computeSlotFrames, renderAlbumPage, RenderPhotoSource } from '../services/renderer';
import { Album, AlbumPage, PAGE_SIZE_CONFIGS, PageDimensions } from '../types/album';

interface PageCanvasProps {
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
    }
  ) => void;
  onEmptySlotClick?: (slotIndex: number) => void;
  showMarginGuides?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  interactive?: boolean;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({
  album,
  page,
  activeSlotIndex,
  onSelectSlot,
  onUpdatePlacement,
  onEmptySlotClick,
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

  const pageDims: PageDimensions =
    album.pageSizePreset === 'CUSTOM' && album.customWidthMm && album.customHeightMm
      ? { widthMm: album.customWidthMm, heightMm: album.customHeightMm, name: 'Custom' }
      : PAGE_SIZE_CONFIGS[album.pageSizePreset] || PAGE_SIZE_CONFIGS.A4_LANDSCAPE;

  const aspectRatio = pageDims.widthMm / pageDims.heightMm;

  // Compute display size that fits in maxWidth / maxHeight
  let displayWidth = maxWidth;
  let displayHeight = Math.round(displayWidth / aspectRatio);

  if (displayHeight > maxHeight) {
    displayHeight = maxHeight;
    displayWidth = Math.round(displayHeight * aspectRatio);
  }

  // Load preview/thumbnail images for this page (interactive tier)
  useEffect(() => {
    let isCancelled = false;
    const loadImages = async () => {
      const requiredPhotoIds = Array.from(new Set(page.placements.map((p) => p.photoId).filter(Boolean)));
      const newMap = new Map<string, RenderPhotoSource>();

      for (const id of requiredPhotoIds) {
        const photo = await getPhotoById(id);
        if (photo && !isCancelled) {
          // Use previewUrl for crisp lag-free interactive canvas
          const img = new Image();
          img.src = photo.previewUrl;
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          newMap.set(id, {
            image: img,
            width: photo.width,
            height: photo.height,
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
  }, [page.placements]);

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
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      const scaleFactor = displayWidth / pageDims.widthMm;
      const deltaX = (e.clientX - dragStartRef.current.x) / scaleFactor;
      const deltaY = (e.clientY - dragStartRef.current.y) / scaleFactor;

      onUpdatePlacement(activeSlotIndex, (prev) => ({
        ...prev,
        translationX: Math.round(dragStartRef.current.initTransX + deltaX),
        translationY: Math.round(dragStartRef.current.initTransY + deltaY),
      }));
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
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!interactive || activeSlotIndex === null) return;
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

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center p-2 select-none"
      onWheel={handleWheel}
    >
      <div
        className="relative bg-white shadow-2xl rounded-xs ring-1 ring-black/10 overflow-hidden"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          className={`block w-full h-full ${interactive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          style={{ width: displayWidth, height: displayHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
};
