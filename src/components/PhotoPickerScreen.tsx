import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  FileImage
} from 'lucide-react';
import { StoredPhoto } from '../types/album';
import { SAMPLE_PHOTOS, createSamplePlaceholderBlob } from '../services/sampleData';
import { createDownsampledBlob, getObjectUrlForBlob, savePhoto } from '../services/db';

interface PhotoPickerScreenProps {
  albumName: string;
  albumId: string;
  existingPhotos: StoredPhoto[];
  onPhotosUpdated: (photos: StoredPhoto[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PhotoPickerScreen: React.FC<PhotoPickerScreenProps> = ({
  albumName,
  albumId,
  existingPhotos,
  onPhotosUpdated,
  onNext,
  onBack,
}) => {
  const [photos, setPhotos] = useState<StoredPhoto[]>(existingPhotos);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process uploaded files preserving the 3-tier image architecture
  const handleFiles = async (files: FileList) => {
    setIsProcessing(true);
    const newPhotos: StoredPhoto[] = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      setStatusMessage(`Ingesting photo ${i + 1} of ${files.length}: ${file.name}`);

      try {
        const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

        // Tier A: Original Blob (never resized or compressed)
        const originalBlob = file;

        // Tier B: Preview Blob (~1400px max) for high-speed editor rendering
        const previewResult = await createDownsampledBlob(originalBlob, 1400, 0.88);
        const previewUrl = getObjectUrlForBlob(photoId + '_preview', previewResult.blob);

        // Tier C: Thumbnail Blob (~260px max) for grid & page strips
        const thumbResult = await createDownsampledBlob(originalBlob, 260, 0.8);
        const thumbnailUrl = getObjectUrlForBlob(photoId + '_thumb', thumbResult.blob);

        const stored: StoredPhoto = {
          id: photoId,
          albumId,
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
        newPhotos.push(stored);
      } catch (err) {
        console.error('Failed to process image:', file.name, err);
      }
    }

    setPhotos(newPhotos);
    onPhotosUpdated(newPhotos);
    setIsProcessing(false);
    setStatusMessage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const filtered = photos.filter((p) => p.id !== photoId);
    setPhotos(filtered);
    onPhotosUpdated(filtered);
  };

  // Quick 1-click sample loader for testing large 12-24 photo collections
  const handleLoadSamplePhotos = async () => {
    setIsProcessing(true);
    const newPhotos: StoredPhoto[] = [...photos];

    for (let i = 0; i < SAMPLE_PHOTOS.length; i++) {
      const sample = SAMPLE_PHOTOS[i];
      setStatusMessage(`Loading high-res sample ${i + 1} of ${SAMPLE_PHOTOS.length}: ${sample.name}`);

      try {
        let originalBlob: Blob;
        try {
          const response = await fetch(sample.url);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          originalBlob = await response.blob();
        } catch {
          originalBlob = createSamplePlaceholderBlob(sample.name, i);
        }
        const photoId = 'photo_sample_' + Date.now() + '_' + i;

        const previewResult = await createDownsampledBlob(originalBlob, 1400, 0.88);
        const previewUrl = getObjectUrlForBlob(photoId + '_preview', previewResult.blob);

        const thumbResult = await createDownsampledBlob(originalBlob, 260, 0.8);
        const thumbnailUrl = getObjectUrlForBlob(photoId + '_thumb', thumbResult.blob);

        const stored: StoredPhoto = {
          id: photoId,
          albumId,
          name: sample.name,
          originalBlob,
          previewUrl,
          thumbnailUrl,
          width: previewResult.originalWidth,
          height: previewResult.originalHeight,
          mimeType: originalBlob.type || 'image/jpeg',
          fileSizeBytes: originalBlob.size,
          createdAt: Date.now() + i,
        };

        await savePhoto(stored);
        newPhotos.push(stored);
      } catch (err) {
        console.warn('Sample image load error:', err);
      }
    }

    setPhotos(newPhotos);
    onPhotosUpdated(newPhotos);
    setIsProcessing(false);
    setStatusMessage(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Step 2 of 3</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{albumName}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Select Photos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add photographs for your album. Original full-resolution camera files are preserved untouched.
          </p>
        </div>

        {/* Selected Counter & Navigation */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-mono font-bold text-slate-700 border border-slate-200">
            {photos.length} photos selected
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={onNext}
            disabled={photos.length === 0 || isProcessing}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl shadow-md transition ${
              photos.length === 0 || isProcessing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span>Next: Choose Layout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Upload Zone & Quick Sample Button */}
      <div className="space-y-4 mb-6">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-white text-blue-600 shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">
            Click to upload photos or drag and drop
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select 12, 24, 50, or 100+ high-resolution camera photos (JPEG, PNG, WEBP). Supports large files up to 50+ MP without losing quality.
          </p>
        </div>

        {/* Quick Sample Action */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Need sample images for instant testing?</span>
          </div>
          <button
            onClick={handleLoadSamplePhotos}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-300 shadow-2xs transition"
          >
            <span>+ Load 12 Curated Photos</span>
          </button>
        </div>
      </div>

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-blue-800 font-medium mb-6 animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <span>{statusMessage || 'Ingesting and generating three-tier preview caches...'}</span>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileImage className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No photos selected yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Please upload photos or load the sample collection above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>Selected Photos ({photos.length})</span>
            <span>Hover to preview details or remove</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-2xs"
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />

                {/* Index badge */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono rounded">
                  #{index + 1}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  title="Remove photo"
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-xs hover:bg-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Bottom title & dimensions */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-[10px] opacity-0 group-hover:opacity-100 transition">
                  <p className="truncate font-medium">{photo.name}</p>
                  <p className="text-slate-300 font-mono text-[9px]">
                    {photo.width} × {photo.height} px
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
