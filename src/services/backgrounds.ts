import { PageBackgroundConfig } from '../types/album';

export type BackgroundCategory =
  | 'Neutral & Clean'
  | 'Warm & Earthy'
  | 'Dramatic & Dark'
  | 'Elegance & Pastel'
  | 'Vibrant & Contemporary'
  | 'Wedding & Romance';

export interface BackgroundColorPreset {
  id: string;
  name: string;
  category: BackgroundCategory;
  hex: string;
  textColorHint: 'dark' | 'light';
}

export const BACKGROUND_COLOR_PRESETS: BackgroundColorPreset[] = [
  // 1. Neutral & Clean
  { id: 'white', name: 'Studio Pure White', category: 'Neutral & Clean', hex: '#ffffff', textColorHint: 'dark' },
  { id: 'chalk', name: 'Soft Chalk', category: 'Neutral & Clean', hex: '#fafafa', textColorHint: 'dark' },
  { id: 'smoke', name: 'Silver Smoke', category: 'Neutral & Clean', hex: '#f1f5f9', textColorHint: 'dark' },
  { id: 'slate-light', name: 'Cool Slate', category: 'Neutral & Clean', hex: '#e2e8f0', textColorHint: 'dark' },
  { id: 'zinc-mist', name: 'Zinc Mist', category: 'Neutral & Clean', hex: '#f4f4f5', textColorHint: 'dark' },
  { id: 'ash', name: 'Feather Ash', category: 'Neutral & Clean', hex: '#ebebeb', textColorHint: 'dark' },

  // 2. Warm & Earthy
  { id: 'linen', name: 'Fine Art Linen', category: 'Warm & Earthy', hex: '#f7f4ee', textColorHint: 'dark' },
  { id: 'ivory', name: 'Warm Ivory', category: 'Warm & Earthy', hex: '#fdfbf7', textColorHint: 'dark' },
  { id: 'cream', name: 'Alabaster Cream', category: 'Warm & Earthy', hex: '#f6f1e9', textColorHint: 'dark' },
  { id: 'sand', name: 'Desert Sand', category: 'Warm & Earthy', hex: '#ece5d8', textColorHint: 'dark' },
  { id: 'parchment', name: 'Parchment Antique', category: 'Warm & Earthy', hex: '#e8dec8', textColorHint: 'dark' },
  { id: 'terracotta-dust', name: 'Terracotta Dust', category: 'Warm & Earthy', hex: '#e7d4cb', textColorHint: 'dark' },
  { id: 'biscuit', name: 'Warm Biscuit', category: 'Warm & Earthy', hex: '#eee4d4', textColorHint: 'dark' },
  { id: 'raw-umber', name: 'Raw Umber Wash', category: 'Warm & Earthy', hex: '#dfd2c0', textColorHint: 'dark' },

  // 3. Dramatic & Dark
  { id: 'charcoal', name: 'Studio Charcoal', category: 'Dramatic & Dark', hex: '#27272a', textColorHint: 'light' },
  { id: 'noir', name: 'Gallery Noir', category: 'Dramatic & Dark', hex: '#18181b', textColorHint: 'light' },
  { id: 'obsidian', name: 'Velvet Black', category: 'Dramatic & Dark', hex: '#09090b', textColorHint: 'light' },
  { id: 'midnight', name: 'Deep Midnight Navy', category: 'Dramatic & Dark', hex: '#0f172a', textColorHint: 'light' },
  { id: 'forest', name: 'Emerald Pine', category: 'Dramatic & Dark', hex: '#14241d', textColorHint: 'light' },
  { id: 'espresso', name: 'Espresso Bean', category: 'Dramatic & Dark', hex: '#221915', textColorHint: 'light' },
  { id: 'oxblood', name: 'Deep Burgundy Oxblood', category: 'Dramatic & Dark', hex: '#2a1215', textColorHint: 'light' },
  { id: 'indigo-dusk', name: 'Indigo Dusk', category: 'Dramatic & Dark', hex: '#161d2f', textColorHint: 'light' },

  // 4. Elegance & Pastel
  { id: 'sage', name: 'Sage Mist', category: 'Elegance & Pastel', hex: '#eaf0ea', textColorHint: 'dark' },
  { id: 'rose', name: 'Dusty Rose', category: 'Elegance & Pastel', hex: '#f8ece9', textColorHint: 'dark' },
  { id: 'powder-blue', name: 'French Sky', category: 'Elegance & Pastel', hex: '#e8f0f8', textColorHint: 'dark' },
  { id: 'lavender', name: 'Hazy Lavender', category: 'Elegance & Pastel', hex: '#f0ecf4', textColorHint: 'dark' },
  { id: 'butter-cream', name: 'Butter Silk', category: 'Elegance & Pastel', hex: '#fdf9e7', textColorHint: 'dark' },
  { id: 'mint-ice', name: 'Spearmint Ice', category: 'Elegance & Pastel', hex: '#e9f5f2', textColorHint: 'dark' },

  // 5. Vibrant & Contemporary
  { id: 'terracotta-rich', name: 'Tuscan Terracotta', category: 'Vibrant & Contemporary', hex: '#c86d51', textColorHint: 'light' },
  { id: 'ochre-gold', name: 'Sunbaked Ochre', category: 'Vibrant & Contemporary', hex: '#d99b42', textColorHint: 'dark' },
  { id: 'dusty-teal', name: 'Aegean Sea Teal', category: 'Vibrant & Contemporary', hex: '#487a8b', textColorHint: 'light' },
  { id: 'forest-moss', name: 'Highland Moss', category: 'Vibrant & Contemporary', hex: '#445b45', textColorHint: 'light' },
  { id: 'plum-velvet', name: 'Mulberry Plum', category: 'Vibrant & Contemporary', hex: '#6b3d5b', textColorHint: 'light' },
  { id: 'coral-blush', name: 'Warm Coral', category: 'Vibrant & Contemporary', hex: '#e07a5f', textColorHint: 'light' },

  // 6. Wedding & Romance
  { id: 'blush-petal', name: 'Blush Rose Petal', category: 'Wedding & Romance', hex: '#fcf2f0', textColorHint: 'dark' },
  { id: 'soft-eucalyptus', name: 'Soft Eucalyptus', category: 'Wedding & Romance', hex: '#edf2ed', textColorHint: 'dark' },
  { id: 'champagne-silk', name: 'Champagne Silk', category: 'Wedding & Romance', hex: '#fbf4ea', textColorHint: 'dark' },
  { id: 'pearl-mist', name: 'Pearl Essence', category: 'Wedding & Romance', hex: '#f5f3f0', textColorHint: 'dark' },
  { id: 'lavender-fog', name: 'Lavender Fog', category: 'Wedding & Romance', hex: '#f3eff7', textColorHint: 'dark' },
  { id: 'pale-almond', name: 'Pale Sugared Almond', category: 'Wedding & Romance', hex: '#f5eee6', textColorHint: 'dark' },
];

