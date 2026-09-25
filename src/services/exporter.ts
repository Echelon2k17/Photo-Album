import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Album, AlbumPage, ExportSettings, PAGE_SIZE_CONFIGS, PageDimensions } from '../types/album';
import { getPhotoById, toBlob } from './db';
import { getLayoutById } from './layouts';
import { renderAlbumPage, RenderPhotoSource } from './renderer';

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  stage: 'idle' | 'rendering' | 'compressing' | 'packaging' | 'complete' | 'error';
  message: string;
}

export function computeCanvasDimensions(
  pageDims: PageDimensions,
  dpi: number
): { widthPx: number; heightPx: number } {
  const mmToInches = 1 / 25.4;
  const widthInches = pageDims.widthMm * mmToInches;
  const heightInches = pageDims.heightMm * mmToInches;

  const widthPx = Math.round(widthInches * dpi);
  const heightPx = Math.round(heightInches * dpi);

  return { widthPx, heightPx };
}

/**
 * Loads the best available image source for high-resolution print export.
 * Prefers the original uncompressed blob, gracefully falling back to preview blob or data URL.
 */
async function loadOriginalPhotoForExport(photoId: string): Promise<RenderPhotoSource | null> {
  const photo = await getPhotoById(photoId);
  if (!photo) return null;

  const sourceBlob = toBlob(photo.originalBlob, photo.mimeType) || toBlob(photo.previewBlob, photo.mimeType);

  if (sourceBlob) {
    let url = '';
    try {
      url = URL.createObjectURL(sourceBlob);
      const res = await new Promise<RenderPhotoSource | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({
            image: img,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
      if (res) return res;
    } catch {
      if (url) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    }
  }

  // Fallback to active previewUrl or permanent Base64 thumbnailUrl
  const fallbackUrl = photo.previewUrl || photo.thumbnailUrl;
  if (!fallbackUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        image: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => resolve(null);
    img.src = fallbackUrl;
  });
}

/**
 * Exports the album sequentially page-by-page to guarantee memory safety.
 */
export async function exportAlbum(
  album: Album,
  pages: AlbumPage[],
  settings: ExportSettings,
  onProgress?: (progress: ExportProgress) => void
): Promise<{ blob: Blob; fileName: string }> {
  const pageDims: PageDimensions =
    album.pageSizePreset === 'CUSTOM' && album.customWidthMm && album.customHeightMm
      ? { widthMm: album.customWidthMm, heightMm: album.customHeightMm, name: 'Custom' }
      : PAGE_SIZE_CONFIGS[album.pageSizePreset] || PAGE_SIZE_CONFIGS.A4_LANDSCAPE;

  const { widthPx, heightPx } = computeCanvasDimensions(pageDims, settings.dpi);
  const totalPages = pages.length;

  if (settings.format === 'PDF') {
    // Determine orientation for jsPDF
    const isLandscape = pageDims.widthMm > pageDims.heightMm;
    const orientation = isLandscape ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pageDims.widthMm, pageDims.heightMm],
      compress: true,
    });

    // Reuse a single off-screen canvas to avoid creating multiple large canvas buffers
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context creation failed');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = i + 1;

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'rendering',
        message: `Rendering Page ${pageNum} of ${totalPages} at ${settings.dpi} DPI...`,
      });

      // 1. Fetch only original images needed for this specific page
      const placementIds = page.placements.map((p) => p.photoId).filter(Boolean);
      const bgPhotoId = page.backgroundConfig?.type === 'image' ? page.backgroundConfig.photoId : undefined;
      const allPhotoIds = bgPhotoId ? [...placementIds, bgPhotoId] : placementIds;
      const requiredPhotoIds = Array.from(new Set(allPhotoIds));
      const photosMap = new Map<string, RenderPhotoSource>();

      for (const photoId of requiredPhotoIds) {
        const source = await loadOriginalPhotoForExport(photoId);
        if (source) photosMap.set(photoId, source);
      }

      if (page.backgroundConfig?.type === 'image' && page.backgroundConfig.customImageUrl) {
        const bgImg = new Image();
        await new Promise<void>((res) => {
          bgImg.onload = () => res();
          bgImg.onerror = () => res();
          bgImg.src = page.backgroundConfig!.customImageUrl!;
        });
        if (bgImg.naturalWidth > 0) {
          photosMap.set('custom_bg', {
            image: bgImg,
            width: bgImg.naturalWidth,
            height: bgImg.naturalHeight,
          });
        }
      }

      // 2. Render page using the universal renderer
      const layout = getLayoutById(page.layoutId);
      const margins = page.customMargins || album.margins;

      renderAlbumPage(ctx, widthPx, heightPx, pageDims, margins, layout, page.placements, photosMap, {
        backgroundColor: page.backgroundColor || '#ffffff',
        backgroundConfig: page.backgroundConfig,
        pageNumber: pageNum,
        showPageNumber: settings.includePageNumbers,
        isExport: true,
      });

      // 3. Convert to JPEG data URI with configured quality
      const jpegDataUrl = canvas.toDataURL('image/jpeg', settings.jpegQuality);

      if (i > 0) {
        pdf.addPage([pageDims.widthMm, pageDims.heightMm], orientation);
      }
      pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, pageDims.widthMm, pageDims.heightMm, undefined, 'FAST');

      // 4. Release memory for this page
      photosMap.clear();

      // Brief breather for garbage collection & UI responsiveness
      await new Promise((r) => setTimeout(r, 20));
    }

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'packaging',
      message: 'Compiling print-ready PDF document...',
    });

    const pdfBlob = pdf.output('blob');
    const safeName = album.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Album';
    const fileName = `${safeName}_${settings.dpi}DPI.pdf`;

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'complete',
      message: 'Export complete!',
    });

    return { blob: pdfBlob, fileName };
  } else {
    // ZIP EXPORT
    const zip = new JSZip();
    const folderName = album.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Photo_Album';
    const folder = zip.folder(folderName) || zip;

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context creation failed');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = i + 1;

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'rendering',
        message: `Rendering Page ${pageNum} of ${totalPages} at ${settings.dpi} DPI...`,
      });

      // Load original images for this page only
      const placementIds = page.placements.map((p) => p.photoId).filter(Boolean);
      const bgPhotoId = page.backgroundConfig?.type === 'image' ? page.backgroundConfig.photoId : undefined;
      const allPhotoIds = bgPhotoId ? [...placementIds, bgPhotoId] : placementIds;
      const requiredPhotoIds = Array.from(new Set(allPhotoIds));
      const photosMap = new Map<string, RenderPhotoSource>();

      for (const photoId of requiredPhotoIds) {
        const source = await loadOriginalPhotoForExport(photoId);
        if (source) photosMap.set(photoId, source);
      }

      if (page.backgroundConfig?.type === 'image' && page.backgroundConfig.customImageUrl) {
        const bgImg = new Image();
        await new Promise<void>((res) => {
          bgImg.onload = () => res();
          bgImg.onerror = () => res();
          bgImg.src = page.backgroundConfig!.customImageUrl!;
        });
        if (bgImg.naturalWidth > 0) {
          photosMap.set('custom_bg', {
            image: bgImg,
            width: bgImg.naturalWidth,
            height: bgImg.naturalHeight,
          });
        }
      }

      const layout = getLayoutById(page.layoutId);
      const margins = page.customMargins || album.margins;

      renderAlbumPage(ctx, widthPx, heightPx, pageDims, margins, layout, page.placements, photosMap, {
        backgroundColor: page.backgroundColor || '#ffffff',
        backgroundConfig: page.backgroundConfig,
        pageNumber: pageNum,
        showPageNumber: settings.includePageNumbers,
        isExport: true,
      });

      // Export canvas to JPEG blob
      const pageBlob: Blob = await new Promise((res) => {
        canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', settings.jpegQuality);
      });

      const paddedIndex = String(pageNum).padStart(3, '0');
      const pageFileName = `Album_Page_${paddedIndex}.jpg`;
      folder.file(pageFileName, pageBlob);

      photosMap.clear();
      await new Promise((r) => setTimeout(r, 20));
    }

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'packaging',
      message: 'Compressing JPEG archive into ZIP...',
    });

    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        onProgress?.({
          currentPage: totalPages,
          totalPages,
          stage: 'packaging',
          message: `Packaging ZIP archive: ${Math.round(metadata.percent)}%`,
        });
      }
    );

    const safeName = album.name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Album';
    const fileName = `${safeName}_Pages_JPEG.zip`;

    onProgress?.({
      currentPage: totalPages,
      totalPages,
      stage: 'complete',
      message: 'ZIP export complete!',
    });

    return { blob: zipBlob, fileName };
  }
}

/**
 * Downloads a Blob to user disk.
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
