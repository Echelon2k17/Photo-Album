export type PageSizePreset = 'A4_PORTRAIT' | 'A4_LANDSCAPE' | 'US_LETTER_PORTRAIT' | 'US_LETTER_LANDSCAPE' | 'SQUARE_8X8' | 'SQUARE_12X12' | 'CUSTOM';

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
  name: string;
}

export const PAGE_SIZE_CONFIGS: Record<PageSizePreset, PageDimensions> = {
  A4_PORTRAIT: { widthMm: 210, heightMm: 297, name: 'A4 Portrait (210 × 297 mm)' },
  A4_LANDSCAPE: { widthMm: 297, heightMm: 210, name: 'A4 Landscape (297 × 210 mm)' },
  US_LETTER_PORTRAIT: { widthMm: 215.9, heightMm: 279.4, name: 'US Letter Portrait (8.5 × 11 in)' },
  US_LETTER_LANDSCAPE: { widthMm: 279.4, heightMm: 215.9, name: 'US Letter Landscape (11 × 8.5 in)' },
  SQUARE_8X8: { widthMm: 203.2, heightMm: 203.2, name: 'Square 8×8 in (203 × 203 mm)' },
  SQUARE_12X12: { widthMm: 304.8, heightMm: 304.8, name: 'Square 12×12 in (305 × 305 mm)' },
  CUSTOM: { widthMm: 250, heightMm: 250, name: 'Custom Dimensions' },
};

export interface PageMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
  gapMm: number; // Gap between photos
}

export interface LayoutSlot {
  id: string;
  x: number; // Normalized 0..1 in content area
  y: number; // Normalized 0..1 in content area
  width: number; // Normalized 0..1
  height: number; // Normalized 0..1
}

export interface AlbumLayout {
  id: string;
  name: string;
  category: string;
  slotsCount: number;
  description: string;
  slots: LayoutSlot[];
}

export interface PhotoPlacement {
  slotIndex: number;
  photoId: string;
  scale: number;        // 1.0 = base cover, > 1.0 zoomed
  translationX: number; // px shift inside slot
  translationY: number; // px shift inside slot
  rotation: number;     // 0, 90, 180, 270
}

export interface AlbumPage {
  id: string;
  albumId: string;
  pageNumber: number;
  layoutId: string;
  backgroundColor: string;
  placements: PhotoPlacement[]; // mapped by slotIndex
  customMargins?: PageMargins;
  createdAt: number;
  updatedAt: number;
}

export interface StoredPhoto {
  id: string;
  albumId: string;
  name: string;
  originalBlob: Blob;
  previewUrl: string; // Object URL or Base64 thumbnail
  thumbnailUrl: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: number;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  pageSizePreset: PageSizePreset;
  customWidthMm?: number;
  customHeightMm?: number;
  margins: PageMargins;
  defaultLayoutId: string;
  coverPhotoId?: string;
  createdAt: number;
  updatedAt: number;
}

export type ExportDpi = 150 | 300 | 450;
export type ExportFormat = 'PDF' | 'ZIP_JPEG';

export interface ExportSettings {
  format: ExportFormat;
  dpi: ExportDpi;
  jpegQuality: number; // 0.8 to 1.0
  includePageNumbers: boolean;
}