export interface BackgroundGradientPreset {
  id: string;
  name: string;
  type: 'linear' | 'radial';
  angle?: number;
  stops: { color: string; offset: number }[];
  cssString: string;
}

export const BACKGROUND_GRADIENT_PRESETS: BackgroundGradientPreset[] = [
  {
    id: 'grad-warm-ivory',
    name: 'Warm Morning Glow',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#ffffff', offset: 0 },
      { color: '#f7f1e5', offset: 1 },
    ],
    cssString: 'linear-gradient(135deg, #ffffff 0%, #f7f1e5 100%)',
  },
  {
    id: 'grad-golden-hour',
    name: 'Golden Hour Horizon',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#fff9f0', offset: 0 },
      { color: '#fce8cc', offset: 0.5 },
      { color: '#f5d3b3', offset: 1 },
    ],
    cssString: 'linear-gradient(135deg, #fff9f0 0%, #fce8cc 50%, #f5d3b3 100%)',
  },
  {
    id: 'grad-sunset-linen',
    name: 'Sunset Silk',
    type: 'linear',
    angle: 120,
    stops: [
      { color: '#fff5f0', offset: 0 },
      { color: '#f5e6e8', offset: 0.5 },
      { color: '#eef2f7', offset: 1 },
    ],
    cssString: 'linear-gradient(120deg, #fff5f0 0%, #f5e6e8 50%, #eef2f7 100%)',
  },
  {
    id: 'grad-studio-radial',
    name: 'Studio Soft Spotlight',
    type: 'radial',
    stops: [
      { color: '#ffffff', offset: 0 },
      { color: '#e2e8f0', offset: 1 },
    ],
    cssString: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e2e8f0 100%)',
  },
  {
    id: 'grad-champagne',
    name: 'Champagne Shimmer',
    type: 'linear',
    angle: 160,
    stops: [
      { color: '#fbf9f5', offset: 0 },
      { color: '#ede3d2', offset: 1 },
    ],
    cssString: 'linear-gradient(160deg, #fbf9f5 0%, #ede3d2 100%)',
  },
  {
    id: 'grad-rose-gold',
    name: 'Rosé Champagne',
    type: 'linear',
    angle: 140,
    stops: [
      { color: '#fff7f5', offset: 0 },
      { color: '#fae3dd', offset: 0.6 },
      { color: '#ebd2cc', offset: 1 },
    ],
    cssString: 'linear-gradient(140deg, #fff7f5 0%, #fae3dd 60%, #ebd2cc 100%)',
  },
  {
    id: 'grad-pacific-mist',
    name: 'Pacific Dawn Mist',
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#f0f5f9', offset: 0 },
      { color: '#dce7f0', offset: 0.6 },
      { color: '#c7d7e6', offset: 1 },
    ],
    cssString: 'linear-gradient(180deg, #f0f5f9 0%, #dce7f0 60%, #c7d7e6 100%)',
  },
  {
    id: 'grad-eucalyptus-breeze',
    name: 'Eucalyptus Morning',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#f9fcf9', offset: 0 },
      { color: '#e3ece3', offset: 0.5 },
      { color: '#d0dfd0', offset: 1 },
    ],
    cssString: 'linear-gradient(135deg, #f9fcf9 0%, #e3ece3 50%, #d0dfd0 100%)',
  },
  {
    id: 'grad-cashmere-greige',
    name: 'Cashmere Greige',
    type: 'linear',
    angle: 150,
    stops: [
      { color: '#f7f6f4', offset: 0 },
      { color: '#e8e6e1', offset: 1 },
    ],
    cssString: 'linear-gradient(150deg, #f7f6f4 0%, #e8e6e1 100%)',
  },
  {
    id: 'grad-vintage-sepia',
    name: 'Vintage Archival Sepia',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#fbf7ee', offset: 0 },
      { color: '#eedec2', offset: 1 },
    ],
    cssString: 'linear-gradient(135deg, #fbf7ee 0%, #eedec2 100%)',
  },
  {
    id: 'grad-dark-vignette',
    name: 'Gallery Dark Vignette',
    type: 'radial',
    stops: [
      { color: '#27272a', offset: 0 },
      { color: '#09090b', offset: 1 },
    ],
    cssString: 'radial-gradient(circle at 50% 50%, #27272a 0%, #09090b 100%)',
  },
  {
    id: 'grad-twilight-velvet',
    name: 'Twilight Mulberry',
    type: 'linear',
    angle: 160,
    stops: [
      { color: '#2b1b2f', offset: 0 },
      { color: '#140c17', offset: 1 },
    ],
    cssString: 'linear-gradient(160deg, #2b1b2f 0%, #140c17 100%)',
  },
  {
    id: 'grad-northern-lights',
    name: 'Northern Pine & Teal',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#132223', offset: 0 },
      { color: '#091316', offset: 1 },
    ],
    cssString: 'linear-gradient(135deg, #132223 0%, #091316 100%)',
  },
  {
    id: 'grad-midnight-noir',
    name: 'Midnight Fade',
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#1e293b', offset: 0 },
      { color: '#090d16', offset: 1 },
    ],
    cssString: 'linear-gradient(180deg, #1e293b 0%, #090d16 100%)',
  },
];

