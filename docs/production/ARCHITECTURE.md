# Share Vibe - Architecture & Design

## System Overview

Share Vibe is a React-based photo gallery and café engagement platform. Users upload photos at physical QR stands, and the gallery displays them in real-time.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Share Vibe Frontend (React)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │   Landing Page   │         │   Gallery View   │            │
│  │   (MainPage)     │         │   (App)          │            │
│  └──────────────────┘         └──────────────────┘            │
│          │                             │                       │
│          │        ┌────────────────────┤                       │
│          │        │                    │                       │
│  ┌───────▼────────▼──────┐      ┌──────▼──────────┐           │
│  │   Auth Module         │      │  Upload Module  │           │
│  │ (googleAuth.ts)       │      │ (mediaStorage)  │           │
│  └───────┬────────────────┘      └──────┬──────────┘           │
│          │                             │                       │
│          │        ┌────────────────────┤                       │
│          │        │                    │                       │
│  ┌───────▼────────▼──────────────────────────┐                │
│  │      Firebase Services Layer             │                │
│  │  • Firebase Auth (Google OAuth)          │                │
│  │  • Firestore (Database)                  │                │
│  │  • Storage (Photo Files)                 │                │
│  └──────────────────────────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App (root)
├── AnimatedBackground (memoized)
├── MainPage (landing page)
│   ├── Hero Section
│   ├── Stats Bar
│   ├── How-It-Works Steps
│   ├── Features/Bento
│   ├── Testimonials
│   ├── Stand Options
│   ├── Pricing
│   └── CTA Banner
├── Gallery View (conditionally rendered)
│   ├── MediaGrid
│   ├── UploadComposer
│   └── MediaItem
├── AdminPanel (lazy loaded)
│   └── OwnerPortal
├── BrandSignature (reused)
└── BrokenMediaPlaceholder (memoized)
```

## State Management

Currently uses React hooks with local component state. For scaling, consider implementing:

```typescript
// Proposed: Context API structure
const CafeContext = React.createContext({
  activeCafeSlug: '',
  cafeName: '',
  accentColor: '',
  campaignTarget: 0,
  // ...
});

// App structure after refactor:
<CafeContext.Provider value={cafeContextValue}>
  <GalleryView />
</CafeContext.Provider>
```

**Current State Variables in App.tsx (~40):**
- Auth state (3 vars)
- Café config (6 vars)
- Gallery data (4 vars)
- Upload form (8 vars)
- UI state (15 vars)
- Modal states (4 vars)

**Recommendation:** Extract to custom hooks (useUploadComposer, useGalleryData, useAuthFlow).

## Data Flow

### Upload Flow

```
User selects image
        ↓
Image validation (size, dimensions)
        ↓
User edits (rotation, brightness, contrast)
        ↓
Add caption + metadata
        ↓
Check weekly upload limit
        ↓
Upload to Firebase Storage
        ↓
Create media document in Firestore
        ↓
Clear local draft / show success
```

### Gallery Display Flow

```
App mounts or café slug changes
        ↓
Setup Firestore real-time listener (onSnapshot)
        ↓
Query: media where cafeSlug == selected, limit 100
        ↓
Sort by createdAt descending
        ↓
Render MediaGrid with items
        ↓
Listen for real-time updates
        ↓
On unmount: cleanup listener
```

### Like/Unlike Flow

```
User clicks heart icon
        ↓
Check if already liked
        ↓
If liked: remove UID from likedBy array
        ↓
If not liked: add UID to likedBy array
        ↓
Update likesCount
        ↓
Firestore arrayRemove/arrayUnion (atomic)
        ↓
Component re-renders with new state
```

## Authentication Flow

```
User clicks "Kafe Girişi"
        ↓
signInWithGoogle() called
        ↓
Firebase Google OAuth popup/redirect
        ↓
User authenticates with Google
        ↓
Firebase Auth returns user object
        ↓
Get ID token for authorization
        ↓
Check Firestore for owner/admin status
        ↓
Route to appropriate view (gallery/admin/owner)
```

## Performance Optimizations

### Current Implementations

1. **Memoization**
   - `React.memo` on expensive components (AnimatedBackground, BrokenMediaPlaceholder)
   - `useCallback` for event handlers
   - `useMemo` for derived state

2. **Code Splitting**
   - Vite vendor bundles (react, firebase, motion, icons)
   - Lazy load AdminPanel component

3. **Query Optimization**
   - Firestore limit(100) on media queries
   - Single real-time listener per café
   - No N+1 queries

4. **CSS Optimization**
   - CSS containment on images
   - GPU acceleration (will-change, transform)
   - Lazy loading images

### Potential Improvements

1. **Virtual Scrolling** - If gallery > 500 items, use react-window
2. **Image Optimization** - Server-side WebP, srcset
3. **Pagination** - Load 100 items, then paginate on scroll
4. **Caching** - IndexedDB for offline media
5. **Compression** - Client-side image compression before upload

## Security Model

### Authentication
- Firebase Auth with Google OAuth provider
- Email-based role system (currently hardcoded, should migrate to Custom Claims)
- Session persistence via Firebase

### Authorization
- Firestore security rules enforce permissions
- User UID validated against likes
- Owner email checked for admin access
- Upload limits enforced by rules

### Data Protection
- HTTPS for all API calls
- Firebase Storage default rules (private until configured)
- No sensitive data in localStorage (IndexedDB for drafts only)

## Error Handling Strategy

```typescript
Try-catch blocks with context logging:

try {
  await uploadFile(...);
} catch (error) {
  logError('Upload failed', error, {
    component: 'UploadComposer',
    action: 'media_upload',
    cafeSlug: activeCafeSlug,
  });
  setError('Yükleme başarısız oldu');
}
```

All errors logged to console in dev, sent to error tracking service in production.

## Future Roadmap

### Q1
- [ ] Migrate email auth to Custom Claims
- [ ] Implement React Context state management
- [ ] Add comprehensive test suite
- [ ] Integrate Sentry error tracking

### Q2
- [ ] Analytics dashboard for admin
- [ ] Email notifications for likes
- [ ] Image compression + WebP
- [ ] Multi-language support

### Q3
- [ ] Offline support (PWA/Service Workers)
- [ ] Advanced admin filters
- [ ] Content moderation system
- [ ] User reputation system

### Q4
- [ ] Social media integration
- [ ] Advanced analytics reports
- [ ] API rate limiting
- [ ] Disaster recovery automation
