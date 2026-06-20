import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase/client';

type CachedUrl = {
  signedUrl: string;
  expiresAt: number;
};

// Global in-memory cache for signed URLs to optimize and prevent redundant calls
const signedUrlCache: Record<string, CachedUrl> = {};

export async function getSignedPhotoUrl(photoId: string): Promise<string> {
  const cached = signedUrlCache[photoId];
  if (cached && Date.now() < cached.expiresAt - 10 * 60 * 1000) {
    return cached.signedUrl;
  }

  const getPhotoUrlFn = httpsCallable<{ photoId: string }, { signedUrl: string }>(functions, 'getPhotoUrl');
  const result = await getPhotoUrlFn({ photoId });
  if (!result.data?.signedUrl) {
    throw new Error('Fotoğraf bağlantısı alınamadı.');
  }

  signedUrlCache[photoId] = {
    signedUrl: result.data.signedUrl,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };

  return result.data.signedUrl;
}

/**
 * [NV-03] Custom Hook to retrieve, cache, and auto-refresh signed storage URLs
 * Refreshes the URL 10 minutes before the 1-hour signed URL expiration (at 50 minutes).
 */
export function useSignedPhotoUrl(photoId: string, initialFallbackUrl: string) {
  const [url, setUrl] = useState<string>(() => {
    const cached = signedUrlCache[photoId];
    // Check if cache exists and has more than 10 minutes left
    if (cached && Date.now() < cached.expiresAt - 10 * 60 * 1000) {
      return cached.signedUrl;
    }
    return initialFallbackUrl;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const fetchSignedUrl = async () => {
      const cached = signedUrlCache[photoId];
      if (cached && Date.now() < cached.expiresAt - 10 * 60 * 1000) {
        if (active) setUrl(cached.signedUrl);
        return;
      }

      setLoading(true);
      try {
        const signedUrl = await getSignedPhotoUrl(photoId);
        if (active) {
          setUrl(signedUrl);
        }
      } catch (err: any) {
        console.error(`Error fetching signed URL for ${photoId}:`, err);
        if (active) {
          setError(err as Error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSignedUrl();

    // Refresh check interval every 5 minutes
    const interval = setInterval(fetchSignedUrl, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [photoId]);

  return { url, loading, error };
}

/**
 * [NV-03] Invalidation mechanism to purge cached URLs when a photo is deleted
 */
export function invalidateSignedPhotoUrlCache(photoId: string) {
  delete signedUrlCache[photoId];
}
