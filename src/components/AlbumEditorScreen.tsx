import React, { useEffect, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Eye,
  Download,
  Sliders,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  Edit2,
  Palette,
  Frame,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  Film
} from 'lucide-react';
import { Album, AlbumPage, PageBackgroundConfig, PageMargins, PageSizePreset, PhotoFrameConfig, PhotoPlacement, StoredPhoto } from '../types/album';
import { getLayoutById } from '../services/layouts';
import { getBackgroundPreviewCss } from '../services/backgrounds';
import {
  createDownsampledBlob,
  deleteSinglePage,
  getObjectUrlForBlob,
  saveAlbum,
  savePages,
  savePhoto,
  saveSinglePage
} from '../services/db';
import { PageCanvas } from './PageCanvas';
import { PageEditorDrawer } from './PageEditorDrawer';
import { MarginsModal } from './MarginsModal';
import { BackgroundModal } from './BackgroundModal';
import { FramePickerModal } from './FramePickerModal';
import { AlbumPreviewScreen } from './AlbumPreviewScreen';
import { ExportModal } from './ExportModal';

interface AlbumEditorScreenProps {
  initialAlbum: Album;
  initialPages: AlbumPage[];
  initialPhotos: StoredPhoto[];
  onBackToHome: () => void;
  onPhotosUpdated: (photos: StoredPhoto[]) => void;
}

