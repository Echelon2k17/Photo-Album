import React, { useEffect, useState } from 'react';
import {
  Album,
  AlbumPage,
  PAGE_SIZE_CONFIGS,
  PageMargins,
  PageSizePreset,
  PhotoPlacement,
  StoredPhoto
} from './types/album';
import { PREDEFINED_LAYOUTS, getLayoutById } from './services/layouts';
import {
  createDownsampledBlob,
  deleteAlbum,
  getAllAlbums,
  getObjectUrlForBlob,
  getPagesForAlbum,
  getPhotosForAlbum,
  saveAlbum,
  savePages,
  savePhoto
} from './services/db';
import { SAMPLE_PHOTOS } from './services/sampleData';
import { AlbumsListScreen } from './components/AlbumsListScreen';
import { CreateAlbumModal } from './components/CreateAlbumModal';
import { PhotoPickerScreen } from './components/PhotoPickerScreen';
import { LayoutSelectionScreen } from './components/LayoutSelectionScreen';
import { AlbumEditorScreen } from './components/AlbumEditorScreen';

type Screen = 'ALBUMS' | 'PHOTO_PICKER' | 'LAYOUT_SELECTION' | 'EDITOR';

export default function App() {
  const [screen, setScreen] = useState<Screen>('ALBUMS');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumStats, setAlbumStats] = useState<
    Record<string, { pagesCount: number; photosCount: number; coverUrl?: string }>
  >({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Active / Working Album State
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [activePhotos, setActivePhotos] = useState<StoredPhoto[]>([]);
  const [activePages, setActivePages] = useState<AlbumPage[]>([]);

  // Modal for Step 1: Album Name
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load all albums and compute card statistics from IndexedDB on startup
  const loadAlbumsList = async () => {
    try {
      const list = await getAllAlbums();
      setAlbums(list);

      const stats: Record<string, { pagesCount: number; photosCount: number; coverUrl?: string }> = {};
      for (const alb of list) {
        const pgs = await getPagesForAlbum(alb.id);
        const pht = await getPhotosForAlbum(alb.id);
        let coverUrl: string | undefined;

        // Try to get cover thumbnail from first page placement or first photo
        if (pgs.length > 0 && pgs[0].placements.length > 0 && pgs[0].placements[0].photoId) {
          const coverPhoto = pht.find((p) => p.id === pgs[0].placements[0].photoId);
          coverUrl = coverPhoto?.thumbnailUrl;
        } else if (pht.length > 0) {
          coverUrl = pht[0].thumbnailUrl;
        }

        stats[alb.id] = {
          pagesCount: pgs.length,
          photosCount: pht.length,
          coverUrl,
        };
      }
      setAlbumStats(stats);
    } catch (err) {
      console.error('Failed to load albums from DB:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadAlbumsList();
  }, []);

  // ---------------- WORKFLOW STEP 1: CREATE ALBUM ----------------
  const handleCreateAlbumSubmit = async (name: string, pageSizePreset: PageSizePreset) => {
    const newAlbumId = 'album_' + Date.now();
    const defaultMargins: PageMargins = {
      topMm: 12,
      bottomMm: 12,
      leftMm: 12,
      rightMm: 12,
      gapMm: 4,
    };

    const newAlbum: Album = {
      id: newAlbumId,
      name,
      pageSizePreset,
      margins: defaultMargins,
      defaultLayoutId: PREDEFINED_LAYOUTS[1].id, // 2 Photos side-by-side
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveAlbum(newAlbum);
    setActiveAlbum(newAlbum);
    setActivePhotos([]);
    setActivePages([]);

    setShowCreateModal(false);
    setScreen('PHOTO_PICKER');
  };

  // ---------------- WORKFLOW STEP 2 -> STEP 3: CHOOSE LAYOUT ----------------
  const handlePhotosSelectedNext = () => {
    setScreen('LAYOUT_SELECTION');
  };

  // ---------------- WORKFLOW STEP 3 -> STEP 4: GENERATE PAGES & OPEN STUDIO ----------------
  const handleGeneratePages = async (
    layoutId: string,
    margins: PageMargins,
    pageSizePreset: PageSizePreset
  ) => {
    if (!activeAlbum) return;

    const layout = getLayoutById(layoutId);
    const slotsCount = Math.max(1, layout.slotsCount);

    const generatedPages: AlbumPage[] = [];
    let currentSlotPhotoIndex = 0;

    // Distribute photos across pages automatically
    const totalPagesNeeded = Math.max(1, Math.ceil(activePhotos.length / slotsCount));

    for (let pageNum = 1; pageNum <= totalPagesNeeded; pageNum++) {
      const placements: PhotoPlacement[] = [];

      for (let sIdx = 0; sIdx < slotsCount; sIdx++) {
        if (currentSlotPhotoIndex < activePhotos.length) {
          const photo = activePhotos[currentSlotPhotoIndex];
          placements.push({
            slotIndex: sIdx,
            photoId: photo.id,
            scale: 1.0,
            translationX: 0,
            translationY: 0,
            rotation: 0,
          });
          currentSlotPhotoIndex++;
        }
      }

      generatedPages.push({
        id: `page_${activeAlbum.id}_${pageNum}_${Date.now()}`,
        albumId: activeAlbum.id,
        pageNumber: pageNum,
        layoutId,
        backgroundColor: '#ffffff',
        placements,
        createdAt: Date.now() + pageNum,
        updatedAt: Date.now() + pageNum,
      });
    }

    const updatedAlbum: Album = {
      ...activeAlbum,
      defaultLayoutId: layoutId,
      margins,
      pageSizePreset,
      updatedAt: Date.now(),
    };

    await saveAlbum(updatedAlbum);
    await savePages(generatedPages);

    setActiveAlbum(updatedAlbum);
    setActivePages(generatedPages);
    setScreen('EDITOR');
  };

  // ---------------- OPEN EXISTING ALBUM ----------------
  const handleOpenAlbum = async (albumId: string) => {
    const alb = albums.find((a) => a.id === albumId);
    if (!alb) return;

    const pgs = await getPagesForAlbum(albumId);
    const pht = await getPhotosForAlbum(albumId);

    setActiveAlbum(alb);
    setActivePages(pgs);
    setActivePhotos(pht);
    setScreen('EDITOR');
  };

  // ---------------- ALBUM ACTIONS (RENAME, DUPLICATE, DELETE) ----------------
  const handleRenameAlbum = async (albumId: string, newName: string) => {
    const alb = albums.find((a) => a.id === albumId);
    if (!alb) return;
    const updated: Album = { ...alb, name: newName, updatedAt: Date.now() };
    await saveAlbum(updated);
    await loadAlbumsList();
  };

  const handleDuplicateAlbum = async (albumId: string) => {
    const sourceAlb = albums.find((a) => a.id === albumId);
    if (!sourceAlb) return;

    const sourcePages = await getPagesForAlbum(albumId);
    const sourcePhotos = await getPhotosForAlbum(albumId);

    const newAlbumId = 'album_' + Date.now();
    const duplicatedAlbum: Album = {
      ...sourceAlb,
      id: newAlbumId,
      name: `${sourceAlb.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveAlbum(duplicatedAlbum);

    // Map old photo IDs to new photo IDs to keep references valid
    const photoIdMap = new Map<string, string>();
    for (const ph of sourcePhotos) {
      const newPhotoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      photoIdMap.set(ph.id, newPhotoId);
      await savePhoto({
        ...ph,
        id: newPhotoId,
        albumId: newAlbumId,
        createdAt: Date.now(),
      });
    }

    // Duplicate pages
    const duplicatedPages: AlbumPage[] = sourcePages.map((pg, i) => ({
      ...pg,
      id: `page_${newAlbumId}_${i + 1}`,
      albumId: newAlbumId,
      placements: pg.placements.map((pl) => ({
        ...pl,
        photoId: photoIdMap.get(pl.photoId) || pl.photoId,
      })),
      createdAt: Date.now() + i,
      updatedAt: Date.now() + i,
    }));

    await savePages(duplicatedPages);
    await loadAlbumsList();
  };

  const handleDeleteAlbum = async (albumId: string) => {
    await deleteAlbum(albumId);
    await loadAlbumsList();
  };

  // ---------------- INSTANT DEMO SAMPLE ALBUM SEEDER ----------------
  const handleSeedDemoAlbum = async () => {
    setIsSeeding(true);
    try {
      const demoAlbumId = 'album_demo_' + Date.now();
      const demoAlbum: Album = {
        id: demoAlbumId,
        name: 'Architectural & Nature Showcase 2026',
        description: 'Fine art photo collection showcasing modern design and natural landscapes.',
        pageSizePreset: 'A4_LANDSCAPE',
        margins: { topMm: 12, bottomMm: 12, leftMm: 12, rightMm: 12, gapMm: 4 },
        defaultLayoutId: 'layout-2-side-by-side',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAlbum(demoAlbum);

      // Download and ingest 12 sample photos with 3-tier architecture
      const ingestedPhotos: StoredPhoto[] = [];
      for (let i = 0; i < SAMPLE_PHOTOS.length; i++) {
        const item = SAMPLE_PHOTOS[i];
        const res = await fetch(item.url);
        const originalBlob = await res.blob();
        const photoId = `demo_photo_${demoAlbumId}_${i}`;

        const previewResult = await createDownsampledBlob(originalBlob, 1400, 0.88);
        const previewUrl = getObjectUrlForBlob(photoId + '_preview', previewResult.blob);

        const thumbResult = await createDownsampledBlob(originalBlob, 260, 0.8);
        const thumbnailUrl = getObjectUrlForBlob(photoId + '_thumb', thumbResult.blob);

        const stored: StoredPhoto = {
          id: photoId,
          albumId: demoAlbumId,
          name: item.name,
          originalBlob,
          previewUrl,
          thumbnailUrl,
          width: previewResult.originalWidth,
          height: previewResult.originalHeight,
          mimeType: 'image/jpeg',
          fileSizeBytes: originalBlob.size,
          createdAt: Date.now() + i,
        };

        await savePhoto(stored);
        ingestedPhotos.push(stored);
      }

      // Generate 5 stylized pages with diverse layouts:
      // Page 1: Full Page Bleed Hero
      // Page 2: 2 Photos Side by Side
      // Page 3: 1 Hero + 2 Stacked Right
      // Page 4: 4 Photos Grid (2x2)
      // Page 5: 2 Photos Stacked
      const pagesToCreate: AlbumPage[] = [
        {
          id: `page_${demoAlbumId}_1`,
          albumId: demoAlbumId,
          pageNumber: 1,
          layoutId: 'layout-1-full',
          backgroundColor: '#ffffff',
          placements: [
            { slotIndex: 0, photoId: ingestedPhotos[0].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: `page_${demoAlbumId}_2`,
          albumId: demoAlbumId,
          pageNumber: 2,
          layoutId: 'layout-2-side-by-side',
          backgroundColor: '#ffffff',
          placements: [
            { slotIndex: 0, photoId: ingestedPhotos[1].id, scale: 1.05, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 1, photoId: ingestedPhotos[2].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
          ],
          createdAt: Date.now() + 1,
          updatedAt: Date.now() + 1,
        },
        {
          id: `page_${demoAlbumId}_3`,
          albumId: demoAlbumId,
          pageNumber: 3,
          layoutId: 'layout-3-hero-left',
          backgroundColor: '#ffffff',
          placements: [
            { slotIndex: 0, photoId: ingestedPhotos[3].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 1, photoId: ingestedPhotos[4].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 2, photoId: ingestedPhotos[5].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
          ],
          createdAt: Date.now() + 2,
          updatedAt: Date.now() + 2,
        },
        {
          id: `page_${demoAlbumId}_4`,
          albumId: demoAlbumId,
          pageNumber: 4,
          layoutId: 'layout-4-grid',
          backgroundColor: '#ffffff',
          placements: [
            { slotIndex: 0, photoId: ingestedPhotos[6].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 1, photoId: ingestedPhotos[7].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 2, photoId: ingestedPhotos[8].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 3, photoId: ingestedPhotos[9].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
          ],
          createdAt: Date.now() + 3,
          updatedAt: Date.now() + 3,
        },
        {
          id: `page_${demoAlbumId}_5`,
          albumId: demoAlbumId,
          pageNumber: 5,
          layoutId: 'layout-2-stacked',
          backgroundColor: '#ffffff',
          placements: [
            { slotIndex: 0, photoId: ingestedPhotos[10].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
            { slotIndex: 1, photoId: ingestedPhotos[11].id, scale: 1.0, translationX: 0, translationY: 0, rotation: 0 },
          ],
          createdAt: Date.now() + 4,
          updatedAt: Date.now() + 4,
        },
      ];

      await savePages(pagesToCreate);
      await loadAlbumsList();

      // Open directly in editor
      setActiveAlbum(demoAlbum);
      setActivePhotos(ingestedPhotos);
      setActivePages(pagesToCreate);
      setScreen('EDITOR');
    } catch (err) {
      console.error('Failed to seed demo album:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* SCREEN 1: ALBUMS HOME */}
      {screen === 'ALBUMS' && (
        <AlbumsListScreen
          albums={albums}
          albumStats={albumStats}
          onCreateAlbumClick={() => setShowCreateModal(true)}
          onOpenAlbum={handleOpenAlbum}
          onRenameAlbum={handleRenameAlbum}
          onDuplicateAlbum={handleDuplicateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
          onSeedDemoAlbum={handleSeedDemoAlbum}
          isSeeding={isSeeding}
        />
      )}

      {/* SCREEN 2 / 3: PHOTO SELECTION */}
      {screen === 'PHOTO_PICKER' && activeAlbum && (
        <PhotoPickerScreen
          albumName={activeAlbum.name}
          albumId={activeAlbum.id}
          existingPhotos={activePhotos}
          onPhotosUpdated={setActivePhotos}
          onNext={handlePhotosSelectedNext}
          onBack={() => setScreen('ALBUMS')}
        />
      )}

      {/* SCREEN 4: LAYOUT & MARGINS SELECTION */}
      {screen === 'LAYOUT_SELECTION' && activeAlbum && (
        <LayoutSelectionScreen
          album={activeAlbum}
          photos={activePhotos}
          onGenerate={handleGeneratePages}
          onBack={() => setScreen('PHOTO_PICKER')}
        />
      )}

      {/* SCREEN 5: STUDIO / ALBUM EDITOR */}
      {screen === 'EDITOR' && activeAlbum && (
        <AlbumEditorScreen
          initialAlbum={activeAlbum}
          initialPages={activePages}
          initialPhotos={activePhotos}
          onBackToHome={() => {
            loadAlbumsList();
            setScreen('ALBUMS');
          }}
          onPhotosUpdated={setActivePhotos}
        />
      )}

      {/* CREATE ALBUM MODAL (NAME & PRESET) */}
      {showCreateModal && (
        <CreateAlbumModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAlbumSubmit}
        />
      )}
    </div>
  );
}
