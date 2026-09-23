import { AlbumLayout, PageDimensions, PageMargins, PhotoPlacement } from '../types/album';

export interface RenderPhotoSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}

export interface RenderPageOptions {
  showSlotBorders?: boolean;
  activeSlotIndex?: number | null;
  hoverSlotIndex?: number | null;
  showMarginGuides?: boolean;
  backgroundColor?: string;
  pageNumber?: number;
  showPageNumber?: boolean;
  emptySlotPlaceholderText?: boolean;
  isExport?: boolean;
}

export interface ComputedSlotFrame {
  slotIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates physical pixel coordinates for all layout slots given dimensions, margins, and gaps.
 */
export function computeSlotFrames(
  canvasWidthPx: number,
  canvasHeightPx: number,
  pageDimensionsMm: PageDimensions,
  margins: PageMargins,
  layout: AlbumLayout
): ComputedSlotFrame[] {
  const scaleFactor = canvasWidthPx / pageDimensionsMm.widthMm;

  const marginTopPx = margins.topMm * scaleFactor;
  const marginBottomPx = margins.bottomMm * scaleFactor;
  const marginLeftPx = margins.leftMm * scaleFactor;
  const marginRightPx = margins.rightMm * scaleFactor;
  const gapPx = margins.gapMm * scaleFactor;

  const contentX = marginLeftPx;
  const contentY = marginTopPx;
  const contentW = Math.max(0, canvasWidthPx - marginLeftPx - marginRightPx);
  const contentH = Math.max(0, canvasHeightPx - marginTopPx - marginBottomPx);

  return layout.slots.map((slot, index) => {
    const rawX = contentX + slot.x * contentW;
    const rawY = contentY + slot.y * contentH;
    const rawW = slot.width * contentW;
    const rawH = slot.height * contentH;

    const isLeftEdge = slot.x <= 0.002;
    const isRightEdge = slot.x + slot.width >= 0.998;
    const isTopEdge = slot.y <= 0.002;
    const isBottomEdge = slot.y + slot.height >= 0.998;

    const padLeft = isLeftEdge ? 0 : gapPx / 2;
    const padRight = isRightEdge ? 0 : gapPx / 2;
    const padTop = isTopEdge ? 0 : gapPx / 2;
    const padBottom = isBottomEdge ? 0 : gapPx / 2;

    const frameX = rawX + padLeft;
    const frameY = rawY + padTop;
    const frameW = Math.max(1, rawW - padLeft - padRight);
    const frameH = Math.max(1, rawH - padTop - padBottom);

    return {
      slotIndex: index,
      x: frameX,
      y: frameY,
      width: frameW,
      height: frameH,
    };
  });
}

/**
 * Universal Renderer: Identically executes for Editor, Live Preview, and High-Resolution Export.
 */
export function renderAlbumPage(
  ctx: CanvasRenderingContext2D,
  canvasWidthPx: number,
  canvasHeightPx: number,
  pageDimensionsMm: PageDimensions,
  margins: PageMargins,
  layout: AlbumLayout,
  placements: PhotoPlacement[],
  photosMap: Map<string, RenderPhotoSource>,
  options: RenderPageOptions = {}
) {
  const {
    showSlotBorders = false,
    activeSlotIndex = null,
    hoverSlotIndex = null,
    showMarginGuides = false,
    backgroundColor = '#ffffff',
    pageNumber,
    showPageNumber = false,
    emptySlotPlaceholderText = true,
    isExport = false,
  } = options;

  const scaleFactor = canvasWidthPx / pageDimensionsMm.widthMm;

  // 1. Clear background
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidthPx, canvasHeightPx);
  ctx.restore();

  // 2. Compute slots
  const slotFrames = computeSlotFrames(canvasWidthPx, canvasHeightPx, pageDimensionsMm, margins, layout);

