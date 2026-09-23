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

// Memory cache of generated Object URLs to avoid leaking or re-allocating
const objectUrlCache = new Map<string, string>();

export function getObjectUrlForBlob(id: string, blob: Blob): string {
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokeObjectUrl(id: string) {
  if (objectUrlCache.has(id)) {
    URL.revokeObjectURL(objectUrlCache.get(id)!);
    objectUrlCache.delete(id);
  }
}

// Helper to downsample a photo blob for Preview (~1400px) or Thumbnail (~260px)
export async function createDownsampledBlob(
  originalBlob: Blob,
  maxDimension: number,
  quality = 0.88
): Promise<{ blob: Blob; width: number; height: number; originalWidth: number; originalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(originalBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

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
        resolve({ blob: originalBlob, width: origW, height: origH, originalWidth: origW, originalHeight: origH });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (b) => {
          if (b) {
            resolve({ blob: b, width: targetW, height: targetH, originalWidth: origW, originalHeight: origH });
          } else {
            resolve({ blob: originalBlob, width: origW, height: origH, originalWidth: origW, originalHeight: origH });
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback safely to original blob to prevent unhandled rejection
      resolve({
        blob: originalBlob,
        width: 1200,
        height: 800,
        originalWidth: 1200,
        originalHeight: 800,
      });
    };

    img.src = url;
  });
}

// Ensure loaded photos have active, valid object URLs after browser reload
export function ensurePhotoUrls(photo: StoredPhoto): StoredPhoto {
  if (!photo) return photo;
  let previewUrl = photo.previewUrl;
  let thumbnailUrl = photo.thumbnailUrl;

  if (photo.originalBlob) {
    if (!previewUrl || (previewUrl.startsWith('blob:') && !objectUrlCache.has(photo.id + '_preview'))) {
      previewUrl = getObjectUrlForBlob(photo.id + '_preview', photo.originalBlob);
    }
    if (!thumbnailUrl || (thumbnailUrl.startsWith('blob:') && !objectUrlCache.has(photo.id + '_thumb'))) {
      thumbnailUrl = getObjectUrlForBlob(photo.id + '_thumb', photo.originalBlob);
    }
  }

  return {
    ...photo,
    previewUrl,
    thumbnailUrl,
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

export async function getPhotosForAlbum(albumId: string): Promise<StoredPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const index = store.index('albumId');
    const req = index.getAll(IDBKeyRange.only(albumId));
    req.onsuccess = () => {
      const photos = (req.result || []) as StoredPhoto[];
      photos.sort((a, b) => a.createdAt - b.createdAt);
      resolve(photos.map(ensurePhotoUrls));
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
      resolve(photo ? ensurePhotoUrls(photo) : null);
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
