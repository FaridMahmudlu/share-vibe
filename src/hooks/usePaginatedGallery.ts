import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, Query, DocumentData, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { logError, logWarning } from '../utils/errorTracking';

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reset: () => void;
  totalLoaded: number;
}

interface UsePaginatedGalleryOptions {
  pageSize?: number;
  cafeSlug?: string;
  enableAutoLoad?: boolean;
  onLoadMore?: (items: any[]) => void;
}

/**
 * Hook for paginated gallery data loading from Firestore
 * Uses cursor-based pagination for efficient loading
 * 
 * Example:
 * const { items, hasMore, loadMore, isLoading } = usePaginatedGallery({ pageSize: 50 });
 */
export function usePaginatedGallery(
  options: UsePaginatedGalleryOptions = {}
): PaginatedResult<any> {
  const {
    pageSize = 50,
    cafeSlug,
    enableAutoLoad = false,
    onLoadMore,
  } = options;

  const [items, setItems] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const lastDocRef = useRef<DocumentData | null>(null);
  const isFirstLoadRef = useRef(true);

  /**
   * Build Firestore query constraints
   */
  const buildQuery = useCallback((): { constraints: QueryConstraint[], collectionName: string } => {
    const constraints: QueryConstraint[] = [
      orderBy('uploadedAt', 'desc'),
      limit(pageSize + 1), // +1 to detect if there are more
    ];

    if (cafeSlug) {
      constraints.unshift(where('cafeSlug', '==', cafeSlug));
    }

    if (lastDocRef.current) {
      constraints.push(startAfter(lastDocRef.current));
    }

    return { constraints, collectionName: 'media' };
  }, [pageSize, cafeSlug]);

  /**
   * Load next page of media
   */
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const { constraints, collectionName } = buildQuery();
      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      // Extract documents
      const docs = snapshot.docs;
      const hasMoreDocs = docs.length > pageSize;
      const dataLimit = hasMoreDocs ? docs.length - 1 : docs.length;

      // Convert to items
      const newItems = docs.slice(0, dataLimit).map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Update state
      setItems((prev) => [...prev, ...newItems]);
      setTotalLoaded((prev) => prev + newItems.length);
      setHasMore(hasMoreDocs);

      // Update cursor for next page
      if (dataLimit > 0) {
        lastDocRef.current = docs[dataLimit - 1];
      }

      // Callback for custom handling
      onLoadMore?.(newItems);

      logWarning(`Loaded ${newItems.length} media items (total: ${totalLoaded + newItems.length})`, {
        action: 'pagination_load',
        additionalInfo: {
          pageSize,
          itemsLoaded: newItems.length,
          hasMore: hasMoreDocs,
          cafeSlug,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load media';
      setError(errorMsg);
      logError('Pagination load failed', err, {
        action: 'pagination_error',
        cafeSlug,
        additionalInfo: { pageSize },
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, buildQuery, pageSize, cafeSlug, onLoadMore, totalLoaded]);

  /**
   * Reset pagination
   */
  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    setTotalLoaded(0);
    lastDocRef.current = null;
    isFirstLoadRef.current = true;
  }, []);

  /**
   * Auto-load first page on mount
   */
  useEffect(() => {
    if (enableAutoLoad && isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      loadMore();
    }
  }, [enableAutoLoad, loadMore]);

  return {
    items,
    hasMore,
    isLoading,
    error,
    loadMore,
    reset,
    totalLoaded,
  };
}

/**
 * Alternative: Infinite scroll hook with intersection observer
 * Automatically loads more when user scrolls near bottom
 */
export function useInfiniteScroll(
  options: UsePaginatedGalleryOptions = {}
): PaginatedResult<any> & { sentryRef: React.RefObject<HTMLDivElement> } {
  const pagination = usePaginatedGallery({
    enableAutoLoad: true,
    ...options,
  });

  const sentryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry?.isIntersecting && pagination.hasMore && !pagination.isLoading) {
          pagination.loadMore().catch((err) => {
            logError('Intersection observer load failed', err, {
              action: 'intersection_error',
            });
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (sentryRef.current) {
      observer.observe(sentryRef.current);
    }

    return () => observer.disconnect();
  }, [pagination]);

  return { ...pagination, sentryRef };
}
