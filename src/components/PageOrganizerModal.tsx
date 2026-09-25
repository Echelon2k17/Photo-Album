import React, { useState } from 'react';
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  BookOpen,
  LayoutGrid,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Album, AlbumPage, StoredPhoto } from '../types/album';
import { getLayoutById } from '../services/layouts';
import { getBackgroundPreviewCss } from '../services/backgrounds';

interface PageOrganizerModalProps {
  album: Album;
  pages: AlbumPage[];
  photos: StoredPhoto[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => Promise<void>;
  onAddPage: (afterIndex?: number) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onClose: () => void;
}

export const PageOrganizerModal: React.FC<PageOrganizerModalProps> = ({
  album,
  pages,
  photos,
  activePageIndex,
  onSelectPage,
  onReorderPages,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onClose,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<'before' | 'after' | null>(null);
  const [justMovedIdx, setJustMovedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIdx === null || draggedIdx === index) {
      if (dragOverIdx !== null) {
        setDragOverIdx(null);
        setDropPos(null);
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'before' : 'after';

    if (dragOverIdx !== index || dropPos !== pos) {
      setDragOverIdx(index);
      setDropPos(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;

    if (dragOverIdx === index) {
      setDragOverIdx(null);
      setDropPos(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      setDropPos(null);
      return;
    }

    let destIndex = targetIndex;
    if (dropPos === 'before') {
      destIndex = draggedIdx < targetIndex ? targetIndex - 1 : targetIndex;
    } else if (dropPos === 'after') {
      destIndex = draggedIdx < targetIndex ? targetIndex : targetIndex + 1;
    }

    destIndex = Math.max(0, Math.min(pages.length - 1, destIndex));
    const srcIndex = draggedIdx;

    setDraggedIdx(null);
    setDragOverIdx(null);
    setDropPos(null);

    if (srcIndex !== destIndex) {
      await onReorderPages(srcIndex, destIndex);
      setJustMovedIdx(destIndex);
      setTimeout(() => setJustMovedIdx(null), 1200);
    }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDropPos(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-stone-200/80 overflow-hidden">
        {/* Modal Header */}
        <header className="px-6 py-4.5 border-b border-stone-200/80 bg-stone-50/70 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 font-medium tracking-wide">
              <span className="font-semibold text-stone-800">{album.name}</span>
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className="font-mono tabular-nums">{pages.length} Pages Total</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-stone-900 tracking-tight mt-0.5">
              Organize Page Sequence
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onAddPage()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold border border-stone-200 transition active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition active:scale-98"
            >
              Done
            </button>

            <button
              onClick={onClose}
              title="Close dialog"
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Informative Sub-bar */}
        <div className="px-6 py-2 bg-stone-100/60 border-b border-stone-200/60 flex items-center justify-between text-xs text-stone-500">
          <span>Drag cards or use arrow buttons to rearrange album pages. Ordering updates immediately in your local storage.</span>
          <span className="text-[11px] font-mono text-stone-400 hidden sm:inline">Esc to dismiss</span>
        </div>

        {/* Grid of Pages */}
        <div className="flex-1 p-6 overflow-y-auto bg-stone-50/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {pages.map((p, idx) => {
              const layout = getLayoutById(p.layoutId);
              const isSelected = idx === activePageIndex;
              const isDragging = draggedIdx === idx;
              const isDropTarget = dragOverIdx === idx;
              const isJustMoved = justMovedIdx === idx;
              const photoCount = p.placements.filter((pl) => pl.photoId).length;

              return (
                <div
                  key={p.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={(e) => handleDragLeave(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`group relative bg-white rounded-2xl border transition-all duration-200 p-2.5 flex flex-col cursor-grab active:cursor-grabbing select-none ${
                    isDragging
                      ? 'opacity-30 scale-95 border-dashed border-stone-400 ring-2 ring-stone-400/40 shadow-none'
                      : isDropTarget
                      ? 'border-stone-900 ring-2 ring-stone-900 shadow-lg scale-102'
                      : isJustMoved
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md'
                      : isSelected
                      ? 'border-stone-900 shadow-md ring-2 ring-stone-900/10'
                      : 'border-stone-200/80 hover:border-stone-300 hover:shadow-md'
                  }`}
                >
                  {/* Drop indicator bar overlay */}
                  {isDropTarget && (
                    <div
                      className={`absolute top-2 bottom-2 w-1.5 bg-stone-900 rounded-full z-30 pointer-events-none ${
                        dropPos === 'before' ? '-left-2' : '-right-2'
                      } shadow-md`}
                    />
                  )}

                  {/* Top Bar on Card: Page Number & Drag Grip */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-600 transition" />
                      <span className="font-mono text-xs font-semibold text-stone-900">
                        {String(p.pageNumber).padStart(2, '0')}
                      </span>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono">
                      {photoCount}/{layout.slotsCount}p
                    </span>
                  </div>

                  {/* Thumbnail Spread Preview */}
                  <div
                    onClick={() => {
                      onSelectPage(idx);
                      onClose();
                    }}
                    className="relative aspect-16/11 w-full rounded-xl border border-stone-200/80 overflow-hidden cursor-pointer shadow-2xs hover:opacity-95 transition bg-white"
                    style={{ background: getBackgroundPreviewCss(p.backgroundConfig, p.backgroundColor) }}
                  >
                    {layout.slots.map((s, sIdx) => {
                      const pl = p.placements.find((item) => item.slotIndex === sIdx);
                      const photo = pl?.photoId ? photos.find((ph) => ph.id === pl.photoId) : null;

                      return (
                        <div
                          key={s.id || sIdx}
                          className="absolute bg-stone-200/80 border border-white/80 rounded-[2px] overflow-hidden"
                          style={{
                            left: `${s.x * 100}%`,
                            top: `${s.y * 100}%`,
                            width: `${s.width * 100}%`,
                            height: `${s.height * 100}%`,
                          }}
                        >
                          {photo?.thumbnailUrl ? (
                            <img
                              src={photo.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Layout Title */}
                  <div className="pt-2 px-0.5 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="truncate max-w-[90px]">{layout.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(idx);
                        onClose();
                      }}
                      className="text-stone-700 hover:text-stone-900 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Reordering Controls (Move Left / Right, Duplicate, Delete) */}
                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderPages(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        title="Move Earlier in Album"
                        className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-20 transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderPages(idx, idx + 1);
                        }}
                        disabled={idx === pages.length - 1}
                        title="Move Later in Album"
                        className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-20 transition"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage(idx);
                        }}
                        title="Duplicate Page"
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(idx);
                        }}
                        disabled={pages.length <= 1}
                        title="Delete Page"
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Page Card */}
            <button
              onClick={() => onAddPage()}
              className="group border-2 border-dashed border-stone-200 hover:border-stone-400 bg-white/60 hover:bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center transition min-h-[170px]"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-stone-200 text-stone-700 flex items-center justify-center mb-2 transition">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-stone-800">Add Spread</span>
              <span className="text-[11px] text-stone-400 mt-0.5">Append new page</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-3 border-t border-stone-200/80 bg-white flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Tip:</span>
            <span>You can also drag page cards in the bottom filmstrip of the editor workspace at any time.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold transition"
          >
            Return to Editor
          </button>
        </footer>
      </div>
    </div>
  );
};
