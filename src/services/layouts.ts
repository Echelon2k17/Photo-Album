import { AlbumLayout } from '../types/album';

export const PREDEFINED_LAYOUTS: AlbumLayout[] = [
  {
    id: 'layout-1-full',
    name: 'Full Page Bleed',
    category: 'Single Photo',
    slotsCount: 1,
    description: '1 full-page hero photograph commanding complete attention.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1, height: 1 }
    ]
  },
  {
    id: 'layout-2-side-by-side',
    name: '2 Photos Side-by-Side',
    category: 'Dual Photos',
    slotsCount: 2,
    description: 'Two balanced vertical frames side by side.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 0.5, height: 1 },
      { id: 's1', x: 0.5, y: 0, width: 0.5, height: 1 }
    ]
  },
  {
    id: 'layout-2-stacked',
    name: '2 Photos Stacked',
    category: 'Dual Photos',
    slotsCount: 2,
    description: 'Two panoramic landscape frames stacked vertically.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1, height: 0.5 },
      { id: 's1', x: 0, y: 0.5, width: 1, height: 0.5 }
    ]
  },
  {
    id: 'layout-3-hero-left',
    name: '1 Hero + 2 Stacked Right',
    category: 'Triple Photos',
    slotsCount: 3,
    description: 'One prominent vertical photo on the left with two stacked on the right.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 0.6, height: 1 },
      { id: 's1', x: 0.6, y: 0, width: 0.4, height: 0.5 },
      { id: 's2', x: 0.6, y: 0.5, width: 0.4, height: 0.5 }
    ]
  },
  {
    id: 'layout-3-hero-top',
    name: '1 Hero Top + 2 Bottom',
    category: 'Triple Photos',
    slotsCount: 3,
    description: 'Wide cinematic photo on top with two companion photos below.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1, height: 0.6 },
      { id: 's1', x: 0, y: 0.6, width: 0.5, height: 0.4 },
      { id: 's2', x: 0.5, y: 0.6, width: 0.5, height: 0.4 }
    ]
  },
  {
    id: 'layout-3-columns',
    name: '3 Equal Columns',
    category: 'Triple Photos',
    slotsCount: 3,
    description: 'Triptych layout with three tall vertical portraits.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1 / 3, height: 1 },
      { id: 's1', x: 1 / 3, y: 0, width: 1 / 3, height: 1 },
      { id: 's2', x: 2 / 3, y: 0, width: 1 / 3, height: 1 }
    ]
  },
  {
    id: 'layout-4-grid',
    name: '4 Photos Grid (2×2)',
    category: 'Gallery Grid',
    slotsCount: 4,
    description: 'Symmetrical quad grid presenting four equal moments.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 0.5, height: 0.5 },
      { id: 's1', x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { id: 's2', x: 0, y: 0.5, width: 0.5, height: 0.5 },
      { id: 's3', x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
    ]
  },
  {
    id: 'layout-4-feature-top',
    name: '1 Large Top + 3 Bottom Strip',
    category: 'Gallery Grid',
    slotsCount: 4,
    description: 'Generous landscape showcase with 3 detail snapshots underneath.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1, height: 0.65 },
      { id: 's1', x: 0, y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 's2', x: 1 / 3, y: 0.65, width: 1 / 3, height: 0.35 },
      { id: 's3', x: 2 / 3, y: 0.65, width: 1 / 3, height: 0.35 }
    ]
  },
  {
    id: 'layout-4-magazine',
    name: 'Magazine Collage (2 Tall + 2 Wide)',
    category: 'Editorial',
    slotsCount: 4,
    description: 'Editorial magazine asymmetrical photo arrangement.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 0.5, height: 0.65 },
      { id: 's1', x: 0.5, y: 0, width: 0.5, height: 0.35 },
      { id: 's2', x: 0.5, y: 0.35, width: 0.5, height: 0.65 },
      { id: 's3', x: 0, y: 0.65, width: 0.5, height: 0.35 }
    ]
  },
  {
    id: 'layout-6-mosaic',
    name: '6 Photos Mosaic',
    category: 'Editorial',
    slotsCount: 6,
    description: 'Comprehensive 6-photo mosaic for event coverage.',
    slots: [
      { id: 's0', x: 0, y: 0, width: 1 / 3, height: 0.5 },
      { id: 's1', x: 1 / 3, y: 0, width: 1 / 3, height: 0.5 },
      { id: 's2', x: 2 / 3, y: 0, width: 1 / 3, height: 0.5 },
      { id: 's3', x: 0, y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 's4', x: 1 / 3, y: 0.5, width: 1 / 3, height: 0.5 },
      { id: 's5', x: 2 / 3, y: 0.5, width: 1 / 3, height: 0.5 }
    ]
  }
];

export function getLayoutById(id: string): AlbumLayout {
  return PREDEFINED_LAYOUTS.find(l => l.id === id) || PREDEFINED_LAYOUTS[0];
}