  // 3. Render each slot
  slotFrames.forEach((frame) => {
    const placement = placements.find((p) => p.slotIndex === frame.slotIndex);
    const photoSource = placement?.photoId ? photosMap.get(placement.photoId) : undefined;

    ctx.save();
    // Clip to exact frame boundary
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.width, frame.height);
    ctx.clip();

    if (photoSource && photoSource.image) {
      // Photo rendering with pan, zoom, and rotation
      const { image, width: origW, height: origH } = photoSource;
      const rot = (placement?.rotation || 0) % 360;
      const userScale = Math.max(1.0, placement?.scale || 1.0);

      // Account for 90 or 270 deg rotation swapping effective dimensions
      const isRotatedQuarter = rot === 90 || rot === 270;
      const effW = isRotatedQuarter ? origH : origW;
      const effH = isRotatedQuarter ? origW : origH;

      // Base cover scale to ensure photo fills the slot without empty gaps
      const baseScale = Math.max(frame.width / effW, frame.height / effH);
      const totalScale = baseScale * userScale;

      const imgDrawW = origW * totalScale;
      const imgDrawH = origH * totalScale;

      // Translation is scaled proportionally to current canvas resolution
      const transX = (placement?.translationX || 0) * scaleFactor;
      const transY = (placement?.translationY || 0) * scaleFactor;

      const centerX = frame.x + frame.width / 2 + transX;
      const centerY = frame.y + frame.height / 2 + transY;

      ctx.save();
      ctx.translate(centerX, centerY);
      if (rot !== 0) {
        ctx.rotate((rot * Math.PI) / 180);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
      ctx.restore();
    } else {
      // Empty slot placeholder
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

      if (!isExport && emptySlotPlaceholderText) {
        // Draw elegant empty slot icon & text
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, 1.5 * (scaleFactor / 3));
        ctx.setLineDash([4 * (scaleFactor / 3), 4 * (scaleFactor / 3)]);
        ctx.strokeRect(frame.x + 2, frame.y + 2, frame.width - 4, frame.height - 4);
        ctx.setLineDash([]);

        const fontSize = Math.max(10, Math.min(22, Math.round(frame.height * 0.07)));
        ctx.fillStyle = '#94a3b8';
        ctx.font = `500 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+ Add Photo', frame.x + frame.width / 2, frame.y + frame.height / 2);
      }
    }

    ctx.restore(); // Restore clipping

    // 4. Editor frame highlights (active, hover, borders)
    if (!isExport) {
      const isActive = activeSlotIndex === frame.slotIndex;
      const isHover = hoverSlotIndex === frame.slotIndex;

      if (isActive) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = Math.max(2, 3 * (scaleFactor / 3));
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
        // Corner anchor points
        const cornerSize = Math.max(6, 8 * (scaleFactor / 3));
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(frame.x - cornerSize / 2, frame.y - cornerSize / 2, cornerSize, cornerSize);
        ctx.fillRect(frame.x + frame.width - cornerSize / 2, frame.y - cornerSize / 2, cornerSize, cornerSize);
        ctx.fillRect(frame.x - cornerSize / 2, frame.y + frame.height - cornerSize / 2, cornerSize, cornerSize);
        ctx.fillRect(frame.x + frame.width - cornerSize / 2, frame.y + frame.height - cornerSize / 2, cornerSize, cornerSize);
        ctx.restore();
      } else if (isHover) {
        ctx.save();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = Math.max(1.5, 2 * (scaleFactor / 3));
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
        ctx.restore();
      } else if (showSlotBorders) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = Math.max(1, 1 * (scaleFactor / 3));
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
        ctx.restore();
      }
    }
  });

  // 5. Margin guidelines (if enabled in editor)
  if (!isExport && showMarginGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const mTop = margins.topMm * scaleFactor;
    const mBottom = margins.bottomMm * scaleFactor;
    const mLeft = margins.leftMm * scaleFactor;
    const mRight = margins.rightMm * scaleFactor;
    ctx.strokeRect(mLeft, mTop, canvasWidthPx - mLeft - mRight, canvasHeightPx - mTop - mBottom);
    ctx.restore();
  }

  // 6. Page numbers (if requested)
  if (showPageNumber && pageNumber !== undefined) {
    ctx.save();
    const fontSize = Math.max(9, Math.round(9 * (scaleFactor / 3)));
    ctx.font = `400 ${fontSize}px sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const numY = canvasHeightPx - Math.max(4, (margins.bottomMm * scaleFactor) / 2);
    ctx.fillText(`${pageNumber}`, canvasWidthPx / 2, numY);
    ctx.restore();
  }
}
