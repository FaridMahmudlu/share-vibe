import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { logError } from '../utils/errorTracking';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image';
  caption: string;
  likesCount: number;
  likedBy: string[];
  rotation: number;
  date: string;
  tableNumber: string;
  cafeSlug: string;
  authorUid: string;
  createdAt: any;
}

/**
 * Custom hook for fetching and managing gallery media data
 * Handles real-time Firestore listener setup and cleanup
 */
export function useGalleryData(cafeSlug: string) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mediaItemsById = new Map(mediaItems.map(item => [item.id, item]));

  useEffect(() => {
    if (!cafeSlug) {
      setMediaItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'media'),
        where('cafeSlug', '==', cafeSlug),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: MediaItem[] = [];
          snapshot.forEach((doc) => {
            items.push({
              id: doc.id,
              ...doc.data(),
            } as MediaItem);
          });
          setMediaItems(items);
          setIsLoading(false);
        },
        (err) => {
          const message = err instanceof Error ? err.message : 'Failed to fetch gallery data';
          setError(message);
          logError('Gallery data fetch failed', err, { 
            action: 'fetch_gallery',
            cafeSlug,
          });
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gallery setup failed';
      setError(message);
      logError('Gallery setup error', err, { 
        action: 'gallery_setup',
        cafeSlug,
      });
      setIsLoading(false);
    }
  }, [cafeSlug]);

  return {
    mediaItems,
    mediaItemsById,
    isLoading,
    error,
  };
}
