const DB_NAME = 'kafe-ani-pending-actions';
const STORE_NAME = 'pending-actions';
const PENDING_UPLOAD_KEY = 'upload-after-google-auth';
const MAX_PENDING_UPLOAD_AGE_MS = 30 * 60 * 1000;

export type PendingUploadDraft = {
  file: File;
  caption: string;
  cafeSlug: string;
  tableNumber: string;
  editRotation: number;
  editBrightness: number;
  editContrast: number;
};

type PendingUploadRecord = {
  key: typeof PENDING_UPLOAD_KEY;
  caption: string;
  cafeSlug: string;
  tableNumber: string;
  editRotation: number;
  editBrightness: number;
  editContrast: number;
  fileBlob: Blob;
  fileName: string;
  fileType: string;
  createdAt: number;
};

const openPendingUploadDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Bekleyen yükleme veritabanı açılamadı.'));
  });

export const savePendingUpload = async (draft: PendingUploadDraft) => {
  const db = await openPendingUploadDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: PendingUploadRecord = {
      key: PENDING_UPLOAD_KEY,
      caption: draft.caption,
      cafeSlug: draft.cafeSlug,
      tableNumber: draft.tableNumber,
      editRotation: draft.editRotation,
      editBrightness: draft.editBrightness,
      editContrast: draft.editContrast,
      fileBlob: draft.file,
      fileName: draft.file.name,
      fileType: draft.file.type,
      createdAt: Date.now(),
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme kaydedilemedi.'));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme kaydı iptal edildi.'));
    };

    store.put(record);
  });
};

export const getPendingUpload = async (): Promise<PendingUploadDraft | null> => {
  const db = await openPendingUploadDb();

  const record = await new Promise<PendingUploadRecord | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(PENDING_UPLOAD_KEY);

    request.onsuccess = () => {
      resolve((request.result as PendingUploadRecord | undefined) ?? null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Bekleyen yükleme okunamadı.'));
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme okuma işlemi başarısız oldu.'));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme okuma işlemi iptal edildi.'));
    };
  });

  if (!record) {
    return null;
  }

  if (Date.now() - record.createdAt > MAX_PENDING_UPLOAD_AGE_MS) {
    await clearPendingUpload();
    return null;
  }

  const file =
    record.fileBlob instanceof File
      ? record.fileBlob
      : new File([record.fileBlob], record.fileName, { type: record.fileType });

  return {
    file,
    caption: record.caption,
    cafeSlug: record.cafeSlug,
    tableNumber: record.tableNumber,
    editRotation: record.editRotation,
    editBrightness: record.editBrightness,
    editContrast: record.editContrast,
  };
};

export const clearPendingUpload = async () => {
  const db = await openPendingUploadDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme temizlenemedi.'));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Bekleyen yükleme temizleme işlemi iptal edildi.'));
    };

    store.delete(PENDING_UPLOAD_KEY);
  });
};
