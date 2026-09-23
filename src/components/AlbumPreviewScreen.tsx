import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Edit3, BookOpen } from 'lucide-react';
import { Album, AlbumPage } from '../types/album';
import { PageCanvas } from './PageCanvas';

interface AlbumPreviewScreenProps {
  album: Album;
  pages: AlbumPage[];
  initialPageNumber?: number;
  onClose: () => void;
  onEditPage: (pageIndex: number) => void;
}

export const AlbumPreviewScreen: React.FC<AlbumPreviewScreenProps> = ({
  album,
  pages,
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
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none">
      {/* Top Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="font-bold text-sm tracking-wide">{album.name}</h2>
            <p className="text-xs text-slate-400">Full Screen Album Preview</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            Page {currentPageIndex + 1} of {pages.length}
          </span>
          <button
            onClick={() => onEditPage(currentPageIndex)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Edit this Page</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Stage */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentPageIndex === 0}
          className={`absolute left-6 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-xl transition backdrop-blur-xs ${
            currentPageIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Page Render Canvas */}
        <div className="max-w-4xl max-h-[78vh] flex items-center justify-center shadow-2xl">
          <PageCanvas
            album={album}
            page={currentPage}
            activeSlotIndex={null}
            onSelectSlot={() => {}}
            onUpdatePlacement={() => {}}
            showMarginGuides={false}
            interactive={false}
            maxWidth={980}
            maxHeight={680}
          />
        </div>

        {/* Next Button */}
        <button
          onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
          disabled={currentPageIndex === pages.length - 1}
          className={`absolute right-6 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-xl transition backdrop-blur-xs ${
            currentPageIndex === pages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Thumbnail Strip for Instant Page Jumping */}
      <div className="h-20 bg-slate-900/90 border-t border-slate-800 px-6 py-2 flex items-center gap-3 overflow-x-auto">
        {pages.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setCurrentPageIndex(idx)}
            className={`flex-shrink-0 h-14 w-20 rounded border-2 overflow-hidden flex flex-col items-center justify-center transition ${
              idx === currentPageIndex
                ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/30'
                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-300">Page {idx + 1}</span>
            <span className="text-[9px] text-slate-500">{p.placements.filter((pl) => pl.photoId).length} photos</span>
          </button>
        ))}
      </div>
    </div>
  );
};
