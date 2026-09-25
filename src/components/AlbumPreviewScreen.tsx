import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Edit3, BookOpen, Layers } from 'lucide-react';
import { Album, AlbumPage, StoredPhoto } from '../types/album';
import { PageCanvas } from './PageCanvas';
import { getLayoutById } from '../services/layouts';
import { getBackgroundPreviewCss } from '../services/backgrounds';

interface AlbumPreviewScreenProps {
  album: Album;
  pages: AlbumPage[];
  photos?: StoredPhoto[];
  initialPageNumber?: number;
  onClose: () => void;
  onEditPage: (pageIndex: number) => void;
}

export const AlbumPreviewScreen: React.FC<AlbumPreviewScreenProps> = ({
  album,
  pages,
  photos = [],
  initialPageNumber = 1,
  onClose,
  onEditPage,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(
    Math.max(0, Math.min(pages.length - 1, initialPageNumber - 1))
  );

  const currentPage = pages[currentPageIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length, onClose]);

  if (!currentPage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-stone-800 bg-stone-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="font-serif text-base sm:text-lg tracking-tight text-stone-100">{album.name}</h2>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-normal">
              <span>Full Screen Album Preview</span>
              <span aria-hidden="true" className="text-stone-600">·</span>
              <span className="font-mono tabular-nums">Page {currentPageIndex + 1} of {pages.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onEditPage(currentPageIndex)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit this Page</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
            title="Exit preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Preview Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-stone-950">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentPageIndex === 0}
          title="Previous Page (Left Arrow)"
          className={`absolute left-4 sm:left-8 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-white shadow-2xl transition backdrop-blur-md ${
            currentPageIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Page Render Canvas with Archival Paper Depth */}
        <div className="max-w-5xl max-h-[80vh] flex items-center justify-center shadow-2xl rounded-sm">
          <PageCanvas
            album={album}
            page={currentPage}
            activeSlotIndex={null}
            onSelectSlot={() => {}}
            onUpdatePlacement={() => {}}
            showMarginGuides={false}
            interactive={false}
            maxWidth={typeof window !== 'undefined' ? Math.max(300, Math.min(1100, window.innerWidth - 180)) : 980}
            maxHeight={typeof window !== 'undefined' ? Math.max(220, Math.min(760, window.innerHeight - 240)) : 680}
          />
        </div>

        {/* Next Button */}
        <button
          onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
          disabled={currentPageIndex === pages.length - 1}
          title="Next Page (Right Arrow)"
          className={`absolute right-4 sm:right-8 z-20 p-3 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-stone-700/80 text-white shadow-2xl transition backdrop-blur-md ${
            currentPageIndex === pages.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Thumbnail Strip for Instant Page Jumping */}
      <footer className="h-24 bg-stone-900/95 border-t border-stone-800 px-6 py-3 flex items-center gap-3 overflow-x-auto shrink-0">
        {pages.map((p, idx) => {
          const layout = getLayoutById(p.layoutId);
          const isSelected = idx === currentPageIndex;

          return (
            <button
              key={p.id}
              onClick={() => setCurrentPageIndex(idx)}
              className={`flex-shrink-0 group relative p-1 rounded-xl border-2 transition-all flex flex-col items-center ${
                isSelected
                  ? 'border-amber-500 bg-amber-950/20 ring-2 ring-amber-500/30'
                  : 'border-stone-800 bg-stone-950/60 hover:border-stone-700'
              }`}
            >
              {/* Micro layout preview */}
              <div
                className="w-20 h-12 rounded border border-stone-800 relative overflow-hidden flex items-center justify-center bg-stone-900"
                style={{ background: getBackgroundPreviewCss(p.backgroundConfig, p.backgroundColor) }}
              >
                {layout.slots.map((s, sIdx) => {
                  const pl = p.placements.find((item) => item.slotIndex === sIdx);
                  const photo = pl?.photoId ? photos.find((ph) => ph.id === pl.photoId) : null;

                  return (
                    <div
                      key={s.id || sIdx}
                      className="absolute bg-stone-800 border border-black/40 rounded-[1px] overflow-hidden"
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

              <span className={`text-[10px] font-mono mt-1 font-semibold ${isSelected ? 'text-amber-400' : 'text-stone-400'}`}>
                {String(p.pageNumber).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </footer>
    </div>
  );
};
