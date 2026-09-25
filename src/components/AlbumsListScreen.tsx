import React, { useState } from 'react';
import {
  Plus,
  BookOpen,
  Calendar,
  Layers,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Copy,
  Edit2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Album } from '../types/album';

interface AlbumsListScreenProps {
  albums: Album[];
  albumStats: Record<string, { pagesCount: number; photosCount: number; coverUrl?: string }>;
  onCreateAlbumClick: () => void;
  onOpenAlbum: (albumId: string) => void;
  onRenameAlbum: (albumId: string, newName: string) => void;
  onDuplicateAlbum: (albumId: string) => void;
  onDeleteAlbum: (albumId: string) => void;
  onSeedDemoAlbum: () => void;
  isSeeding: boolean;
}

export const AlbumsListScreen: React.FC<AlbumsListScreenProps> = ({
  albums,
  albumStats,
  onCreateAlbumClick,
  onOpenAlbum,
  onRenameAlbum,
  onDuplicateAlbum,
  onDeleteAlbum,
  onSeedDemoAlbum,
  isSeeding,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const handleStartRename = (album: Album) => {
    setEditingAlbumId(album.id);
    setRenameText(album.name);
    setActiveMenuId(null);
  };

  const handleSaveRename = (albumId: string) => {
    if (renameText.trim()) {
      onRenameAlbum(albumId, renameText.trim());
    }
    setEditingAlbumId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between pb-8 mb-10 border-b border-stone-200/80 gap-6">
        <div>
          {/* Unboxed Metadata Header */}
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium tracking-wide mb-2">
            <span className="font-semibold text-stone-800">Lumina Studio</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>300 DPI Archival Engine</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Local Memory Cache</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-stone-900 font-serif tracking-tight">
            Curated Photo Volumes
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-xl font-normal leading-relaxed">
            Compose bespoke hardcover albums, archival portfolios, and custom multi-photo spreads with millimetric drafting precision.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            onClick={onSeedDemoAlbum}
            disabled={isSeeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300/80 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-2xs transition active:scale-98"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isSeeding ? 'Creating Sample...' : 'Explore Sample Volume'}</span>
          </button>

          <button
            onClick={onCreateAlbumClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-md shadow-stone-900/10 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>New Album</span>
          </button>
        </div>
      </div>

      {/* Album Cards Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-3xl border border-stone-200 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-stone-200">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-serif text-stone-900 mb-2">No Photo Volumes Yet</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Begin by creating your first photo book volume or explore our pre-configured fine-art sample project.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onSeedDemoAlbum}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Sample Project</span>
            </button>
            <button
              onClick={onCreateAlbumClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Album</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {albums.map((album) => {
            const stats = albumStats[album.id] || { pagesCount: 0, photosCount: 0 };
            const formattedDate = new Date(album.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={album.id}
                className="group bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-xl hover:border-stone-300 transition-all duration-300 overflow-hidden flex flex-col relative"
              >
                {/* Physical Hardcover Spine & Cover Area */}
                <div
                  onClick={() => onOpenAlbum(album.id)}
                  className="relative aspect-16/10 bg-stone-100 cursor-pointer overflow-hidden flex items-center justify-center border-b border-stone-100"
                >
                  {/* Subtle Book Spine Accent along left edge */}
                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-stone-800/20 via-stone-800/10 to-transparent z-10 pointer-events-none" />

                  {stats.coverUrl ? (
                    <img
                      src={stats.coverUrl}
                      alt={album.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-300">
                      <ImageIcon className="w-10 h-10 mb-1 text-stone-300" />
                      <span className="text-xs text-stone-400">Empty Album</span>
                    </div>
                  )}

                  {/* Clean Page Geometry Label */}
                  <div className="absolute bottom-3 left-4 px-2 py-0.5 bg-stone-900/80 backdrop-blur-xs rounded text-[10px] font-medium text-white tracking-wide">
                    {album.pageSizePreset.replace('_', ' ')}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title & Rename Control */}
                    <div className="flex items-start justify-between gap-2 relative">
                      {editingAlbumId === album.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(album.id)}
                            autoFocus
                            className="flex-1 text-sm font-bold text-stone-900 border border-stone-800 rounded px-2.5 py-1 focus:outline-hidden"
                          />
                          <button
                            onClick={() => handleSaveRename(album.id)}
                            className="text-xs bg-stone-900 text-white px-2.5 py-1 rounded font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <h2
                          onClick={() => onOpenAlbum(album.id)}
                          className="font-serif text-lg text-stone-900 hover:text-stone-700 cursor-pointer line-clamp-1 transition tracking-tight"
                        >
                          {album.name}
                        </h2>
                      )}

                      {/* Menu Toggle */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === album.id ? null : album.id)}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                          title="Album Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Menu Dropdown */}
                        {activeMenuId === album.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={() => handleStartRename(album)}
                                className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 font-medium transition"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                                <span>Rename Title</span>
                              </button>
                              <button
                                onClick={() => {
                                  onDuplicateAlbum(album.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 font-medium transition"
                              >
                                <Copy className="w-3.5 h-3.5 text-stone-400" />
                                <span>Duplicate Volume</span>
                              </button>
                              <div className="my-1 border-t border-stone-100" />
                              <button
                                onClick={() => {
                                  onDeleteAlbum(album.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete Volume</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Clean Unboxed Metadata */}
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-2 font-medium">
                      <span>{stats.pagesCount} Pages</span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span>{stats.photosCount} Photos</span>
                      <span aria-hidden="true" className="text-stone-300">·</span>
                      <span className="capitalize">{album.pageSizePreset.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 text-xs text-stone-400">
                    <span className="tabular-nums">Updated {formattedDate}</span>

                    <button
                      onClick={() => onOpenAlbum(album.id)}
                      className="font-semibold text-xs text-stone-900 group-hover:text-blue-600 flex items-center gap-1 transition"
                    >
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
