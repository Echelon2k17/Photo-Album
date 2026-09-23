import {
  AlbumLayout,
  PageBackgroundConfig,
  PageDimensions,
  PageMargins,
  PhotoFrameConfig,
  PhotoPlacement
} from '../types/album';

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
  backgroundConfig?: PageBackgroundConfig;
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
 * Universal path drawing with rounded corners fallback
 */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, Math.min(w / 2, h / 2)));
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Renders the background (Color, Gradient, Texture, or Image) identically across Editor and Export.
 */
function drawPageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  bgConfig?: PageBackgroundConfig,
  fallbackColor = '#ffffff',
  photosMap?: Map<string, RenderPhotoSource>
) {
  ctx.save();

  if (!bgConfig || bgConfig.type === 'color') {
    ctx.fillStyle = bgConfig?.color || fallbackColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (bgConfig.type === 'gradient' && bgConfig.gradient) {
    const g = bgConfig.gradient;
    if (g.type === 'radial') {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.5
      );
      for (const s of g.stops) {
        grad.addColorStop(s.offset, s.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const angleDeg = g.angle ?? 135;
      const angleRad = (angleDeg * Math.PI) / 180;
      const diag = Math.sqrt(width * width + height * height);
      const cx = width / 2;
      const cy = height / 2;
      const x1 = cx - Math.cos(angleRad) * (diag / 2);
      const y1 = cy - Math.sin(angleRad) * (diag / 2);
      const x2 = cx + Math.cos(angleRad) * (diag / 2);
      const y2 = cy + Math.sin(angleRad) * (diag / 2);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      for (const s of g.stops) {
        grad.addColorStop(s.offset, s.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    return;
  }

  if (bgConfig.type === 'texture') {
    const baseColor = bgConfig.textureBaseColor || '#f7f4ed';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    if (bgConfig.texture === 'grid') {
      // Metric drafting grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = Math.max(0.5, 0.75 * (scaleFactor / 3));
      const step = Math.max(10, 10 * scaleFactor); // 10mm grid
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bgConfig.texture === 'dots') {
      // Dot matrix
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      const step = Math.max(12, 12 * scaleFactor);
      const r = Math.max(1, 1.2 * (scaleFactor / 3));
      for (let x = step / 2; x <= width; x += step) {
        for (let y = step / 2; y <= height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgConfig.texture === 'linen') {
      // Subtle linen woven cross-fibers
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.lineWidth = 0.8;
      const step = Math.max(4, Math.round(4 * (scaleFactor / 3)));
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bgConfig.texture === 'paper') {
      // Organic paper stippling flecks
      ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
      const numFlecks = Math.min(1200, Math.round((width * height) / 1200));
      // Deterministic PRNG for stable rendering
      let seed = 42;
      const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      for (let i = 0; i < numFlecks; i++) {
        const fx = rnd() * width;
        const fy = rnd() * height;
        const fr = rnd() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bgConfig.texture === 'canvas') {
      // Artists coarse woven canvas
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.038)';
      ctx.lineWidth = 0.9;
      const cStep = Math.max(5, Math.round(5 * (scaleFactor / 3)));
      for (let x = 0; x <= width; x += cStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += cStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.6;
      for (let x = cStep / 2; x <= width; x += cStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    } else if (bgConfig.texture === 'woodgrain') {
      // Natural vertical timber grain
      ctx.strokeStyle = 'rgba(120, 80, 40, 0.04)';
      ctx.lineWidth = 1.1;
      const wStep = Math.max(7, Math.round(7 * (scaleFactor / 3)));
      for (let x = 0; x <= width; x += wStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        const cpX = x + Math.sin(x * 0.06) * 5;
        ctx.quadraticCurveTo(cpX, height / 2, x, height);
        ctx.stroke();
      }
    } else if (bgConfig.texture === 'terrazzo') {
      // Mineral speckled washi paper
      const fleckColors = ['rgba(80, 60, 40, 0.05)', 'rgba(0, 0, 0, 0.035)', 'rgba(140, 110, 80, 0.045)'];
      let seed = 77;
      const rnd = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      const count = Math.min(1800, Math.round((width * height) / 900));
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = fleckColors[Math.floor(rnd() * fleckColors.length)];
        const fx = rnd() * width;
        const fy = rnd() * height;
        const fsize = rnd() * 2.2 + 0.6;
        ctx.beginPath();
        ctx.rect(fx, fy, fsize, fsize);
        ctx.fill();
      }
    } else if (bgConfig.texture === 'stripes') {
      // Archival vertical pinstripes
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.lineWidth = 0.8;
      const sStep = Math.max(9, Math.round(9 * (scaleFactor / 3)));
      for (let x = 0; x <= width; x += sStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    } else if (bgConfig.texture === 'geometric') {
      // Art-deco diamond lattice
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 0.8;
      const dStep = Math.max(16, Math.round(16 * (scaleFactor / 3)));
      for (let d = -height; d <= width; d += dStep) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + height, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d + height, 0);
        ctx.lineTo(d, height);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  if (bgConfig.type === 'image' && bgConfig.photoId && photosMap) {
    const photoSource = photosMap.get(bgConfig.photoId);
    if (photoSource && photoSource.image) {
      // Fill base neutral first
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const alpha = Math.max(0.05, Math.min(1, bgConfig.photoOpacity ?? 0.35));
      ctx.globalAlpha = alpha;

      if (bgConfig.photoBlur && bgConfig.photoBlur > 0) {
        const blurPx = Math.max(1, bgConfig.photoBlur * (scaleFactor / 3));
        ctx.filter = `blur(${blurPx}px)`;
      }

      const imgW = photoSource.width;
      const imgH = photoSource.height;
      const covScale = Math.max(width / imgW, height / imgH);
      const drawW = imgW * covScale;
      const drawH = imgH * covScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      try {
        ctx.drawImage(photoSource.image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      } catch (e) {
        ctx.fillStyle = fallbackColor;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    return;
  }

  // Fallback
  ctx.fillStyle = fallbackColor;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
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
    backgroundConfig,
    pageNumber,
    showPageNumber = false,
    emptySlotPlaceholderText = true,
    isExport = false,
  } = options;

  const scaleFactor = canvasWidthPx / pageDimensionsMm.widthMm;

  // 1. Render rich background (Color, Gradient, Texture, or Image)
  drawPageBackground(
    ctx,
    canvasWidthPx,
    canvasHeightPx,
    scaleFactor,
    backgroundConfig,
    backgroundColor,
    photosMap
  );

  // 2. Compute slots
  const slotFrames = computeSlotFrames(canvasWidthPx, canvasHeightPx, pageDimensionsMm, margins, layout);

  // 3. Render each slot
  slotFrames.forEach((frame) => {
    const placement = placements.find((p) => p.slotIndex === frame.slotIndex);
    const photoSource = placement?.photoId ? photosMap.get(placement.photoId) : undefined;
    const frameConfig = placement?.frameConfig;
    const hasFrame = frameConfig && frameConfig.type !== 'none';

    // 3a. Frame drop shadow (drawn on outer boundary if enabled)
    if (hasFrame && frameConfig.shadow) {
      ctx.save();
      const shadowBlur = Math.max(2, (frameConfig.shadowBlurMm || 3) * scaleFactor);
      const cr = Math.min(frame.width / 4, frame.height / 4, (frameConfig.cornerRadiusMm || 0) * scaleFactor);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(1, shadowBlur * 0.4);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (cr > 0) {
        roundRectPath(ctx, frame.x, frame.y, frame.width, frame.height, cr);
      } else {
        ctx.rect(frame.x, frame.y, frame.width, frame.height);
      }
      ctx.fill();
      ctx.restore();
    }

    // 3b. Outer Frame surface & aperture calculation
    let apertureX = frame.x;
    let apertureY = frame.y;
    let apertureW = frame.width;
    let apertureH = frame.height;
    const outerCr = hasFrame ? Math.min(frame.width / 4, frame.height / 4, (frameConfig.cornerRadiusMm || 0) * scaleFactor) : 0;

    if (hasFrame) {
      const borderW = Math.max(0, (frameConfig.borderWidthMm || 0) * scaleFactor);
      const matW = Math.max(0, (frameConfig.matWidthMm || 0) * scaleFactor);
      const bottomExtra = Math.max(0, (frameConfig.bottomExtraMm || 0) * scaleFactor);

      let topInset = borderW + matW;
      let leftInset = borderW + matW;
      let rightInset = borderW + matW;
      let bottomInset = borderW + matW + bottomExtra;

      // Prevent aperture collapse on small frames
      const maxInsetX = frame.width * 0.38;
      const maxInsetY = frame.height * 0.38;
      if (leftInset > maxInsetX) {
        const factor = maxInsetX / leftInset;
        topInset *= factor;
        leftInset *= factor;
        rightInset *= factor;
        bottomInset *= factor;
      }
      if (topInset > maxInsetY) {
        const factor = maxInsetY / topInset;
        topInset *= factor;
        bottomInset *= factor;
      }

      apertureX = frame.x + leftInset;
      apertureY = frame.y + topInset;
      apertureW = Math.max(8, frame.width - leftInset - rightInset);
      apertureH = Math.max(8, frame.height - topInset - bottomInset);

      // Draw the outer frame material
      ctx.save();
      ctx.beginPath();
      if (outerCr > 0) {
        roundRectPath(ctx, frame.x, frame.y, frame.width, frame.height, outerCr);
      } else {
        ctx.rect(frame.x, frame.y, frame.width, frame.height);
      }
      ctx.clip();

      if (frameConfig.type === 'wood') {
        ctx.fillStyle = frameConfig.borderColor || '#d8b98a';
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
        // Timber texture
        ctx.strokeStyle = frameConfig.innerBorderColor || 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < frame.height; i += Math.max(4, 4 * (scaleFactor / 3))) {
          ctx.beginPath();
          ctx.moveTo(frame.x, frame.y + i);
          ctx.lineTo(frame.x + frame.width, frame.y + i);
          ctx.stroke();
        }
      } else if (frameConfig.type === 'metallic') {
        const grad = ctx.createLinearGradient(frame.x, frame.y, frame.x + frame.width, frame.y + frame.height);
        grad.addColorStop(0, frameConfig.borderColor || '#d4af37');
        grad.addColorStop(0.3, '#ffffff');
        grad.addColorStop(0.6, frameConfig.borderColor || '#d4af37');
        grad.addColorStop(1, frameConfig.innerBorderColor || '#aa820a');
        ctx.fillStyle = grad;
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      } else if (frameConfig.type === 'polaroid') {
        ctx.fillStyle = frameConfig.matColor || frameConfig.borderColor || '#faf9f6';
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      } else if (frameConfig.type === 'vintage') {
        ctx.fillStyle = frameConfig.borderColor || '#f4f0ea';
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      } else {
        // 'mat' or 'minimal' / 'border'
        ctx.fillStyle = frameConfig.matColor || frameConfig.borderColor || '#ffffff';
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
      }

      // Draw optional inner border line / bevel reveal
      if (frameConfig.innerBorderWidthMm && frameConfig.innerBorderWidthMm > 0) {
        const innerBorderW = Math.max(1, frameConfig.innerBorderWidthMm * scaleFactor);
        ctx.strokeStyle = frameConfig.innerBorderColor || 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = innerBorderW;
        ctx.strokeRect(apertureX - innerBorderW / 2, apertureY - innerBorderW / 2, apertureW + innerBorderW, apertureH + innerBorderW);
      }

      // Polaroid bottom caption
      if (frameConfig.bottomExtraMm && frameConfig.bottomExtraMm > 0 && frameConfig.caption) {
        const capY = apertureY + apertureH + (frame.y + frame.height - (apertureY + apertureH)) / 2;
        const fontSize = Math.max(10, Math.min(22, Math.round(bottomExtra * 0.35)));
        ctx.fillStyle = '#334155';
        ctx.font = `500 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameConfig.caption, frame.x + frame.width / 2, capY);
      }

      ctx.restore();
    }

    // 3c. Draw Photo inside aperture (or placeholder)
    ctx.save();
    ctx.beginPath();
    const innerCr = hasFrame ? Math.max(0, outerCr - (apertureX - frame.x)) : 0;
    if (innerCr > 0) {
      roundRectPath(ctx, apertureX, apertureY, apertureW, apertureH, innerCr);
    } else {
      ctx.rect(apertureX, apertureY, apertureW, apertureH);
    }
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

      // Base cover scale to ensure photo fills the aperture without empty gaps
      const baseScale = Math.max(apertureW / effW, apertureH / effH);
      const totalScale = baseScale * userScale;

      const imgDrawW = origW * totalScale;
      const imgDrawH = origH * totalScale;

      // Translation is scaled proportionally to current canvas resolution
      const transX = (placement?.translationX || 0) * scaleFactor;
      const transY = (placement?.translationY || 0) * scaleFactor;

      const centerX = apertureX + apertureW / 2 + transX;
      const centerY = apertureY + apertureH / 2 + transY;

      ctx.save();
      ctx.translate(centerX, centerY);
      if (rot !== 0) {
        ctx.rotate((rot * Math.PI) / 180);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      try {
        ctx.drawImage(image, -imgDrawW / 2, -imgDrawH / 2, imgDrawW, imgDrawH);
      } catch (e) {
        // Fallback for broken or unpaintable image
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-apertureW / 2, -apertureH / 2, apertureW, apertureH);
      }
      ctx.restore();
    } else {
      // Empty slot placeholder
      ctx.fillStyle = hasFrame ? '#f1f5f9' : '#f8fafc';
      ctx.fillRect(apertureX, apertureY, apertureW, apertureH);

      if (!isExport && emptySlotPlaceholderText) {
        // Draw elegant empty slot icon & text
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.max(1, 1.5 * (scaleFactor / 3));
        ctx.setLineDash([4 * (scaleFactor / 3), 4 * (scaleFactor / 3)]);
        ctx.strokeRect(apertureX + 2, apertureY + 2, apertureW - 4, apertureH - 4);
        ctx.setLineDash([]);

        const fontSize = Math.max(10, Math.min(22, Math.round(apertureH * 0.07)));
        ctx.fillStyle = '#94a3b8';
        ctx.font = `500 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+ Add Photo', apertureX + apertureW / 2, apertureY + apertureH / 2);
      }
    }

    ctx.restore(); // Restore aperture clipping

    // 4. Editor frame highlights (active, hover, borders)
    if (!isExport) {
      const isActive = activeSlotIndex === frame.slotIndex;
      const isHover = hoverSlotIndex === frame.slotIndex;

      if (isActive) {
        ctx.save();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = Math.max(2, 3 * (scaleFactor / 3));
        if (outerCr > 0) {
          ctx.beginPath();
          roundRectPath(ctx, frame.x, frame.y, frame.width, frame.height, outerCr);
          ctx.stroke();
        } else {
          ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
        }
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
        if (outerCr > 0) {
          ctx.beginPath();
          roundRectPath(ctx, frame.x, frame.y, frame.width, frame.height, outerCr);
          ctx.stroke();
        } else {
          ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
        }
        ctx.restore();
      } else if (showSlotBorders && !hasFrame) {
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
