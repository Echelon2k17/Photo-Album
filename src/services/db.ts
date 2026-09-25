import { Album, AlbumPage, StoredPhoto } from '../types/album';

const DB_NAME = 'LuminaAlbumStudioDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('albums')) {
        db.createObjectStore('albums', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('albumId', 'albumId', { unique: false });
      }
      if (!db.objectStoreNames.contains('pages')) {
        const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
        pageStore.createIndex('albumId', 'albumId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Convert File to detached in-memory Blob to guarantee OS file handle does not expire across browser restart
export async function fileToDetachedBlob(fileOrBlob: Blob): Promise<Blob> {
  try {
    const buffer = await fileOrBlob.arrayBuffer();
    return new Blob([buffer], { type: fileOrBlob.type || 'image/jpeg' });
  } catch (err) {
    console.warn('Failed to detach blob buffer, falling back to original:', err);
    return fileOrBlob;
  }
}

// Memory cache of generated Object URLs to avoid leaking or re-allocating
const objectUrlCache = new Map<string, string>();

export function toBlob(data: any, mimeType = 'image/jpeg'): Blob | null {
  if (!data) return null;
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data], { type: mimeType });
  if (ArrayBuffer.isView(data)) return new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  if (data.buffer instanceof ArrayBuffer) return new Blob([data.buffer], { type: mimeType });
  return null;
}

export function getObjectUrlForBlob(id: string, blobOrData: any, mimeType = 'image/jpeg'): string {
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }
  const blob = toBlob(blobOrData, mimeType);
  if (!blob) return '';
  try {
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(id, url);
    return url;
  } catch (err) {
    console.warn(`Failed to create object URL for ${id}:`, err);
    return '';
  }
}

export function revokeObjectUrl(id: string) {
  if (objectUrlCache.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlCache.get(id)!);
    } catch {}
    objectUrlCache.delete(id);
  }
}

