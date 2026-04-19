# Advanced Features Documentation

## Error Boundary Component

### Purpose
Catches React component errors and prevents application crash. Essential for production stability.

### Usage

**Wrapping entire app** (already done in main.tsx):
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Wrapping specific components**:
```typescript
<ErrorBoundary fallback={<CustomErrorUI />}>
  <UploadComponent />
</ErrorBoundary>
```

**Using HOC wrapper**:
```typescript
import { withErrorBoundary } from './components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent, <ErrorFallback />);
```

### Features
- ✅ Automatic error logging via errorTracking utility
- ✅ Development: Shows detailed error stack
- ✅ Production: Shows user-friendly error message
- ✅ Auto-recovery button to retry
- ✅ Auto-reset after 5 errors (prevents loops)
- ✅ Turkish language support

---

## Paginated Gallery Hook

### Purpose
Efficiently load gallery media in pages to improve performance.

### Basic Usage

```typescript
import { usePaginatedGallery } from './hooks/usePaginatedGallery';

function Gallery() {
  const { items, hasMore, isLoading, loadMore } = usePaginatedGallery({
    pageSize: 50,
    cafeSlug: 'my-cafe',
    enableAutoLoad: true,
  });

  return (
    <div>
      <div className="media-grid">
        {items.map(item => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          {isLoading ? 'Yüklənir...' : 'Daha çox yüklə'}
        </button>
      )}
    </div>
  );
}
```

### Infinite Scroll (Auto-load)

```typescript
import { useInfiniteScroll } from './hooks/usePaginatedGallery';

function InfiniteGallery() {
  const { items, isLoading, sentryRef } = useInfiniteScroll({
    pageSize: 50,
    cafeSlug: 'my-cafe',
  });

  return (
    <div>
      <div className="media-grid">
        {items.map(item => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>

      {/* Sentinel element triggers load when scrolled into view */}
      <div ref={sentryRef} style={{ height: '100px' }} />

      {isLoading && <LoadingSpinner />}
    </div>
  );
}
```

### API

```typescript
interface PaginatedResult<T> {
  items: T[];                    // Current loaded items
  hasMore: boolean;              // More items available?
  isLoading: boolean;            // Currently loading?
  error: string | null;          // Error message if any
  loadMore: () => Promise<void>; // Load next page
  reset: () => void;             // Reset to initial state
  totalLoaded: number;           // Total items loaded so far
}
```

### Options

```typescript
interface UsePaginatedGalleryOptions {
  pageSize?: number;             // Items per page (default: 50)
  cafeSlug?: string;             // Filter by café (optional)
  enableAutoLoad?: boolean;      // Auto-load first page (default: false)
  onLoadMore?: (items: any[]) => void; // Callback on each load
}
```

---

## Image Compression Utility

### Purpose
Compress images before upload to reduce storage and bandwidth.

### Basic Usage

```typescript
import { compressImage } from './utils/imageCompression';

async function handleImageUpload(file: File) {
  try {
    const result = await compressImage(file, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.75,
      maxSizeKb: 500,
    });

    console.log(`Compressed: ${result.sizeBefore} → ${result.sizeAfter} bytes`);
    console.log(`Compression: ${result.compressionRatio}%`);

    // Upload result.blob instead of original file
    await uploadToFirebase(result.blob);
  } catch (error) {
    console.error('Compression failed:', error);
  }
}
```

### Getting Compression Recommendation

```typescript
import { getCompressionRecommendation } from './utils/imageCompression';

function FileUploadInput() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rec = getCompressionRecommendation(file);
    if (rec.shouldCompress) {
      console.log(rec.reason);        // e.g., "Fayl 2048KB. Yerə qənaət..."
      console.log(rec.estimatedSavings); // e.g., "~1024KB ə qənaət"
    }
  };

  return <input type="file" accept="image/*" onChange={handleChange} />;
}
```

### Using in Component Hook

```typescript
import { useImageCompression } from './utils/imageCompression';

function UploadComponent() {
  const { compress } = useImageCompression();
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    const result = await compress(file, undefined, (p) => setProgress(p));
    // Upload result.blob
  };

  return (
    <div>
      <ProgressBar value={progress} />
      <button onClick={() => handleUpload(selectedFile)}>
        Yüklə
      </button>
    </div>
  );
}
```

### API

