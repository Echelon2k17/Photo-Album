import React, { useState } from 'react';
import {
  FileText,
  Archive,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import {
  Album,
  AlbumPage,
  ExportDpi,
  ExportFormat,
  ExportSettings,
  PAGE_SIZE_CONFIGS,
  PageDimensions,
  StoredPhoto
} from '../types/album';
import { computeCanvasDimensions, exportAlbum, ExportProgress, triggerFileDownload } from '../services/exporter';

interface ExportModalProps {
  album: Album;
  pages: AlbumPage[];
  photos: StoredPhoto[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ album, pages, photos, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [dpi, setDpi] = useState<ExportDpi>(300);
  const [jpegQuality, setJpegQuality] = useState<number>(0.95);
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pageDims: PageDimensions =
    album.pageSizePreset === 'CUSTOM' && album.customWidthMm && album.customHeightMm
      ? { widthMm: album.customWidthMm, heightMm: album.customHeightMm, name: 'Custom' }
      : PAGE_SIZE_CONFIGS[album.pageSizePreset] || PAGE_SIZE_CONFIGS.A4_LANDSCAPE;

  const { widthPx, heightPx } = computeCanvasDimensions(pageDims, dpi);

  // Estimate output size based on page count and DPI
  const approxMbPerPage = dpi === 150 ? 0.8 : dpi === 300 ? 3.2 : 6.8;
  const estimatedTotalMb = (pages.length * approxMbPerPage).toFixed(1);

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setProgress({
      currentPage: 0,
      totalPages: pages.length,
      stage: 'rendering',
      message: 'Initializing high-resolution print pipeline...',
    });

    const settings: ExportSettings = {
      format,
      dpi,
      jpegQuality,
      includePageNumbers,
    };

    try {
      const result = await exportAlbum(album, pages, settings, (p) => {
        setProgress(p);
      });
      setExportResult(result);
    } catch (err: any) {
      console.error('Export failure:', err);
      setErrorMsg(err?.message || 'Export failed. Please ensure memory is available and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    if (exportResult) {
      triggerFileDownload(exportResult.blob, exportResult.fileName);
    }
  };

  const handleShare = async () => {
    if (!exportResult) return;
    try {
      const file = new File([exportResult.blob], exportResult.fileName, {
        type: format === 'PDF' ? 'application/pdf' : 'application/zip',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: album.name,
          text: `Photo Album: ${album.name}`,
        });
      } else {
        // Fallback to download
        handleDownload();
      }
    } catch (err) {
      console.warn('Share dismissed or unsupported:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Export High-Resolution Album</h3>
              <p className="text-xs text-slate-500">Print-ready PDF & sequentially archived JPEG ZIP</p>
            </div>
          </div>
          {!isExporting && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-semibold p-1">
              ✕
            </button>
          )}
        </div>

        {/* Export Completed Screen */}
        {exportResult ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Export Ready!</h4>
              <p className="text-xs text-slate-600 mt-1">
                Your album <span className="font-semibold text-slate-900">{album.name}</span> has been rendered at{' '}
                <span className="font-semibold text-blue-600">{dpi} DPI</span> ({widthPx} × {heightPx} px).
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                File: {exportResult.fileName} ({(exportResult.blob.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Save to Device</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
                Back to Album Editor
              </button>
            </div>
          </div>
        ) : isExporting ? (
          /* Active Progress Screen */
          <div className="py-8 space-y-4 text-center">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Rendering High-Resolution Pages</h4>
              <p className="text-xs text-slate-600 mt-1">{progress?.message || 'Processing pages...'}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((progress?.currentPage || 0) / (progress?.totalPages || 1)) * 100)}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>
                Page {progress?.currentPage} of {progress?.totalPages}
              </span>
              <span>
                {Math.round(((progress?.currentPage || 0) / (progress?.totalPages || 1)) * 100)}%
              </span>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-800 text-left">
              <p className="font-semibold mb-0.5">Memory-Safe Sequential Pipeline Active</p>
              <p className="text-blue-700">
                Retrieving original uncompressed image files page-by-page and freeing memory immediately after encoding.
              </p>
            </div>
          </div>
        ) : (
          /* Configuration Screen */
          <div className="py-4 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2 border border-red-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Format Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('PDF')}
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${
                    format === 'PDF'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <FileText className={`w-5 h-5 mt-0.5 ${format === 'PDF' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Single Print PDF</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      All {pages.length} pages in one print-ready multi-page PDF.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('ZIP_JPEG')}
                  className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${
                    format === 'ZIP_JPEG'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Archive className={`w-5 h-5 mt-0.5 ${format === 'ZIP_JPEG' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-900">JPEG Archive (.zip)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Individual high-res JPEGs named Album_Page_001.jpg...
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Print Resolution (DPI) Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Print Resolution
                </label>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  {widthPx} × {heightPx} px / page
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 150, label: 'Standard', desc: '150 DPI (Web & Screen)' },
                  { value: 300, label: 'High (Recommended)', desc: '300 DPI (Studio Print)' },
                  { value: 450, label: 'Maximum', desc: '450 DPI (Fine Art Gallery)' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDpi(item.value as ExportDpi)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      dpi === item.value
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <p className="text-xs">{item.label}</p>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality & Options */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">JPEG Compression Quality</span>
                <span className="font-mono text-slate-600">{Math.round(jpegQuality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.0"
                step="0.05"
                value={jpegQuality}
                onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includePageNumbers}
                  onChange={(e) => setIncludePageNumbers(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Include subtle bottom page numbers (Page 1, 2, 3...)
                </span>
              </label>
            </div>

            {/* Summary Information Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Album Project:</span>
                <span className="font-semibold text-slate-800">{album.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Pages to Render:</span>
                <span className="font-semibold text-slate-800">{pages.length} Pages</span>
              </div>
              <div className="flex justify-between">
                <span>Original Photos:</span>
                <span className="font-semibold text-slate-800">{photos.length} High-Res Assets</span>
              </div>
              <div className="flex justify-between">
                <span>Page Format:</span>
                <span className="font-semibold text-slate-800">{pageDims.name}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-medium text-slate-700">
                <span>Estimated Archive Size:</span>
                <span className="font-mono">~{estimatedTotalMb} MB</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExport}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Begin High-Res Export</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
