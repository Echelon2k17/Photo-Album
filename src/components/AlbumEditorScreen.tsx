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
  Film,
  Sparkles,
  GripVertical,
  LayoutGrid,
  Save,
  Loader2,
  MoreVertical,
  FileDown,
  Upload
} from 'lucide-react';
import { Album, AlbumPage, PAGE_SIZE_CONFIGS, PageBackgroundConfig, PageMargins, PageSizePreset, PhotoFilterAdjustments, PhotoFilterType, PhotoFrameConfig, PhotoPlacement, StoredPhoto } from '../types/album';
import { getLayoutById } from '../services/layouts';
import { getBackgroundPreviewCss } from '../services/backgrounds';
import {
  createDownsampledBlob,
  deleteSinglePage,
  fileToDetachedBlob,
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
import { PhotoFilterModal } from './PhotoFilterModal';
import { AlbumPreviewScreen } from './AlbumPreviewScreen';
import { ExportModal } from './ExportModal';
import { PageOrganizerModal } from './PageOrganizerModal';

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
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterModalSlotIndex, setFilterModalSlotIndex] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState<boolean>(false);

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

  // Drag and drop page reordering state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

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

  // Save status & Mobile menu modal state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'just_saved'>('saved');
  const [showMobileToolsModal, setShowMobileToolsModal] = useState<boolean>(false);

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
    setSaveStatus('saving');

    // Persist to IndexedDB
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await savePages(newPages);
        await saveAlbum({ ...album, updatedAt: Date.now() });
        setSaveStatus('just_saved');
        setTimeout(() => setSaveStatus('saved'), 1500);
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('saved');
      }
    }, 400);
  };

  const handleManualSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    try {
      await savePages(pages);
      await saveAlbum({ ...album, updatedAt: Date.now() });
      setSaveStatus('just_saved');
      setTimeout(() => setSaveStatus('saved'), 1800);
    } catch (err) {
      console.error('Manual save failed:', err);
      setSaveStatus('saved');
    }
  };

  const handleExportProjectBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        album,
        pages,
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${album.name.replace(/\s+/g, '_')}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup error:', err);
    }
  };

  const handleRestoreProjectBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);
        if (data.album && Array.isArray(data.pages)) {
          setAlbum(data.album);
          setPages(data.pages);
          await saveAlbum(data.album);
          await savePages(data.pages);
          setSaveStatus('just_saved');
          setTimeout(() => setSaveStatus('saved'), 1800);
        }
      } catch (err) {
        console.error('Restore error:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePlacementFilter = (slotIndex: number, filter: PhotoFilterType, applyToAllOnPage = false) => {
    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;
      const newPlacements = p.placements.map((pl) => {
        if (applyToAllOnPage || pl.slotIndex === slotIndex) {
          return { ...pl, filter };
        }
        return pl;
      });
      return { ...p, placements: newPlacements, updatedAt: Date.now() };
    });
    recordHistoryAndSave(newPages);
  };

  const handleUpdatePlacementAdjustments = (
    slotIndex: number,
    adjustments: PhotoFilterAdjustments,
    applyToAllOnPage = false
  ) => {
    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;
      const newPlacements = p.placements.map((pl) => {
        if (applyToAllOnPage || pl.slotIndex === slotIndex) {
          return { ...pl, adjustments: { ...adjustments } };
        }
        return pl;
      });
      return { ...p, placements: newPlacements, updatedAt: Date.now() };
    });
    recordHistoryAndSave(newPages);
  };

  const handleApplyFilterAndAdjustments = (
    filter: PhotoFilterType,
    adjustments: PhotoFilterAdjustments,
    applyToAllOnPage = false
  ) => {
    const slotIdx = filterModalSlotIndex ?? activeSlotIndex ?? 0;
    const newPages = pages.map((p, idx) => {
      if (idx !== activePageIndex) return p;
      const newPlacements = p.placements.map((pl) => {
        if (applyToAllOnPage || pl.slotIndex === slotIdx) {
          return {
            ...pl,
            filter,
            adjustments: { ...adjustments },
          };
        }
        return pl;
      });
      return { ...p, placements: newPlacements, updatedAt: Date.now() };
    });
    recordHistoryAndSave(newPages);
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

  // Add blank page (optionally after a specific index)
  const handleAddPage = (afterIndex?: number) => {
    const insertIdx = afterIndex !== undefined ? afterIndex + 1 : pages.length;
    const newPage: AlbumPage = {
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      albumId: album.id,
      pageNumber: insertIdx + 1,
      layoutId: album.defaultLayoutId || 'layout-1-full',
      backgroundColor: activePage?.backgroundColor || '#ffffff',
      backgroundConfig: activePage?.backgroundConfig,
      placements: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newPages = [...pages];
    newPages.splice(insertIdx, 0, newPage);
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(insertIdx);
    setActiveSlotIndex(null);
  };

  // Duplicate page (current or by index)
  const handleDuplicatePage = () => {
    handleDuplicatePageByIndex(activePageIndex);
  };

  const handleDuplicatePageByIndex = (index: number) => {
    const target = pages[index];
    if (!target) return;

    const duplicated: AlbumPage = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      pageNumber: index + 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newPages = [...pages];
    newPages.splice(index + 1, 0, duplicated);
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(index + 1);
  };

  // Delete page (current or by index)
  const handleDeletePage = async () => {
    await handleDeletePageByIndex(activePageIndex);
  };

  const handleDeletePageByIndex = async (index: number) => {
    if (pages.length <= 1) return; // Keep at least 1 page

    const pageToDelete = pages[index];
    if (!pageToDelete) return;
    await deleteSinglePage(pageToDelete.id);

    const newPages = pages.filter((_, idx) => idx !== index);
    newPages.forEach((p, i) => (p.pageNumber = i + 1));

    recordHistoryAndSave(newPages);
    setActivePageIndex(Math.max(0, Math.min(newPages.length - 1, index === activePageIndex ? index - 1 : activePageIndex)));
    setActiveSlotIndex(null);
  };

  // Reorder page Left / Right (Drag & Drop, Grid Modal, or Button) and update database
  const handleMovePage = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length || fromIndex === toIndex) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);

    // Reassign page numbers 1-indexed and update timestamp
    const reindexedPages = newPages.map((p, i) => ({
      ...p,
      pageNumber: i + 1,
      updatedAt: Date.now(),
    }));

    recordHistoryAndSave(reindexedPages);
    setActivePageIndex(toIndex);

    // Immediate database synchronization to ensure IndexedDB holds new sequence
    try {
      await savePages(reindexedPages);
      await saveAlbum({ ...album, updatedAt: Date.now() });
      setSaveStatus('just_saved');
      setTimeout(() => setSaveStatus('saved'), 1500);
    } catch (err) {
      console.error('Failed to persist reordered pages to IndexedDB:', err);
      setSaveStatus('saved');
    }
  };

  // Drag and Drop event handlers
  const handlePageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handlePageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedPageIndex === null || draggedPageIndex === index) {
      if (dragOverPageIndex !== null) {
        setDragOverPageIndex(null);
        setDropPosition(null);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';

    if (dragOverPageIndex !== index || dropPosition !== pos) {
      setDragOverPageIndex(index);
      setDropPosition(pos);
    }
  };

  const handlePageDragLeave = (e: React.DragEvent, index: number) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;

    if (dragOverPageIndex === index) {
      setDragOverPageIndex(null);
      setDropPosition(null);
    }
  };

  const handlePageDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedPageIndex === null || draggedPageIndex === targetIndex) {
      setDraggedPageIndex(null);
      setDragOverPageIndex(null);
      setDropPosition(null);
      return;
    }

    let destIndex = targetIndex;
    if (dropPosition === 'before') {
      destIndex = draggedPageIndex < targetIndex ? targetIndex - 1 : targetIndex;
    } else if (dropPosition === 'after') {
      destIndex = draggedPageIndex < targetIndex ? targetIndex : targetIndex + 1;
    }

    destIndex = Math.max(0, Math.min(pages.length - 1, destIndex));
    const srcIndex = draggedPageIndex;

    setDraggedPageIndex(null);
    setDragOverPageIndex(null);
    setDropPosition(null);

    if (srcIndex !== destIndex) {
      await handleMovePage(srcIndex, destIndex);
    }
  };

  const handlePageDragEnd = () => {
    setDraggedPageIndex(null);
    setDragOverPageIndex(null);
    setDropPosition(null);
  };

  // Upload single/multiple photos dynamically to album
  const handleUploadPhoto = async (fileList: FileList): Promise<string | undefined> => {
    let lastId: string | undefined;
    const updatedPhotos = [...photos];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const originalBlob = await fileToDetachedBlob(file);

      const previewResult = await createDownsampledBlob(originalBlob, 1400, 0.88);
      const previewUrl = getObjectUrlForBlob(photoId + '_preview', previewResult.blob);

      const thumbResult = await createDownsampledBlob(originalBlob, 260, 0.8);
      const thumbnailUrl = thumbResult.dataUrl || getObjectUrlForBlob(photoId + '_thumb', thumbResult.blob);

      const stored: StoredPhoto = {
        id: photoId,
        albumId: album.id,
        name: file.name,
        originalBlob,
        previewBlob: previewResult.blob,
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
    <div className="h-screen flex flex-col bg-[#f5f4f0] text-stone-800 select-none overflow-hidden font-sans">
      {/* 1. TOP STUDIO TOOLBAR (Universal 1-row, 3-zone contract) */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-3 sm:px-5 flex items-center justify-between shadow-2xs z-20 gap-2 shrink-0">
        {/* Zone 1: Navigation, Album Title & Unboxed Metadata */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToHome}
            title="Back to all albums"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-semibold transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Volumes</span>
          </button>

          <div className="h-4 w-px bg-stone-200 shrink-0" />

          {/* Editable Album Name */}
          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={albumTitleInput}
                onChange={(e) => setAlbumTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameAlbum()}
                autoFocus
                className="text-xs sm:text-sm font-serif font-medium text-stone-900 border border-stone-800 rounded-lg px-2.5 py-1 w-36 sm:w-56 focus:outline-hidden ring-1 ring-stone-900"
              />
              <button
                onClick={handleRenameAlbum}
                className="px-2 py-1 bg-stone-900 text-white rounded-lg text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsRenaming(true)}
              className="flex items-center gap-2 group cursor-pointer min-w-0"
              title="Click to rename album"
            >
              <h1 className="font-serif font-medium text-stone-900 text-sm sm:text-base tracking-tight truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                {album.name}
              </h1>
              <Edit2 className="w-3 h-3 text-stone-300 group-hover:text-stone-700 transition shrink-0" />
            </div>
          )}

          {/* Quiet Unboxed Metadata */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-stone-500 font-normal shrink-0">
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="font-mono tabular-nums">{pages.length} Pages</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="font-mono tabular-nums">{photos.length} Photos</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="text-[11px] text-stone-400">{PAGE_SIZE_CONFIGS[album.pageSizePreset]?.name || album.pageSizePreset}</span>
          </div>
        </div>

        {/* Zone 2: Save Status & Undo / Redo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status & Action */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-stone-500 bg-stone-100 rounded-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-600" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}
          {saveStatus === 'just_saved' && (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg transition"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Saved</span>
            </button>
          )}
          {saveStatus === 'saved' && (
            <button
              onClick={handleManualSave}
              title="Save project now"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100/80 hover:bg-stone-200/80 rounded-lg border border-stone-200/60 transition"
            >
              <Save className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200/80">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1 sm:p-1.5 text-stone-600 hover:text-stone-900 rounded-md disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white transition"
            >
              <Undo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="p-1 sm:p-1.5 text-stone-600 hover:text-stone-900 rounded-md disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white transition"
            >
              <Redo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Zone 3: Direct Actions & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop-only Quick Modals */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => setShowOrganizerModal(true)}
              title="Manage and reorder album pages"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition shadow-2xs"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-stone-600" />
              <span>Organize</span>
            </button>

            <button
              onClick={() => setShowBackgroundModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition shadow-2xs"
            >
              <Palette className="w-3.5 h-3.5 text-amber-600" />
              <span>Background</span>
            </button>

            <button
              onClick={() => setShowFrameModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition shadow-2xs"
            >
              <Frame className="w-3.5 h-3.5 text-stone-600" />
              <span>Frames</span>
            </button>

            <button
              onClick={() => setShowMarginsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-stone-500" />
              <span>Format</span>
            </button>

            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              title={isDrawerOpen ? 'Collapse Inspector (Wide Canvas)' : 'Show Inspector'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs ${
                isDrawerOpen
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border-stone-200/80'
              }`}
            >
              {isDrawerOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 text-stone-300" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>Inspector</span>
            </button>
          </div>

          {/* Preview Button */}
          <button
            onClick={() => setShowPreviewModal(true)}
            title="Preview Album Flipbook (Full Screen)"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition"
          >
            <Eye className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Prominent Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            title="Export as Print-Ready PDF or High-Res Images"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-sm transition active:scale-98"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export</span>
          </button>

          {/* Mobile More Tools Menu Button */}
          <button
            onClick={() => setShowMobileToolsModal(true)}
            title="More editing options & backup"
            className="lg:hidden p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
          >
            <MoreVertical className="w-4 h-4" />
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
            <main className="flex-1 flex flex-col bg-[#f5f4f0] relative overflow-hidden">
              {/* Quick Page Info Strip */}
              <div className="px-5 py-2 flex items-center justify-between text-xs text-stone-500 border-b border-stone-200/60 bg-white/60 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums font-semibold text-stone-900">
                    Page {String(activePage?.pageNumber || 1).padStart(2, '0')} of {String(pages.length).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true" className="text-stone-300">·</span>
                  <span className="text-stone-600">{getLayoutById(activePage?.layoutId || '').name}</span>
                </div>

                {/* Quick page actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowOrganizerModal(true)}
                    title="Open Page Grid Organizer"
                    className="flex items-center gap-1 px-2 py-0.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px] font-medium">Grid</span>
                  </button>
                  <button
                    onClick={handleDuplicatePage}
                    title="Duplicate Page"
                    className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-md transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDeletePage}
                    disabled={pages.length <= 1}
                    title="Delete Page"
                    className="p-1 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-25 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Interactive Canvas Container with Auto-Fit & Responsive Scaling */}
              <div
                ref={canvasContainerRef}
                className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-auto min-h-0 min-w-0"
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
                    onOpenFilterPicker={(slotIdx) => {
                      setActiveSlotIndex(slotIdx);
                      setFilterModalSlotIndex(slotIdx);
                      setShowFilterModal(true);
                    }}
                    onRemovePhoto={handleRemovePhotoFromSlot}
                    showMarginGuides={true}
                    interactive={true}
                    maxWidth={canvasMaxWidth}
                    maxHeight={canvasMaxHeight}
                  />
                )}

                {/* Floating Studio Viewport Controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-stone-900/90 text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-stone-800 backdrop-blur-md text-xs select-none">
                  {/* Zoom Out */}
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel === 0.5}
                    title="Zoom Out Canvas"
                    className="p-1 hover:bg-stone-800 rounded-full text-stone-300 hover:text-white transition disabled:opacity-30"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Fit Button */}
                  <button
                    onClick={() => setZoomLevel('fit')}
                    title="Fit Page to Screen (Auto)"
                    className={`px-2 py-0.5 rounded-full font-mono text-[11px] transition ${
                      zoomLevel === 'fit'
                        ? 'bg-stone-700 text-white font-semibold'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    Fit
                  </button>

                  <span className="text-[11px] font-mono text-stone-400 min-w-[36px] text-center tabular-nums">
                    {zoomLevel === 'fit' ? '100%' : `${Math.round(zoomLevel * 100)}%`}
                  </span>

                  {/* Zoom In */}
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel === 2.0}
                    title="Zoom In Canvas"
                    className="p-1 hover:bg-stone-800 rounded-full text-stone-300 hover:text-white transition disabled:opacity-30"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-stone-700 mx-1" />

                  {/* Toggle Inspector Drawer */}
                  <button
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    title={isDrawerOpen ? 'Collapse Inspector (Wide Canvas)' : 'Open Inspector'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition text-[11px] font-medium ${
                      isDrawerOpen ? 'bg-stone-800 text-amber-400' : 'text-stone-300 hover:text-white hover:bg-stone-800'
                    }`}
                  >
                    {isDrawerOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
                    <span className="hidden sm:inline">Inspector</span>
                  </button>

                  {/* Grid Organizer Button */}
                  <button
                    onClick={() => setShowOrganizerModal(true)}
                    title="Organize All Spreads in Grid View"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-stone-300 hover:text-white hover:bg-stone-800 transition text-[11px] font-medium"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>

                  {/* Toggle Filmstrip */}
                  <button
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    title={showThumbnails ? 'Collapse Page Filmstrip (More Height)' : 'Expand Page Filmstrip'}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition text-[11px] font-medium ${
                      !showThumbnails ? 'bg-stone-800 text-amber-400' : 'text-stone-300 hover:text-white hover:bg-stone-800'
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
                onUpdatePlacementFilter={handleUpdatePlacementFilter}
                onUpdatePlacementAdjustments={handleUpdatePlacementAdjustments}
                onOpenFilterModal={(slotIdx) => {
                  setActiveSlotIndex(slotIdx);
                  setFilterModalSlotIndex(slotIdx);
                  setShowFilterModal(true);
                }}
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

      {/* 3. BOTTOM THUMBNAIL STRIP & PAGE REORDERING (ZERO LAYOUT JUMP DRAG & DROP) */}
      {showThumbnails ? (
        <footer className="h-28 bg-white border-t border-stone-200/80 px-4 flex items-center gap-3 overflow-x-auto z-10 shadow-lg relative shrink-0">
          <div className="absolute top-1.5 right-3 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setShowOrganizerModal(true)}
              title="Open Page Grid Organizer"
              className="flex items-center gap-1 px-2 py-0.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md text-[11px] font-semibold transition"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setShowThumbnails(false)}
              title="Minimize filmstrip for more editing space"
              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page thumbnails */}
          {pages.map((p, idx) => {
            const isSelected = idx === activePageIndex;
            const isDraggingThis = draggedPageIndex === idx;
            const isDropTarget = dragOverPageIndex === idx;
            const layout = getLayoutById(p.layoutId);
            const photoCount = p.placements.filter((pl) => pl.photoId).length;

            return (
              <div
                key={p.id}
                draggable={true}
                onDragStart={(e) => handlePageDragStart(e, idx)}
                onDragOver={(e) => handlePageDragOver(e, idx)}
                onDragLeave={(e) => handlePageDragLeave(e, idx)}
                onDrop={(e) => handlePageDrop(e, idx)}
                onDragEnd={handlePageDragEnd}
                onClick={() => {
                  setActivePageIndex(idx);
                  setActiveSlotIndex(null);
                }}
                title={`Drag to reorder • Page ${p.pageNumber}`}
                className={`flex-shrink-0 group relative cursor-grab active:cursor-grabbing flex flex-col items-center p-1.5 rounded-xl border-2 transition select-none ${
                  isDraggingThis
                    ? 'opacity-30 scale-95 border-dashed border-stone-400 bg-stone-100/50 shadow-none'
                    : isDropTarget
                    ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900 shadow-md'
                    : isSelected
                    ? 'border-stone-900 bg-stone-50/80 shadow-xs ring-2 ring-stone-900/10'
                    : 'border-stone-200/80 hover:border-stone-300 bg-white hover:shadow-xs'
                }`}
              >
                {/* Non-layout-shifting Drop Visual Overlay Indicator */}
                {isDropTarget && (
                  <div
                    className={`absolute top-1 bottom-1 w-1.5 bg-stone-900 rounded-full z-30 pointer-events-none shadow-md ${
                      dropPosition === 'before' ? '-left-2' : '-right-2'
                    }`}
                  />
                )}

                {/* Drag Handle Top Right */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition z-10 p-0.5 bg-white/95 rounded text-stone-400 shadow-2xs">
                  <GripVertical className="w-3 h-3" />
                </div>

                {/* Micro layout preview with custom background representation */}
                <div
                  className="w-24 h-16 rounded border border-stone-200/80 relative overflow-hidden flex items-center justify-center shadow-2xs pointer-events-none bg-white"
                  style={{ background: getBackgroundPreviewCss(p.backgroundConfig, p.backgroundColor) }}
                >
                  {layout.slots.map((s, sIdx) => {
                    const pl = p.placements.find((item) => item.slotIndex === sIdx);
                    const photo = pl?.photoId ? photos.find((ph) => ph.id === pl.photoId) : null;

                    return (
                      <div
                        key={s.id || sIdx}
                        className="absolute bg-stone-200 border border-white/80 rounded-[1px] overflow-hidden"
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
                <div className="flex items-center justify-between w-full px-1 pt-1 text-[11px] pointer-events-none">
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-stone-300 group-hover:text-stone-500" />
                    <span className={`font-mono font-semibold ${isSelected ? 'text-stone-900 font-bold' : 'text-stone-700'}`}>
                      {String(p.pageNumber).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">{photoCount}p</span>
                </div>

                {/* Reorder Buttons (Move Left / Right) */}
                <div className="absolute -top-2 inset-x-0 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMovePage(idx, idx - 1);
                    }}
                    disabled={idx === 0}
                    title="Move Page Left"
                    className="p-1 bg-white border border-stone-200 rounded-full shadow-xs text-stone-600 hover:text-stone-900 disabled:opacity-20 transition"
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
                    className="p-1 bg-white border border-stone-200 rounded-full shadow-xs text-stone-600 hover:text-stone-900 disabled:opacity-20 transition"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Blank Page Button Card */}
          <button
            onClick={() => handleAddPage()}
            title="Append Blank Spread"
            className="flex-shrink-0 w-24 h-[84px] border-2 border-dashed border-stone-200 hover:border-stone-400 bg-stone-50/60 hover:bg-white rounded-xl flex flex-col items-center justify-center text-stone-500 hover:text-stone-900 transition"
          >
            <Plus className="w-4 h-4 mb-0.5 text-stone-600" />
            <span className="text-[10px] font-semibold">Add Spread</span>
          </button>
        </footer>
      ) : (
        <footer className="h-10 bg-white border-t border-stone-200 px-4 flex items-center justify-between z-10 shadow-2xs shrink-0 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePageIndex === 0}
              title="Previous Page"
              className="p-1 hover:bg-stone-100 rounded disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono tabular-nums font-semibold text-stone-900">
              Page {activePageIndex + 1} of {pages.length}
            </span>
            <button
              onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={activePageIndex === pages.length - 1}
              title="Next Page"
              className="p-1 hover:bg-stone-100 rounded disabled:opacity-30 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
            {pages.map((p, idx) => {
              const isDraggingThis = draggedPageIndex === idx;
              const isDropTarget = dragOverPageIndex === idx;

              return (
                <div key={p.id} className="relative">
                  {isDropTarget && (
                    <div
                      className={`absolute top-0 bottom-0 w-1 bg-stone-900 rounded-full z-30 pointer-events-none ${
                        dropPosition === 'before' ? '-left-1' : '-right-1'
                      }`}
                    />
                  )}
                  <button
                    draggable={true}
                    onDragStart={(e) => handlePageDragStart(e, idx)}
                    onDragOver={(e) => handlePageDragOver(e, idx)}
                    onDragLeave={(e) => handlePageDragLeave(e, idx)}
                    onDrop={(e) => handlePageDrop(e, idx)}
                    onDragEnd={handlePageDragEnd}
                    onClick={() => {
                      setActivePageIndex(idx);
                      setActiveSlotIndex(null);
                    }}
                    title={`Drag to reorder • Page ${p.pageNumber}`}
                    className={`w-6 h-6 rounded-md text-[11px] font-mono font-semibold transition cursor-grab active:cursor-grabbing select-none ${
                      isDraggingThis
                        ? 'opacity-30 scale-90 border-dashed border-stone-400 bg-stone-200'
                        : idx === activePageIndex
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {p.pageNumber}
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => handleAddPage()}
              title="Add Page"
              className="w-6 h-6 rounded-md border border-dashed border-stone-300 hover:border-stone-500 text-stone-500 hover:text-stone-900 flex items-center justify-center transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOrganizerModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100 transition"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setShowThumbnails(true)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100 transition"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Filmstrip</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}

      {/* MOBILE BOTTOM QUICK DOCK (Visible only on < lg) */}
      <div className="lg:hidden h-14 bg-white border-t border-slate-200 px-2 flex items-center justify-around z-20 shrink-0 shadow-lg text-slate-700">
        <button
          onClick={() => setShowBackgroundModal(true)}
          className="flex flex-col items-center justify-center p-1 text-[10px] font-semibold text-slate-700 hover:text-blue-600 transition"
        >
          <Palette className="w-4 h-4 text-blue-600 mb-0.5" />
          <span>Background</span>
        </button>

        <button
          onClick={() => setShowFrameModal(true)}
          className="flex flex-col items-center justify-center p-1 text-[10px] font-semibold text-slate-700 hover:text-amber-600 transition"
        >
          <Frame className="w-4 h-4 text-amber-600 mb-0.5" />
          <span>Frames</span>
        </button>

        <button
          onClick={() => setShowMarginsModal(true)}
          className="flex flex-col items-center justify-center p-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 transition"
        >
          <Sliders className="w-4 h-4 text-slate-500 mb-0.5" />
          <span>Margins</span>
        </button>

        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition ${
            isDrawerOpen ? 'text-blue-600 font-bold' : 'text-slate-700'
          }`}
        >
          <PanelRightOpen className="w-4 h-4 mb-0.5 text-blue-600" />
          <span>Inspector</span>
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          className="flex flex-col items-center justify-center p-1 text-[10px] font-bold text-blue-700 transition"
        >
          <Download className="w-4 h-4 text-blue-600 mb-0.5" />
          <span>Export</span>
        </button>
      </div>

      {/* MOBILE TOOLS MODAL */}
      {showMobileToolsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Studio Options & Tools</h3>
                <p className="text-xs text-slate-500">Quick settings, customization, and backup</p>
              </div>
              <button
                onClick={() => setShowMobileToolsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setShowMobileToolsModal(false);
                  setShowBackgroundModal(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 text-left transition"
              >
                <Palette className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Backgrounds</div>
                  <div className="text-[10px] text-slate-500">Colors, textures, photo watermark</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileToolsModal(false);
                  setShowFrameModal(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-amber-50/50 text-left transition"
              >
                <Frame className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Frames</div>
                  <div className="text-[10px] text-slate-500">Floral, smiley, wood, oak, upload</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileToolsModal(false);
                  setShowMarginsModal(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-left transition"
              >
                <Sliders className="w-5 h-5 text-slate-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Page Margins</div>
                  <div className="text-[10px] text-slate-500">Bleed, padding, paper size</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileToolsModal(false);
                  setShowPreviewModal(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-left transition"
              >
                <Eye className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Flipbook Preview</div>
                  <div className="text-[10px] text-slate-500">Full album interactive preview</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMobileToolsModal(false);
                  setShowFilterModal(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/50 text-left transition"
              >
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Photo Filters</div>
                  <div className="text-[10px] text-slate-500">B&W, Sepia, Brightness/Contrast</div>
                </div>
              </button>
            </div>

            {/* Project Backup & Restore */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-blue-600" />
                  Save & Backup Project
                </span>
                <span className="text-[11px] font-mono text-emerald-600 font-semibold">IndexedDB Active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Your album automatically saves locally. You can also download a project file to restore anywhere.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleExportProjectBackup();
                    setShowMobileToolsModal(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition shadow-2xs"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download Backup</span>
                </button>

                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      handleRestoreProjectBackup(e);
                      setShowMobileToolsModal(false);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowMobileToolsModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
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

      {showFilterModal && (
        <PhotoFilterModal
          photo={
            photos.find(
              (ph) =>
                ph.id ===
                activePage?.placements.find(
                  (p) => p.slotIndex === (filterModalSlotIndex ?? activeSlotIndex)
                )?.photoId
            ) || photos[0] || null
          }
          currentFilter={
            activePage?.placements.find(
              (p) => p.slotIndex === (filterModalSlotIndex ?? activeSlotIndex)
            )?.filter || 'none'
          }
          currentAdjustments={
            activePage?.placements.find(
              (p) => p.slotIndex === (filterModalSlotIndex ?? activeSlotIndex)
            )?.adjustments
          }
          slotIndex={filterModalSlotIndex ?? activeSlotIndex ?? 0}
          onApply={handleApplyFilterAndAdjustments}
          onClose={() => {
            setShowFilterModal(false);
            setFilterModalSlotIndex(null);
          }}
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
          photos={photos}
          initialPageNumber={activePageIndex + 1}
          onClose={() => setShowPreviewModal(false)}
          onEditPage={(pageIdx) => {
            setActivePageIndex(pageIdx);
            setShowPreviewModal(false);
          }}
        />
      )}

      {showOrganizerModal && (
        <PageOrganizerModal
          album={album}
          pages={pages}
          photos={photos}
          activePageIndex={activePageIndex}
          onSelectPage={(index) => {
            setActivePageIndex(index);
            setActiveSlotIndex(null);
          }}
          onReorderPages={handleMovePage}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePageByIndex}
          onDeletePage={handleDeletePageByIndex}
          onClose={() => setShowOrganizerModal(false)}
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
