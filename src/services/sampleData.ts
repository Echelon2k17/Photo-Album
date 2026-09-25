import heroCover from '../assets/images/hero_fineart_monograph_1790330665100.jpg';
import nordicArch from '../assets/images/album_nordic_architecture_1790330678220.jpg';
import coastalSea from '../assets/images/album_coastal_horizon_1790330688618.jpg';

export interface SamplePhotoDef {
  name: string;
  url: string;
}

export const SAMPLE_PHOTOS: SamplePhotoDef[] = [
  {
    name: 'Fine-Art Monograph Edition.jpg',
    url: heroCover,
  },
  {
    name: 'Nordic Wooden Pavilion.jpg',
    url: nordicArch,
  },
  {
    name: 'Coastal Horizon Seascape.jpg',
    url: coastalSea,
  },
  {
    name: 'Alpine Sunrise Lake.jpg',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Modern Architectural Villa.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Coastal Cliff Sunset.jpg',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Minimalist Interior Lounge.jpg',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Misty Pine Forest Ridge.jpg',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Desert Dune Golden Hour.jpg',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Italian Countryside Vineyard.jpg',
    url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Botanical Greenhouse Glass.jpg',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2000&auto=format&fit=crop&q=85',
  },
  {
    name: 'Serene Kyoto Zen Temple.jpg',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=2000&auto=format&fit=crop&q=85',
  },
];

/**
 * Creates an offline procedural high-resolution sample image blob
 * to guarantee that sample album loading never fails due to network issues or ad blockers.
 */
export function createSamplePlaceholderBlob(name: string, index: number): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1067;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new Blob([], { type: 'image/jpeg' });
  }

  const palettes = [
    ['#1e293b', '#0f172a'],
    ['#0284c7', '#0369a1'],
    ['#059669', '#047857'],
    ['#d97706', '#b45309'],
    ['#7c3aed', '#6d28d9'],
    ['#db2777', '#be185d'],
    ['#475569', '#334155'],
    ['#0d9488', '#0f766e'],
  ];
  const [c1, c2] = palettes[index % palettes.length];
  const grad = ctx.createLinearGradient(0, 0, 1600, 1067);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1600, 1067);

  // Soft geometric art circle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(800, 533, 350, 0, Math.PI * 2);
  ctx.fill();

  // Text title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.replace(/\.[^/.]+$/, ''), 800, 500);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '22px sans-serif';
  ctx.fillText('Lumina Curated Architecture & Nature', 800, 560);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const binStr = atob(dataUrl.split(',')[1]);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type: 'image/jpeg' });
}

