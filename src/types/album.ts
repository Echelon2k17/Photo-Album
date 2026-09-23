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

export type FrameCategory = 'mat' | 'wood' | 'metallic' | 'vintage' | 'minimal' | 'fun' | 'custom';

export interface PhotoFrameConfig {
  styleId?: string;
  category?: FrameCategory;
  name?: string;
  type: 'none' | 'border' | 'mat' | 'wood' | 'metallic' | 'polaroid' | 'vintage' | 'minimal' | 'floral' | 'smiley' | 'custom_image';
  borderWidthMm: number;        // Frame or mat thickness in mm
  borderColor: string;          // Primary frame color
  innerBorderWidthMm?: number;  // Inner reveal line or accent border in mm
  innerBorderColor?: string;    // Accent border color
  matColor?: string;            // Secondary matting tone
  matWidthMm?: number;          // Additional mat margin in mm
  bottomExtraMm?: number;       // Extra margin at bottom for Polaroid / caption
  cornerRadiusMm?: number;      // Corner radius in mm
  shadow?: boolean;             // Realistic soft drop shadow
  shadowBlurMm?: number;        // Shadow blur radius in mm
  texture?: 'plain' | 'wood' | 'brushed' | 'film' | 'scallop' | 'floral' | 'smiley';
  caption?: string;             // Optional caption label on polaroid bottom
  customImageUrl?: string;      // Custom user-uploaded frame/sticker image
}

export type PhotoFilterType =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'vivid'
  | 'noir'
  | 'fade';

export interface PhotoFilterDef {
  id: PhotoFilterType;
  name: string;
  cssFilter: string;
  previewColor: string;
}

export const PHOTO_FILTERS: PhotoFilterDef[] = [
  { id: 'none', name: 'Original', cssFilter: 'none', previewColor: '#94a3b8' },
  { id: 'grayscale', name: 'B&W Film', cssFilter: 'grayscale(100%) contrast(108%)', previewColor: '#64748b' },
  { id: 'sepia', name: 'Warm Sepia', cssFilter: 'sepia(85%) contrast(105%) brightness(98%)', previewColor: '#b45309' },
  { id: 'warm', name: 'Golden Hour', cssFilter: 'sepia(25%) saturate(135%) brightness(104%)', previewColor: '#f59e0b' },
  { id: 'cool', name: 'Cool Breeze', cssFilter: 'saturate(85%) hue-rotate(15deg) contrast(105%) brightness(102%)', previewColor: '#06b6d4' },
  { id: 'vintage', name: 'Vintage 70s', cssFilter: 'sepia(45%) contrast(118%) brightness(95%) saturate(85%)', previewColor: '#d97706' },
  { id: 'vivid', name: 'Vivid Pop', cssFilter: 'saturate(155%) contrast(115%) brightness(102%)', previewColor: '#ef4444' },
  { id: 'noir', name: 'Classic Noir', cssFilter: 'grayscale(100%) contrast(165%) brightness(90%)', previewColor: '#1e293b' },
  { id: 'fade', name: 'Matte Fade', cssFilter: 'contrast(92%) brightness(112%) saturate(82%)', previewColor: '#8b5cf6' },
];

export interface PhotoPlacement {
  slotIndex: number;
  photoId: string;
  scale: number;        // 1.0 = base cover, > 1.0 zoomed
  translationX: number; // px shift inside slot
  translationY: number; // px shift inside slot
  rotation: number;     // 0, 90, 180, 270
  frameConfig?: PhotoFrameConfig;
  filter?: PhotoFilterType;
}

export type BackgroundType = 'color' | 'gradient' | 'texture' | 'image';

export interface GradientStop {
  color: string;
  offset: number; // 0 to 1
}

export interface PageBackgroundConfig {
  type: BackgroundType;
  color?: string; // hex
  gradient?: {
    id: string;
    name: string;
    type: 'linear' | 'radial';
    angle?: number; // degrees, default 135
    stops: GradientStop[];
  };
  texture?: 'linen' | 'paper' | 'grid' | 'dots' | 'canvas' | 'woodgrain' | 'terrazzo' | 'stripes' | 'geometric' | 'flowers' | 'smiley' | 'hearts' | 'botanical';
  textureBaseColor?: string;
  photoId?: string;
  customImageUrl?: string; // Direct uploaded custom background image
  photoOpacity?: number; // 0.05 to 1.0, default 0.3
  photoBlur?: number;    // px, default 0
}

export interface AlbumPage {
  id: string;
  albumId: string;
  pageNumber: number;
  layoutId: string;
  backgroundColor: string;
  backgroundConfig?: PageBackgroundConfig;
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
