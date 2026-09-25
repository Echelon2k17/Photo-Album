import { PhotoFilterAdjustments, PhotoFilterType, PHOTO_FILTERS } from '../types/album';

export const DEFAULT_PHOTO_ADJUSTMENTS: Required<PhotoFilterAdjustments> = {
  brightness: 100, // 50% to 150%, 100 = original
  contrast: 100,   // 50% to 150%, 100 = original
  grayscale: 0,    // 0% to 100%, 0 = original, 100 = Black & White
  sepia: 0,        // 0% to 100%, 0 = original, 100 = Full Sepia
};

/**
 * Checks whether the adjustments deviate from normal default state
 */
export function isAdjustmentsActive(adjustments?: PhotoFilterAdjustments): boolean {
  if (!adjustments) return false;
  const b = adjustments.brightness ?? 100;
  const c = adjustments.contrast ?? 100;
  const g = adjustments.grayscale ?? 0;
  const s = adjustments.sepia ?? 0;
  return b !== 100 || c !== 100 || g !== 0 || s !== 0;
}

/**
 * Constructs a Canvas 2D / CSS filter string for high-performance rendering.
 */
export function buildCanvasFilterString(
  preset?: PhotoFilterType,
  adjustments?: PhotoFilterAdjustments
): string {
  const parts: string[] = [];

  // 1. Preset filter from catalogue if active
  if (preset && preset !== 'none') {
    const found = PHOTO_FILTERS.find((f) => f.id === preset);
    if (found && found.cssFilter && found.cssFilter !== 'none') {
      parts.push(found.cssFilter);
    }
  }

  // 2. Fine-grained custom adjustments
  if (adjustments) {
    const g = adjustments.grayscale ?? 0;
    if (g > 0) {
      parts.push(`grayscale(${Math.min(100, Math.max(0, g))}%)`);
    }

    const s = adjustments.sepia ?? 0;
    if (s > 0) {
      parts.push(`sepia(${Math.min(100, Math.max(0, s))}%)`);
    }

    const b = adjustments.brightness ?? 100;
    if (b !== 100) {
      parts.push(`brightness(${Math.min(200, Math.max(20, b))}%)`);
    }

    const c = adjustments.contrast ?? 100;
    if (c !== 100) {
      parts.push(`contrast(${Math.min(200, Math.max(20, c))}%)`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Core Canvas API Pixel Processing Layer.
 * Direct in-memory pixel manipulation using CanvasRenderingContext2D,
 * getImageData(), Uint8ClampedArray pixel buffers, and putImageData().
 *
 * Implements:
 * - Black & White (Grayscale via NTSC / Rec. 601 Luminance weights: 0.299R + 0.587G + 0.114B)
 * - Warm Sepia (Color matrix transformation based on W3C standard formulas)
 * - Brightness (Linear scalar multiplier)
 * - Contrast (Midpoint 128 expansion formula)
 */
export function applyCanvasPixelProcessing(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: PhotoFilterAdjustments
): void {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w <= 0 || h <= 0) return;

  const b = adjustments.brightness ?? 100;
  const c = adjustments.contrast ?? 100;
  const g = adjustments.grayscale ?? 0;
  const s = adjustments.sepia ?? 0;

  // If no adjustments are needed, exit early
  if (b === 100 && c === 100 && g === 0 && s === 0) {
    return;
  }

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch (e) {
    // Cross-origin canvas security fallback
    return;
  }

  const data = imgData.data;
  const totalPixels = data.length;

  // Pre-calculate transformation factors
  const brightnessMultiplier = b / 100;
  // Contrast expansion factor around midpoint 128
  // Standard digital photography contrast curve
  const contrastFactor = Math.tan(((c / 100) * Math.PI) / 4);
  const grayRatio = Math.min(1, Math.max(0, g / 100));
  const sepiaRatio = Math.min(1, Math.max(0, s / 100));

  for (let i = 0; i < totalPixels; i += 4) {
    let red = data[i];
    let green = data[i + 1];
    let blue = data[i + 2];

    // 1. Brightness Adjustment
    if (b !== 100) {
      red *= brightnessMultiplier;
      green *= brightnessMultiplier;
      blue *= brightnessMultiplier;
    }

    // 2. Contrast Adjustment
    if (c !== 100) {
      red = (red - 128) * contrastFactor + 128;
      green = (green - 128) * contrastFactor + 128;
      blue = (blue - 128) * contrastFactor + 128;
    }

    // 3. Black & White (Grayscale Luminance)
    if (grayRatio > 0) {
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      red = red + (luminance - red) * grayRatio;
      green = green + (luminance - green) * grayRatio;
      blue = blue + (luminance - blue) * grayRatio;
    }

    // 4. Sepia Tone Matrix
    if (sepiaRatio > 0) {
      const sepiaR = 0.393 * red + 0.769 * green + 0.189 * blue;
      const sepiaG = 0.349 * red + 0.686 * green + 0.168 * blue;
      const sepiaB = 0.272 * red + 0.534 * green + 0.131 * blue;

      red = red + (sepiaR - red) * sepiaRatio;
      green = green + (sepiaG - green) * sepiaRatio;
      blue = blue + (sepiaB - blue) * sepiaRatio;
    }

    // Clamping to [0, 255]
    data[i] = red < 0 ? 0 : red > 255 ? 255 : (red + 0.5) | 0;
    data[i + 1] = green < 0 ? 0 : green > 255 ? 255 : (green + 0.5) | 0;
    data[i + 2] = blue < 0 ? 0 : blue > 255 ? 255 : (blue + 0.5) | 0;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Creates an off-screen processed canvas using the Canvas API.
 * Combines hardware ctx.filter with fallback Canvas API pixel manipulation.
 */
export function processImageWithCanvasApi(
  sourceImage: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  adjustments?: PhotoFilterAdjustments,
  preset?: PhotoFilterType
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(sourceWidth));
  canvas.height = Math.max(1, Math.floor(sourceHeight));

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const filterStr = buildCanvasFilterString(preset, adjustments);

  // If browser supports ctx.filter
  if (filterStr && filterStr !== 'none' && 'filter' in ctx) {
    try {
      ctx.filter = filterStr;
      ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      return canvas;
    } catch {
      // Fallback to manual pixel manipulation
    }
  }

  // Draw source image and apply direct pixel processing
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  if (adjustments && isAdjustmentsActive(adjustments)) {
    applyCanvasPixelProcessing(ctx, canvas.width, canvas.height, adjustments);
  }

  return canvas;
}

/**
 * Generates a fast base64 preview thumbnail data URL using the Canvas API.
 */
export async function generateFilteredThumbnailDataUrl(
  imageSource: CanvasImageSource | string,
  adjustments?: PhotoFilterAdjustments,
  preset?: PhotoFilterType,
  maxWidth = 200,
  maxHeight = 150
): Promise<string> {
  let img: CanvasImageSource;

  if (typeof imageSource === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Failed to load image for filter thumbnail'));
      i.src = imageSource;
    });
  } else {
    img = imageSource;
  }

  const naturalW = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width || 300;
  const naturalH = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height || 200;

  const scale = Math.min(maxWidth / naturalW, maxHeight / naturalH, 1.0);
  const w = Math.round(naturalW * scale);
  const h = Math.round(naturalH * scale);

  const processedCanvas = processImageWithCanvasApi(img, w, h, adjustments, preset);
  return processedCanvas.toDataURL('image/jpeg', 0.85);
}
