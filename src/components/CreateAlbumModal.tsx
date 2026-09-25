import React, { useState } from 'react';
import { BookPlus, ArrowRight, X } from 'lucide-react';
import { PAGE_SIZE_CONFIGS, PageSizePreset } from '../types/album';

interface CreateAlbumModalProps {
  onClose: () => void;
  onSubmit: (name: string, pageSizePreset: PageSizePreset) => void;
}

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<PageSizePreset>('A4_LANDSCAPE');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a title for your photo volume.');
      return;
    }
    onSubmit(name.trim(), preset);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-stone-900 font-normal">New Album Volume</h3>
              <p className="text-xs text-stone-500">Step 1 of 3: Volume Title & Page Geometry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-5 space-y-5">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-2">
              Volume Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kyoto Architecture, Alpine Monograph, Summer 2026"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className="w-full px-4 py-3 text-sm rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-stone-900 focus:border-transparent transition bg-stone-50/50"
            />
            {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Visual Book Geometry Tiles */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-2">
              Book Page Geometry
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.entries(PAGE_SIZE_CONFIGS).map(([key, config]) => {
                const isSelected = preset === key;
                const isLandscape = config.widthMm > config.heightMm;
                const isSquare = config.widthMm === config.heightMm;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key as PageSizePreset)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      isSelected
                        ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    {/* Visual miniature aspect ratio box */}
                    <div className="h-10 flex items-center justify-center mb-2">
                      <div
                        className={`rounded-xs border transition ${
                          isSelected
                            ? 'border-white/80 bg-white/20'
                            : 'border-stone-400 bg-white'
                        }`}
                        style={{
                          width: isSquare ? 28 : isLandscape ? 36 : 24,
                          height: isSquare ? 28 : isLandscape ? 24 : 34,
                        }}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold truncate leading-tight">
                        {config.name.replace(/\s*\([^)]*\)/, '')}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 font-mono tabular-nums ${
                          isSelected ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        {config.widthMm} × {config.heightMm} mm
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-md transition active:scale-98"
            >
              <span>Continue: Ingest Photos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