// Helper to downsample a photo blob for Preview (~1400px) or Thumbnail (~260px)
// Produces BOTH an in-memory downsampled Blob AND a permanent Base64 Data URL
export async function createDownsampledBlob(
  originalBlob: Blob,
  maxDimension: number,
  quality = 0.88
): Promise<{
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}> {
  return new Promise((resolve) => {
    const blobToLoad = toBlob(originalBlob) || originalBlob;
    let url = '';
    try {
      url = URL.createObjectURL(blobToLoad);
    } catch {
      resolve({
        blob: originalBlob,
        dataUrl: '',
        width: 1200,
        height: 800,
        originalWidth: 1200,
        originalHeight: 800,
      });
      return;
    }

    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}

      const origW = img.naturalWidth || img.width || 1200;
      const origH = img.naturalHeight || img.height || 800;

      let targetW = origW;
      let targetH = origH;

      if (origW > maxDimension || origH > maxDimension) {
        if (origW >= origH) {
          targetW = maxDimension;
          targetH = Math.round((origH / origW) * maxDimension);
        } else {
          targetH = maxDimension;
          targetW = Math.round((origW / origH) * maxDimension);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          blob: originalBlob,
          dataUrl: '',
          width: origW,
          height: origH,
          originalWidth: origW,
          originalHeight: origH,
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const mimeType = 'image/jpeg';
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL(mimeType, quality);
      } catch (e) {
        console.warn('Canvas toDataURL failed:', e);
      }

      canvas.toBlob(
        (b) => {
          resolve({
            blob: b || originalBlob,
            dataUrl,
            width: targetW,
            height: targetH,
            originalWidth: origW,
            originalHeight: origH,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      resolve({
        blob: originalBlob,
        dataUrl: '',
        width: 1200,
        height: 800,
        originalWidth: 1200,
        originalHeight: 800,
      });
    };

    img.src = url;
  });
}

// Ensure loaded photos have active, valid URLs after browser reload
// If thumbnailUrl is a permanent Base64 Data URL, it is preserved indefinitely.
// If previewUrl is expired, it is re-minted from previewBlob or originalBlob.
export function ensurePhotoUrls(photo: StoredPhoto): StoredPhoto {
  if (!photo) return photo;

  const validOriginalBlob = toBlob(photo.originalBlob, photo.mimeType) || photo.originalBlob;
  const validPreviewBlob = toBlob(photo.previewBlob, photo.mimeType) || photo.previewBlob || validOriginalBlob;

  let thumbnailUrl = photo.thumbnailUrl;
  const isThumbDeadBlob = thumbnailUrl && thumbnailUrl.startsWith('blob:') && !objectUrlCache.has(photo.id + '_thumb');

  // If thumbnail is empty or a dead blob from a prior session, create an object URL
  if (!thumbnailUrl || isThumbDeadBlob) {
    if (validPreviewBlob || validOriginalBlob) {
      thumbnailUrl = getObjectUrlForBlob(photo.id + '_thumb', validPreviewBlob || validOriginalBlob, photo.mimeType);
    }
  }

  let previewUrl = photo.previewUrl;
  const isPreviewDeadBlob = previewUrl && previewUrl.startsWith('blob:') && !objectUrlCache.has(photo.id + '_preview');

  // If preview is empty or a dead blob from a prior session, generate a live object URL
  if (!previewUrl || isPreviewDeadBlob) {
    if (validPreviewBlob || validOriginalBlob) {
      previewUrl = getObjectUrlForBlob(photo.id + '_preview', validPreviewBlob || validOriginalBlob, photo.mimeType);
    }
  }

  // Graceful cross-fallbacks
  if (!previewUrl && thumbnailUrl) {
    previewUrl = thumbnailUrl;
  }
  if (!thumbnailUrl && previewUrl) {
    thumbnailUrl = previewUrl;
  }

  return {
    ...photo,
    originalBlob: validOriginalBlob,
    previewBlob: validPreviewBlob,
    previewUrl: previewUrl || '',
    thumbnailUrl: thumbnailUrl || '',
  };
}

// ---------------- ALBUMS ----------------
export async function getAllAlbums(): Promise<Album[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readonly');
    const store = tx.objectStore('albums');
    const req = store.getAll();
    req.onsuccess = () => {
      const albums = (req.result || []) as Album[];
      // sort by updatedAt desc
      albums.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(albums);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readonly');
    const store = tx.objectStore('albums');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Album) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAlbum(album: Album): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('albums', 'readwrite');
    const store = tx.objectStore('albums');
    const req = store.put(album);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['albums', 'photos', 'pages'], 'readwrite');
    tx.objectStore('albums').delete(albumId);

    // Delete associated photos
    const photoStore = tx.objectStore('photos');
    const photoIndex = photoStore.index('albumId');
    const photoReq = photoIndex.openKeyCursor(IDBKeyRange.only(albumId));
    photoReq.onsuccess = () => {
      const cursor = photoReq.result;
      if (cursor) {
        photoStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    // Delete associated pages
    const pageStore = tx.objectStore('pages');
    const pageIndex = pageStore.index('albumId');
    const pageReq = pageIndex.openKeyCursor(IDBKeyRange.only(albumId));
    pageReq.onsuccess = () => {
      const cursor = pageReq.result;
      if (cursor) {
        pageStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------- PHOTOS ----------------
export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const req = store.put(photo);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Background repair utility: if an existing photo is missing a permanent Base64 thumbnail or previewBlob,
// regenerate it seamlessly from originalBlob and persist it back to IndexedDB
async function repairPhotoIfNeeded(photo: StoredPhoto): Promise<void> {
  try {
    const isMissingBase64Thumb = !photo.thumbnailUrl || !photo.thumbnailUrl.startsWith('data:');
    const isMissingPreviewBlob = !photo.previewBlob;
    if (!isMissingBase64Thumb && !isMissingPreviewBlob) return;

    const sourceBlob = photo.previewBlob || photo.originalBlob;
    if (!sourceBlob) return;

    let updated = false;
    let thumbDataUrl = photo.thumbnailUrl;
    let previewBlob = photo.previewBlob;

    if (isMissingBase64Thumb) {
      const thumb = await createDownsampledBlob(sourceBlob, 260, 0.8);
      if (thumb.dataUrl) {
        thumbDataUrl = thumb.dataUrl;
        updated = true;
      }
    }

    if (isMissingPreviewBlob && photo.originalBlob) {
      const prev = await createDownsampledBlob(photo.originalBlob, 1400, 0.88);
      if (prev.blob) {
        previewBlob = prev.blob;
        updated = true;
      }
    }

    if (updated) {
      await savePhoto({
        ...photo,
        thumbnailUrl: thumbDataUrl,
        previewBlob: previewBlob,
      });
    }
  } catch (err) {
    // Non-blocking auto-repair
    console.debug('Background photo repair notice:', err);
  }
}

export async function getPhotosForAlbum(albumId: string): Promise<StoredPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const index = store.index('albumId');
    const req = index.getAll(IDBKeyRange.only(albumId));
    req.onsuccess = () => {
      const rawPhotos = (req.result || []) as StoredPhoto[];
      rawPhotos.sort((a, b) => a.createdAt - b.createdAt);
      const hydrated = rawPhotos.map(ensurePhotoUrls);

      // Trigger asynchronous background healing for any legacy photos with non-persistent URLs
      hydrated.forEach((p) => {
        if (!p.thumbnailUrl || !p.thumbnailUrl.startsWith('data:') || !p.previewBlob) {
          repairPhotoIfNeeded(p).catch(() => {});
        }
      });

      resolve(hydrated);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotoById(photoId: string): Promise<StoredPhoto | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const req = store.get(photoId);
    req.onsuccess = () => {
      const photo = (req.result as StoredPhoto) || null;
      if (!photo) {
        resolve(null);
        return;
      }
      const hydrated = ensurePhotoUrls(photo);
      if (!hydrated.thumbnailUrl || !hydrated.thumbnailUrl.startsWith('data:') || !hydrated.previewBlob) {
        repairPhotoIfNeeded(hydrated).catch(() => {});
      }
      resolve(hydrated);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(photoId: string): Promise<void> {
  const db = await getDB();
  revokeObjectUrl(photoId + '_preview');
  revokeObjectUrl(photoId + '_thumb');
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const req = store.delete(photoId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------- PAGES ----------------
export async function getPagesForAlbum(albumId: string): Promise<AlbumPage[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readonly');
    const store = tx.objectStore('pages');
    const index = store.index('albumId');
    const req = index.getAll(IDBKeyRange.only(albumId));
    req.onsuccess = () => {
      const pages = (req.result || []) as AlbumPage[];
      pages.sort((a, b) => a.pageNumber - b.pageNumber);
      resolve(pages);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function savePages(pages: AlbumPage[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readwrite');
    const store = tx.objectStore('pages');
    for (const page of pages) {
      store.put(page);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSinglePage(page: AlbumPage): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readwrite');
    const store = tx.objectStore('pages');
    const req = store.put(page);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSinglePage(pageId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pages', 'readwrite');
    const store = tx.objectStore('pages');
    const req = store.delete(pageId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