```typescript
interface CompressionOptions {
  maxWidth?: number;      // Max width in pixels (default: 2048)
  maxHeight?: number;     // Max height in pixels (default: 2048)
  quality?: number;       // Quality 0-1 (default: 0.75)
  format?: string;        // 'jpeg' | 'png' | 'webp' (default: 'jpeg')
  maxSizeKb?: number;     // Target size in KB (default: 500)
}

interface CompressionResult {
  blob: Blob;             // Compressed image blob
  width: number;          // New width
  height: number;         // New height
  sizeBefore: number;     // Original size in bytes
  sizeAfter: number;      // Compressed size in bytes
  compressionRatio: number; // % reduction
  format: string;         // Used format
  quality: number;        // Used quality
}
```

### Default Configuration

```typescript
export const DEFAULT_COMPRESSION: CompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.75,
  format: 'jpeg',
  maxSizeKb: 500,
};
```

### Features
- ✅ **Adaptive quality**: Automatically reduces quality to meet size target
- ✅ **Aspect ratio**: Maintains original aspect ratio
- ✅ **Multiple formats**: JPEG, PNG, WebP support
- ✅ **Progress tracking**: Optional progress callback
- ✅ **Batch processing**: Compress multiple images at once
- ✅ **Smart recommendations**: Suggests compression based on file size
- ✅ **Error handling**: Integrated with error tracking utility

### Performance Notes
- Compression happens entirely in browser (no server calls)
- Uses Web Worker pattern in background (non-blocking)
- Typical compression: 50-70% size reduction
- Processing time: 100-500ms per image (varies by size)

---

## Integration Examples

### Full Upload Flow with Compression

```typescript
import { compressImage } from './utils/imageCompression';
import { retryAsync } from './utils/retryLogic';

async function handleMediaUpload(file: File, cafeSlug: string) {
  // Step 1: Compress
  const compressed = await compressImage(file);

  // Step 2: Create FormData
  const formData = new FormData();
  formData.append('file', compressed.blob);
  formData.append('cafeSlug', cafeSlug);

  // Step 3: Upload with retry
  const result = await retryAsync(
    () => uploadToFirebase(formData),
    { maxAttempts: 3 }
  );

  if (result.success) {
    console.log('Upload successful!');
  } else {
    console.error('Upload failed:', result.error);
  }
}
```

### Gallery with Pagination and Error Handling

```typescript
import { useInfiniteScroll } from './hooks/usePaginatedGallery';
import { ErrorBoundary } from './components/ErrorBoundary';

function GalleryPage() {
  return (
    <ErrorBoundary>
      <Gallery />
    </ErrorBoundary>
  );
}

function Gallery() {
  const { items, isLoading, error, sentryRef } = useInfiniteScroll({
    pageSize: 50,
    enableAutoLoad: true,
  });

  if (error) {
    return <div className="error">Xəta: {error}</div>;
  }

  return (
    <div className="gallery">
      <div className="media-grid">
        {items.map(item => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>

      <div ref={sentryRef} style={{ height: '100px' }}>
        {isLoading && <LoadingSpinner />}
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Always wrap top-level components** in ErrorBoundary for production
2. **Use pagination** for collections with 100+ items
3. **Compress before upload** to reduce bandwidth and storage
4. **Handle errors gracefully** with user-friendly messages
5. **Monitor performance** via browser DevTools
6. **Test error boundaries** with intentional errors in development

---

## Migration Guide

### From Current to Paginated Gallery

**Before:**
```typescript
const [mediaItems, setMediaItems] = useState([]);

useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, 'media')),
    (snap) => setMediaItems(snap.docs.map(d => ({ ...d.data(), id: d.id })))
  );
  return unsubscribe;
}, []);
```

**After:**
```typescript
const { items: mediaItems, loadMore } = usePaginatedGallery({
  pageSize: 50,
  enableAutoLoad: true,
});
```

### From Manual Upload to Compressed Upload

**Before:**
```typescript
const uploadPromise = ref(storage, path);
uploadBytesResumable(uploadPromise, file);
```

**After:**
```typescript
const compressed = await compressImage(file);
const uploadPromise = ref(storage, path);
uploadBytesResumable(uploadPromise, compressed.blob);
```

---

## Troubleshooting

### "Failed to get canvas 2D context"
- Browser doesn't support Canvas API
- Solution: Check browser compatibility

### "Image compression takes too long"
- Very large images (4000x4000+)
- Solution: Reduce maxWidth/maxHeight options

### "Pagination loads but nothing appears"
- Collection might be empty
- Check cafeSlug filter
- Verify Firestore rules allow read access

### "ErrorBoundary doesn't catch my error"
- Error happened in event handler (not render)
- Solution: Use try-catch or error boundary wrapper