export const AlbumEditorScreen: React.FC<AlbumEditorScreenProps> = ({
  initialAlbum,
  initialPages,
  initialPhotos,
  onBackToHome,
  onPhotosUpdated,
}) => {
  const [album, setAlbum] = useState<Album>(initialAlbum);
  const [pages, setPages] = useState<AlbumPage[]>(() => {
    if (initialPages && initialPages.length > 0) return initialPages;
    return [
      {
        id: `page_${initialAlbum.id}_1`,
        albumId: initialAlbum.id,
        pageNumber: 1,
        layoutId: initialAlbum.defaultLayoutId || 'layout-1-full',
        backgroundColor: '#ffffff',
        placements: [{ slotIndex: 0, photoId: '', scale: 1.0, translationX: 0, translationY: 0, rotation: 0 }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
  });
  const [photos, setPhotos] = useState<StoredPhoto[]>(initialPhotos);

  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  // Modals state
  const [showMarginsModal, setShowMarginsModal] = useState<boolean>(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState<boolean>(false);
  const [showFrameModal, setShowFrameModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Responsive Workspace & Zoom state
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 900,
    height: 550,
  });
  const [zoomLevel, setZoomLevel] = useState<number | 'fit'>('fit');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Auto-measure canvas container on mount & resize with RAF protection
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const updateSize = () => {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const newW = Math.floor(rect.width);
        const newH = Math.floor(rect.height);
        setContainerSize((prev) => {
          if (Math.abs(prev.width - newW) <= 2 && Math.abs(prev.height - newH) <= 2) {
            return prev;
          }
          return { width: newW, height: newH };
        });
      }
    };

    updateSize();
    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateSize);
    });
    ro.observe(el);

    const handleWindowResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateSize);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Inline album renaming
  const [isRenaming, setIsRenaming] = useState(false);
  const [albumTitleInput, setAlbumTitleInput] = useState(album.name);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<AlbumPage[][]>([initialPages]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const activePage = pages[activePageIndex] || pages[0];

  // Sync back to indexedDB with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recordHistoryAndSave = (newPages: AlbumPage[]) => {
    // Slice forward history if we were in the middle of undo stack
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPages)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPages(newPages);

    // Persist to IndexedDB
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await savePages(newPages);
      await saveAlbum({ ...album, updatedAt: Date.now() });
    }, 400);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevPages = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setPages(prevPages);
      savePages(prevPages);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextPages = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setPages(nextPages);
      savePages(nextPages);
    }
  };

  // Zoom handlers
  const handleZoomOut = () => {
    if (zoomLevel === 'fit') {
      setZoomLevel(0.75);
    } else {
      const steps = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const cur = steps.findIndex((s) => s >= zoomLevel);
      const next = Math.max(0, (cur === -1 ? 2 : cur) - 1);
      setZoomLevel(steps[next]);
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel === 'fit') {
      setZoomLevel(1.25);
    } else {
      const steps = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      const cur = steps.findIndex((s) => s >= zoomLevel);
      const next = Math.min(steps.length - 1, (cur === -1 ? 2 : cur) + 1);
      setZoomLevel(steps[next]);
    }
  };

  // ---------------- PAGE MANIPULATION ----------------
  const handleUpdatePlacement = (
    slotIndex: number,
    updater: (prev: { scale: number; translationX: number; translationY: number; rotation: number }) => {
      scale: number;
      translationX: number;
      translationY: number;
      rotation: number;
    },
    options?: { skipHistory?: boolean }
  ) => {
    if (!activePage) return;

    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;

      const existingPlacements = [...p.placements];
      const pIdx = existingPlacements.findIndex((pl) => pl.slotIndex === slotIndex);

      const current =
        pIdx >= 0
          ? existingPlacements[pIdx]
          : {
              slotIndex,
              photoId: '',
              scale: 1.0,
              translationX: 0,
              translationY: 0,
              rotation: 0,
            };

      const updated = updater({
        scale: current.scale,
        translationX: current.translationX,
        translationY: current.translationY,
        rotation: current.rotation,
      });

      if (pIdx >= 0) {
        existingPlacements[pIdx] = {
          ...current,
          ...updated,
        };
      } else {
        existingPlacements.push({
          ...current,
          ...updated,
        });
      }

      return {
        ...p,
        placements: existingPlacements,
        updatedAt: Date.now(),
      };
    });

    if (options?.skipHistory) {
      // Lightweight direct state update while dragging (60fps buttery responsiveness)
      setPages(newPages);
    } else {
      recordHistoryAndSave(newPages);
    }
  };

  const handleCommitPlacementHistory = () => {
    recordHistoryAndSave(pages);
  };

  const handleReplacePhoto = (slotIndex: number, photoId: string) => {
    if (!activePage) return;

    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;

      const existingPlacements = [...p.placements];
      const pIdx = existingPlacements.findIndex((pl) => pl.slotIndex === slotIndex);

      if (pIdx >= 0) {
        existingPlacements[pIdx] = {
          ...existingPlacements[pIdx],
          photoId,
          scale: 1.0,
          translationX: 0,
          translationY: 0,
          rotation: 0,
        };
      } else {
        existingPlacements.push({
          slotIndex,
          photoId,
          scale: 1.0,
          translationX: 0,
          translationY: 0,
          rotation: 0,
        });
      }

      return {
        ...p,
        placements: existingPlacements,
        updatedAt: Date.now(),
      };
    });

    recordHistoryAndSave(newPages);
  };

  const handleRemovePhotoFromSlot = (slotIndex: number) => {
    if (!activePage) return;

    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;
      return {
        ...p,
        placements: p.placements.filter((pl) => pl.slotIndex !== slotIndex),
        updatedAt: Date.now(),
      };
    });

    recordHistoryAndSave(newPages);
  };

  const handleUpdateFrameConfig = (
    slotIndex: number,
    frameConfig: PhotoFrameConfig,
    scope: 'slot' | 'page' | 'album'
  ) => {
    let newPages: AlbumPage[];
    if (scope === 'album') {
      newPages = pages.map((p) => ({
        ...p,
        placements: p.placements.map((pl) => ({
          ...pl,
          frameConfig: { ...frameConfig },
        })),
        updatedAt: Date.now(),
      }));
    } else if (scope === 'page') {
      newPages = pages.map((p, idx) => {
        if (idx !== activePageIndex) return p;
        return {
          ...p,
          placements: p.placements.map((pl) => ({
            ...pl,
            frameConfig: { ...frameConfig },
          })),
          updatedAt: Date.now(),
        };
      });
    } else {
      // slot only
      newPages = pages.map((p, idx) => {
        if (idx !== activePageIndex) return p;
        const existing = [...p.placements];
        const pIdx = existing.findIndex((pl) => pl.slotIndex === slotIndex);
        if (pIdx >= 0) {
          existing[pIdx] = {
            ...existing[pIdx],
            frameConfig: { ...frameConfig },
          };
        } else {
          existing.push({
            slotIndex,
            photoId: '',
            scale: 1.0,
            translationX: 0,
            translationY: 0,
            rotation: 0,
            frameConfig: { ...frameConfig },
          });
        }
        return {
          ...p,
          placements: existing,
          updatedAt: Date.now(),
        };
      });
    }

    recordHistoryAndSave(newPages);
  };

  // Change Layout of THIS single page only
  const handleChangePageLayout = (newLayoutId: string) => {
    if (!activePage) return;

    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;
      return {
        ...p,
        layoutId: newLayoutId,
        updatedAt: Date.now(),
      };
    });

    recordHistoryAndSave(newPages);
  };

  // Add blank page
  const handleAddPage = () => {
    const newPage: AlbumPage = {
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      albumId: album.id,
      pageNumber: pages.length + 1,
      layoutId: album.defaultLayoutId,
      backgroundColor: activePage?.backgroundColor || '#ffffff',
      backgroundConfig: activePage?.backgroundConfig,
      placements: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newPages = [...pages, newPage];
    recordHistoryAndSave(newPages);
    setActivePageIndex(newPages.length - 1);
    setActiveSlotIndex(null);
  };

  // Duplicate current page
  const handleDuplicatePage = () => {
    if (!activePage) return;
    const duplicated: AlbumPage = {
      ...JSON.parse(JSON.stringify(activePage)),
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      pageNumber: activePageIndex + 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newPages = [...pages];
    newPages.splice(activePageIndex + 1, 0, duplicated);

    // Re-index page numbers
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(activePageIndex + 1);
  };

  // Delete current page
  const handleDeletePage = async () => {
    if (pages.length <= 1) return; // Keep at least 1 page

    const pageToDelete = pages[activePageIndex];
    await deleteSinglePage(pageToDelete.id);

    const newPages = pages.filter((_, idx) => idx !== activePageIndex);
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
    setActiveSlotIndex(null);
  };

  // Reorder page Left / Right (Drag & Drop or Button)
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);

    // Reassign page numbers
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(toIndex);
  };

  // Upload single/multiple photos dynamically to album
  const handleUploadPhoto = async (fileList: FileList): Promise<string | undefined> => {
    let lastId: string | undefined;
    const updatedPhotos = [...photos];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const originalBlob = file;

      const previewResult = await createDownsampledBlob(originalBlob, 1400, 0.88);
      const previewUrl = getObjectUrlForBlob(photoId + '_preview', previewResult.blob);

      const thumbResult = await createDownsampledBlob(originalBlob, 260, 0.8);
      const thumbnailUrl = getObjectUrlForBlob(photoId + '_thumb', thumbResult.blob);

      const stored: StoredPhoto = {
        id: photoId,
        albumId: album.id,
        name: file.name,
        originalBlob,
        previewUrl,
        thumbnailUrl,
        width: previewResult.originalWidth,
        height: previewResult.originalHeight,
        mimeType: file.type || 'image/jpeg',
        fileSizeBytes: file.size,
        createdAt: Date.now() + i,
      };

      await savePhoto(stored);
      updatedPhotos.push(stored);
      lastId = photoId;
    }

    setPhotos(updatedPhotos);
    onPhotosUpdated(updatedPhotos);
    return lastId;
  };

  // Rename Album
  const handleRenameAlbum = () => {
    if (albumTitleInput.trim() && albumTitleInput.trim() !== album.name) {
      const updated = { ...album, name: albumTitleInput.trim(), updatedAt: Date.now() };
      setAlbum(updated);
      saveAlbum(updated);
    }
    setIsRenaming(false);
  };

  // Update Album Margins / Page Size
  const handleApplyMargins = (
    preset: PageSizePreset,
    margins: PageMargins,
    customDims?: { widthMm: number; heightMm: number }
  ) => {
    const updated: Album = {
      ...album,
      pageSizePreset: preset,
      margins,
      customWidthMm: customDims?.widthMm,
      customHeightMm: customDims?.heightMm,
      updatedAt: Date.now(),
    };
    setAlbum(updated);
    saveAlbum(updated);
  };

  // Apply Background (to current page or all pages)
  const handleApplyBackground = (bgConfig: PageBackgroundConfig, applyToAll: boolean) => {
    const newPages = pages.map((p, idx) => {
      if (applyToAll || idx === activePageIndex) {
        return {
          ...p,
          backgroundColor: bgConfig.color || '#ffffff',
          backgroundConfig: bgConfig,
          updatedAt: Date.now(),
        };
      }
      return p;
    });

    recordHistoryAndSave(newPages);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800 select-none overflow-hidden">
      {/* 1. TOP STUDIO TOOLBAR */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between shadow-2xs z-20">
        {/* Left: Navigation & Album Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            title="Back to all albums"
            className="flex items-center gap-1.5 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Albums</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Editable Album Name */}
          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={albumTitleInput}
                onChange={(e) => setAlbumTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameAlbum()}
                autoFocus
                className="text-sm font-bold text-slate-900 border border-blue-500 rounded px-2 py-0.5"
              />
              <button
                onClick={handleRenameAlbum}
                className="p-1 bg-blue-600 text-white rounded text-xs font-bold"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsRenaming(true)}
              className="flex items-center gap-1.5 group cursor-pointer"
            >
              <h1 className="font-bold text-slate-900 text-sm tracking-tight">{album.name}</h1>
              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
          )}

          <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
            ({pages.length} Pages • {photos.length} Photos)
          </span>
        </div>

        {/* Center: Undo / Redo */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Background, Frames, Margins, Preview, Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBackgroundModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <Palette className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Background</span>
          </button>

          <button
            onClick={() => setShowFrameModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <Frame className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Frames</span>
          </button>

          <button
            onClick={() => setShowMarginsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Margins & Size</span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            title={isDrawerOpen ? 'Hide Inspector (Wide Canvas)' : 'Show Inspector'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isDrawerOpen
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {isDrawerOpen ? (
              <PanelRightClose className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden md:inline">Inspector</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Canvas + Inspector Drawer) */}
      {(() => {
        // Dynamic fitted dimensions calculation based on actual measured container size
        const padH = 40;
        const padV = 40;
        const availableW = Math.max(260, containerSize.width - padH);
        const availableH = Math.max(180, containerSize.height - padV);

        const zoomFactor = zoomLevel === 'fit' ? 1.0 : zoomLevel;
        const canvasMaxWidth = Math.round(availableW * zoomFactor);
        const canvasMaxHeight = Math.round(availableH * zoomFactor);

        return (
          <div className="flex-1 flex overflow-hidden relative">
            {/* Central Canvas Area */}
            <main className="flex-1 flex flex-col bg-slate-100/90 relative overflow-hidden">
              {/* Quick Page Info Strip */}
              <div className="px-5 py-2 flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/60 bg-white/70 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Page {activePage?.pageNumber || 1}</span>
                  <span>•</span>
                  <span>{getLayoutById(activePage?.layoutId || '').name}</span>
                </div>

                {/* Quick page actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDuplicatePage}
                    title="Duplicate Page"
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDeletePage}
                    disabled={pages.length <= 1}
                    title="Delete Page"
                    className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Canvas Container with Auto-Fit & Responsive Scaling */}
              <div
                ref={canvasContainerRef}
                className="flex-1 relative flex items-center justify-center p-3 sm:p-5 overflow-auto min-h-0 min-w-0"
              >
                {activePage && (
                  <PageCanvas
                    album={album}
                    page={activePage}
                    activeSlotIndex={activeSlotIndex}
                    onSelectSlot={setActiveSlotIndex}
                    onUpdatePlacement={handleUpdatePlacement}
                    onCommitPlacementHistory={handleCommitPlacementHistory}
                    onEmptySlotClick={(slotIdx) => {
                      setActiveSlotIndex(slotIdx);
                      if (window.innerWidth >= 1024) setIsDrawerOpen(true);
                    }}
                    onOpenFramePicker={() => setShowFrameModal(true)}
                    onRemovePhoto={handleRemovePhotoFromSlot}
                    showMarginGuides={true}
                    interactive={true}
                    maxWidth={canvasMaxWidth}
                    maxHeight={canvasMaxHeight}
                  />
                )}

                {/* Floating Studio Viewport Controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-slate-900/90 text-white px-3 py-1.5 rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs select-none">
                  {/* Zoom Out */}
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel === 0.5}
                    title="Zoom Out Canvas"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition disabled:opacity-30"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Fit Button */}
                  <button
                    onClick={() => setZoomLevel('fit')}
                    title="Fit Page to Screen (Auto)"
                    className={`px-2 py-0.5 rounded-full font-mono text-[11px] transition ${
                      zoomLevel === 'fit'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Fit
                  </button>

                  <span className="text-[11px] font-mono text-slate-400 min-w-[36px] text-center">
                    {zoomLevel === 'fit' ? '100%' : `${Math.round(zoomLevel * 100)}%`}
                  </span>

                  {/* Zoom In */}
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel === 2.0}
                    title="Zoom In Canvas"
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition disabled:opacity-30"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-slate-700 mx-1" />

                  {/* Toggle Inspector Drawer */}
                  <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    title={isDrawerOpen ? 'Collapse Inspector (Wide Canvas)' : 'Open Inspector'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition text-[11px] font-medium ${
                      isDrawerOpen ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {isDrawerOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
                    <span className="hidden sm:inline">Inspector</span>
                  </button>

                  {/* Toggle Filmstrip */}
                  <button
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    title={showThumbnails ? 'Collapse Page Filmstrip (More Height)' : 'Expand Page Filmstrip'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition text-[11px] font-medium ${
                      !showThumbnails ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Film className="w-3 h-3" />
                    <span className="hidden sm:inline">Pages</span>
                  </button>
                </div>
              </div>
            </main>

            {/* Right Drawer: Slot Inspector, Zoom Slider, Rotation, Replace Photo */}
            {activePage && isDrawerOpen && (
              <PageEditorDrawer
                page={activePage}
                activeSlotIndex={activeSlotIndex}
                albumPhotos={photos}
                onUpdatePlacement={handleUpdatePlacement}
                onUpdatePlacementFrame={handleUpdateFrameConfig}
                onReplacePhoto={handleReplacePhoto}
                onRemovePhotoFromSlot={handleRemovePhotoFromSlot}
                onChangePageLayout={handleChangePageLayout}
                onOpenBackgroundModal={() => setShowBackgroundModal(true)}
                onUploadNewPhoto={handleUploadPhoto}
                onClose={() => setIsDrawerOpen(false)}
              />
            )}
          </div>
        );
      })()}

      {/* 3. BOTTOM THUMBNAIL STRIP & PAGE REORDERING */}
      {showThumbnails ? (
        <footer className="h-28 bg-white border-t border-slate-200 px-5 flex items-center gap-3 overflow-x-auto z-10 shadow-lg relative shrink-0">
          <button
            onClick={() => setShowThumbnails(false)}
            title="Minimize filmstrip for more editing space"
            className="absolute top-1.5 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded z-10 transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        {/* Page thumbnails */}
        {pages.map((p, idx) => {
          const isSelected = idx === activePageIndex;
          const layout = getLayoutById(p.layoutId);
          const photoCount = p.placements.filter((pl) => pl.photoId).length;

          return (
            <div
              key={p.id}
              onClick={() => {
                setActivePageIndex(idx);
                setActiveSlotIndex(null);
              }}
              className={`flex-shrink-0 group relative cursor-pointer flex flex-col items-center p-1.5 rounded-xl border-2 transition ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50'
              }`}
            >
              {/* Micro layout preview with custom background representation */}
              <div
                className="w-24 h-16 rounded border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-2xs"
                style={{ background: getBackgroundPreviewCss(p.backgroundConfig, p.backgroundColor) }}
              >
                {layout.slots.map((s, sIdx) => {
                  const pl = p.placements.find((item) => item.slotIndex === sIdx);
                  const photo = pl?.photoId ? photos.find((ph) => ph.id === pl.photoId) : null;

                  return (
                    <div
                      key={s.id || sIdx}
                      className="absolute bg-slate-200 border border-white rounded-[1px] overflow-hidden"
                      style={{
                        left: `${s.x * 100}%`,
                        top: `${s.y * 100}%`,
                        width: `${s.width * 100}%`,
                        height: `${s.height * 100}%`,
                      }}
                    >
                      {photo?.thumbnailUrl ? (
                        <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Page Number & Photos count */}
              <div className="flex items-center justify-between w-full px-1 pt-1 text-[11px]">
                <span className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  Page {p.pageNumber}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{photoCount}p</span>
              </div>

              {/* Reorder Buttons (Move Left / Right) */}
              <div className="absolute -top-2 inset-x-0 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMovePage(idx, idx - 1);
                  }}
                  disabled={idx === 0}
                  title="Move Page Left"
                  className="p-1 bg-white border border-slate-200 rounded-full shadow-xs text-slate-600 hover:text-black disabled:opacity-20"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMovePage(idx, idx + 1);
                  }}
                  disabled={idx === pages.length - 1}
                  title="Move Page Right"
                  className="p-1 bg-white border border-slate-200 rounded-full shadow-xs text-slate-600 hover:text-black disabled:opacity-20"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Blank Page Button */}
        <button
          onClick={handleAddPage}
          title="Add Blank Page"
          className="flex-shrink-0 w-24 h-22 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition"
        >
          <Plus className="w-5 h-5 mb-1" />
          <span className="text-[11px] font-bold">+ Add Page</span>
        </button>
      </footer>
    ) : (
      <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between z-10 shadow-2xs shrink-0 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
            disabled={activePageIndex === 0}
            title="Previous Page"
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-800">
            Page {activePageIndex + 1} of {pages.length}
          </span>
          <button
            onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
            disabled={activePageIndex === pages.length - 1}
            title="Next Page"
            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePageIndex(idx);
                setActiveSlotIndex(null);
              }}
              className={`w-6 h-6 rounded-md text-[11px] font-bold transition ${
                idx === activePageIndex
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.pageNumber}
            </button>
          ))}
          <button
            onClick={handleAddPage}
            title="Add Page"
            className="w-6 h-6 rounded-md border border-dashed border-slate-300 hover:border-blue-500 text-slate-500 hover:text-blue-600 flex items-center justify-center transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={() => setShowThumbnails(true)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Show Thumbnails</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </footer>
    )}

      {/* MODALS */}
      {showBackgroundModal && activePage && (
        <BackgroundModal
          currentPage={activePage}
          totalPagesCount={pages.length}
          albumPhotos={photos}
          onApply={handleApplyBackground}
          onClose={() => setShowBackgroundModal(false)}
        />
      )}

      {showFrameModal && (
        <FramePickerModal
          currentFrameConfig={
            activeSlotIndex !== null
              ? activePage?.placements.find((p) => p.slotIndex === activeSlotIndex)?.frameConfig
              : undefined
          }
          photo={
            activeSlotIndex !== null
              ? photos.find(
                  (ph) =>
                    ph.id ===
                    activePage?.placements.find((p) => p.slotIndex === activeSlotIndex)?.photoId
                )
              : photos[0] || null
          }
          onApply={(cfg, scope) => {
            handleUpdateFrameConfig(activeSlotIndex ?? 0, cfg, scope);
          }}
          onClose={() => setShowFrameModal(false)}
        />
      )}

      {showMarginsModal && (
        <MarginsModal
          album={album}
          onSave={handleApplyMargins}
          onClose={() => setShowMarginsModal(false)}
        />
      )}

      {showPreviewModal && (
        <AlbumPreviewScreen
          album={album}
          pages={pages}
          initialPageNumber={activePageIndex + 1}
          onClose={() => setShowPreviewModal(false)}
          onEditPage={(pageIdx) => {
            setActivePageIndex(pageIdx);
            setShowPreviewModal(false);
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          album={album}
          pages={pages}
          photos={photos}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