export interface BackgroundTexturePreset {
  id: 'linen' | 'paper' | 'grid' | 'dots' | 'canvas' | 'woodgrain' | 'terrazzo' | 'stripes' | 'geometric';
  name: string;
  description: string;
  defaultBaseColor: string;
}

export const BACKGROUND_TEXTURE_PRESETS: BackgroundTexturePreset[] = [
  {
    id: 'linen',
    name: 'Artisan Woven Linen',
    description: 'Subtle crisscross woven fiber texture giving pages a handcrafted book feel.',
    defaultBaseColor: '#f7f4ed',
  },
  {
    id: 'paper',
    name: 'Archival Fine Paper',
    description: 'Organic warm stippling resembling premium 300gsm cotton rag paper.',
    defaultBaseColor: '#fdfbf7',
  },
  {
    id: 'canvas',
    name: 'Artists Heavy Canvas',
    description: 'Textured woven painterly canvas pattern with organic tactile depth.',
    defaultBaseColor: '#f5f1e8',
  },
  {
    id: 'woodgrain',
    name: 'Light Timber Grain',
    description: 'Delicate vertical wood grain striations giving natural organic warmth.',
    defaultBaseColor: '#f9f6f0',
  },
  {
    id: 'terrazzo',
    name: 'Mineral Speckled Paper',
    description: 'Subtle natural fiber and stone specks reminiscent of handmade Japanese washi.',
    defaultBaseColor: '#fbf9f4',
  },
  {
    id: 'grid',
    name: 'Architectural Drafting Grid',
    description: 'Delicate metric grid lines suitable for architectural & modern portfolios.',
    defaultBaseColor: '#ffffff',
  },
  {
    id: 'dots',
    name: 'Minimal Dot Matrix',
    description: 'Subtle spaced dot matrix adding contemporary geometric rhythm.',
    defaultBaseColor: '#fafafa',
  },
  {
    id: 'stripes',
    name: 'Archival Pinstripe',
    description: 'Fine bespoke vertical pinstripes for luxury editorial stationery.',
    defaultBaseColor: '#fdfbf7',
  },
  {
    id: 'geometric',
    name: 'Art-Deco Lattice',
    description: 'Gentle diagonal diamond watermark pattern for celebratory albums.',
    defaultBaseColor: '#fcfaf6',
  },
];

export function getBackgroundPreviewCss(bg?: PageBackgroundConfig, fallbackColor = '#ffffff'): string {
  if (!bg) return fallbackColor;

  if (bg.type === 'color') {
    return bg.color || fallbackColor;
  }

  if (bg.type === 'gradient' && bg.gradient) {
    if (bg.gradient.type === 'radial') {
      const stops = bg.gradient.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ');
      return `radial-gradient(circle at 50% 50%, ${stops})`;
    } else {
      const angle = bg.gradient.angle ?? 135;
      const stops = bg.gradient.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(', ');
      return `linear-gradient(${angle}deg, ${stops})`;
    }
  }

  if (bg.type === 'texture') {
    return bg.textureBaseColor || '#f7f4ed';
  }

  if (bg.type === 'image') {
    return '#f1f5f9';
  }

  return fallbackColor;
}
