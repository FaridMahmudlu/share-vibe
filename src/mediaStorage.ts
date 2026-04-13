import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from './firebase';

const extractStoragePath = (downloadUrl: string) => {
  const url = new URL(downloadUrl);
  const encodedPath = url.pathname.split('/o/')[1];

  if (!encodedPath) {
    return null;
  }

  return decodeURIComponent(encodedPath);
};

export const deleteStorageAsset = async (downloadUrl: string) => {
  const path = extractStoragePath(downloadUrl);

  if (!path) {
    return;
  }

  await deleteObject(ref(storage, path));
};

export const deleteMediaRecord = async (id: string, downloadUrl?: string) => {
  if (downloadUrl) {
    try {
      await deleteStorageAsset(downloadUrl);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  }

  await deleteDoc(doc(db, 'media', id));
};
