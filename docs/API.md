# Share Vibe - API & Data Schema

## Firestore Collections

### `media` Collection
Stores uploaded photos and gallery items.

```typescript
{
  id: string;              // Document ID (auto-generated)
  url: string;             // Firebase Storage download URL
  type: 'image';           // Media type
  caption: string;         // User-provided caption (max 280 chars)
  likesCount: number;      // Total likes count
  likedBy: string[];       // Array of UIDs who liked (max 10k items)
  rotation: number;        // Image rotation degrees (0-360)
  brightness: number;      // Image brightness adjustment (0-200, default 100)
  contrast: number;        // Image contrast adjustment (0-200, default 100)
  date: string;            // Date when uploaded (ISO string)
  tableNumber: string;     // Table/stand identifier
  cafeSlug: string;        // Café identifier (foreign key to cafes)
  authorUid: string;       // Firebase Auth UID of uploader
  authorEmail?: string;    // Email of uploader (optional)
  createdAt: Timestamp;    // Server timestamp
  updatedAt: Timestamp;    // Last update timestamp
}
```

**Indexes Needed:**
- `cafeSlug`, `createdAt` (descending)
- `cafeSlug`, `likesCount` (descending)

**Security Rules:**
- Public read access
- Write restricted to authenticated users
- Like toggle restricted to likers
- Delete restricted to author or admin

### `cafes` Collection
Café/business configurations.

```typescript
{
  slug: string;            // Unique identifier (cafeName lowercased)
  cafeName: string;        // Display name
  accentColor: string;     // Hex color (#d48f6b)
  campaignTarget: number;  // Photo count target for rewards
  campaignReward: string;  // Reward description
  demoTable: string;       // Demo table number
  handwritingFont: string; // Font name for captions
  ownerEmail: string;      // Owner's email (access control)
  createdAt: Timestamp;    // Creation date
  updatedAt: Timestamp;    // Last update
}
```

**Security Rules:**
- Public read access (all fields)
- Write restricted to owner (verified by email)
- Only owner can update

### `users` Collection (Optional)
User profiles and preferences.

```typescript
{
  uid: string;             // Firebase Auth UID
  email: string;           // User email
  uploadCount: number;     // Total uploads
  likeCount: number;       // Total likes given
  weeklyUploadCount: number; // This week's uploads
  lastUploadDate: Timestamp; // Last upload date
  isAdmin: boolean;        // Admin status
  createdAt: Timestamp;    // Join date
}
```

**Security Rules:**
- Users can only read/write their own data
- Admin can read all users

## Data Types & Constraints

### MediaItem
```typescript
type MediaItem = {
  id: string;
  url: string;
  type: 'image';
  caption: string;         // 1-280 chars
  likesCount: number;      // >= 0
  likedBy: string[];       // Max 10,000 items (anti-pattern alert!)
  rotation: number;        // 0-360
  brightness: number;      // 0-200
  contrast: number;        // 0-200
  date: string;            // ISO 8601
  tableNumber: string;     // Non-empty
  cafeSlug: string;        // Non-empty
  authorUid: string;       // Firebase UID format
  createdAt: any;          // Firestore Timestamp or Date
};
```

### UploadDraft
```typescript
type UploadDraft = {
  file: File;
  caption: string;
  rotation: number;
  brightness: number;
  contrast: number;
  tableNumber: string;
  cafeSlug: string;
};
```

## Upload Limits

- **Weekly Limit:** 2 uploads per user per café (enforced by Firestore rules)
- **File Size:** Max 8MB per image
- **Image Dimensions:** Max 4096x4096 pixels
- **Caption Length:** 1-280 characters

## Error Responses

All Firebase errors are logged with context:

```typescript
{
  timestamp: ISO string;
  component: string;
  action: string;
  error: Error message;
  stack: Error stack trace;
  severity: 'error' | 'warning' | 'info';
}
```

Common errors:
- `PERMISSION_DENIED` - User lacks permissions
- `RESOURCE_EXHAUSTED` - Upload limit reached
- `INVALID_ARGUMENT` - Invalid data format
- `NOT_FOUND` - Document not found
- `ALREADY_EXISTS` - Duplicate entry

## Rate Limiting

- Upload API: 2 per week per user per café (Firestore rules)
- Like API: 1 per media item per user (Firestore rules)
- Queries: Max 100 items per café (client-side limit)

## Real-Time Updates

All media queries use Firestore real-time listeners (`onSnapshot`):

```typescript
const unsubscribe = onSnapshot(
  query(
    collection(db, 'media'),
    where('cafeSlug', '==', cafeSlug),
    orderBy('createdAt', 'desc'),
    limit(100)
  ),
  (snapshot) => {
    // Handle media items
  },
  (error) => {
    // Handle error
  }
);

// Cleanup
return () => unsubscribe();
```
