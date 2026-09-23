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
  Sparkles
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Welcome / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
              Offline Local Studio
            </span>
            <span className="text-xs text-slate-400">Print Quality 300 DPI Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-serif">
            My Photo Albums
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create elegant photo albums, customize margins, adjust crops, and export print-ready PDFs and JPEG ZIPs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onSeedDemoAlbum}
            disabled={isSeeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{isSeeding ? 'Creating Sample...' : 'Try Sample Album'}</span>
          </button>

          <button
            onClick={onCreateAlbumClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Album</span>
          </button>
        </div>
      </div>

      {/* Album Cards Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs max-w-xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No Photo Albums Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Get started by creating your first photo album or load our curated high-resolution sample project.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onSeedDemoAlbum}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Sample Album</span>
            </button>
            <button
              onClick={onCreateAlbumClick}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Album</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Cover Image / Thumbnail Area */}
                <div
                  onClick={() => onOpenAlbum(album.id)}
                  className="relative aspect-16/10 bg-slate-100 cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  {stats.coverUrl ? (
                    <img
                      src={stats.coverUrl}
                      alt={album.name}
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon className="w-12 h-12 mb-1" />
                      <span className="text-[11px] font-medium text-slate-400">Empty Album</span>
                    </div>
                  )}

                  {/* Format Badge */}
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-md text-[10px] font-semibold text-white tracking-wide">
                    {album.pageSizePreset.replace('_', ' ')}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Album Name / Inline Rename */}
                    <div className="flex items-start justify-between gap-2 relative">
                      {editingAlbumId === album.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(album.id)}
                            autoFocus
                            className="flex-1 text-sm font-bold text-slate-900 border border-blue-500 rounded px-2 py-0.5"
                          />
                          <button
                            onClick={() => handleSaveRename(album.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <h2
                          onClick={() => onOpenAlbum(album.id)}
                          className="font-bold text-slate-900 text-base hover:text-blue-600 cursor-pointer line-clamp-1 transition"
                        >
                          {album.name}
                        </h2>
                      )}

                      {/* Dropdown Menu Toggle */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === album.id ? null : album.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === album.id && (
                          <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => handleStartRename(album)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Rename</span>
                            </button>
                            <button
                              onClick={() => {
                                onDuplicateAlbum(album.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Duplicate</span>
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              onClick={() => {
                                onDeleteAlbum(album.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{stats.pagesCount} Pages</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{stats.photosCount} Photos</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </div>

                    <button
                      onClick={() => onOpenAlbum(album.id)}
                      className="font-bold text-xs text-blue-600 hover:text-blue-800 transition"
                    >
                      Open Studio →
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
