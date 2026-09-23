import React, { useState } from 'react';
import { BookPlus, ArrowRight } from 'lucide-react';
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
      setError('Please provide a name for your photo album.');
      return;
    }
    onSubmit(name.trim(), preset);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <BookPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Create New Album</h3>
            <p className="text-xs text-slate-500">Step 1 of 3: Album Name & Format</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Album Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Wedding Album, Swiss Alps 2026, Summer Memories"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
            {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Page Size Format
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as PageSizePreset)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            >
              {Object.entries(PAGE_SIZE_CONFIGS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
            >
              <span>Next: Select Photos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
