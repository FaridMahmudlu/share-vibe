# Share Vibe - Testing Guide

## Testing Strategy

Share Vibe uses **Vitest** for unit and integration testing with **React Testing Library** for component testing.

## Setup

### Installation

Test dependencies are included in `package.json`:
```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
src/tests/
├── setup.ts              # Global test configuration
├── example.test.ts       # Example test suite
├── upload.test.ts        # (TODO) Upload flow tests
├── auth.test.ts          # (TODO) Auth tests
├── gallery.test.ts       # (TODO) Gallery tests
└── firebase.test.ts      # (TODO) Firebase mocking
```

## Test Categories

### 1. Unit Tests
Test individual functions and utilities in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { logError } from '../utils/errorTracking';

describe('errorTracking', () => {
  it('should create error event with context', () => {
    const error = new Error('Test error');
    // Test implementation
  });
});
```

### 2. Component Tests
Test React components with mocked Firebase.

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import UploadComposer from '../components/UploadComposer';

describe('UploadComposer', () => {
  beforeEach(() => {
    // Setup mock data
  });

  it('should render file input', () => {
    render(<UploadComposer />);
    expect(screen.getByText(/Resim Seç/i)).toBeInTheDocument();
  });

  it('should validate caption length', async () => {
    render(<UploadComposer />);
    const input = screen.getByPlaceholderText(/Açıklaması/i);
    await userEvent.type(input, 'a'.repeat(300));
    expect(screen.getByText(/Çok uzun/i)).toBeInTheDocument();
  });
});
```

### 3. Integration Tests
Test data flow between components and Firebase.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useGalleryData } from '../hooks/useGalleryData';
import { renderHook, waitFor } from '@testing-library/react';

describe('useGalleryData', () => {
  it('should fetch media items on mount', async () => {
    const { result } = renderHook(() => useGalleryData('test-cafe'));
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.mediaItems.length).toBeGreaterThan(0);
  });
});
```

### 4. Snapshot Tests
Capture component output for regression detection.

```typescript
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BrandSignature from '../BrandSignature';

describe('BrandSignature', () => {
  it('should match snapshot', () => {
    const { container } = render(<BrandSignature />);
    expect(container).toMatchSnapshot();
  });
});
```

## Mocking Strategies

### Firebase Mocking

```typescript
// src/tests/setup.ts
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));
```

### Custom Mock Factory

```typescript
// src/tests/mocks.ts
export function createMockMediaItem(overrides = {}) {
  return {
    id: 'mock-id',
    url: 'https://example.com/image.jpg',
    caption: 'Mock caption',
    likesCount: 5,
    likedBy: ['user-1', 'user-2'],
    ...overrides,
  };
}
```

## Test Examples

### Test Upload Validation

```typescript
describe('Upload Validation', () => {
  it('should reject files over 8MB', () => {
    const largeFile = new File(['a'.repeat(10_000_000)], 'large.jpg');
    expect(validateUploadFile(largeFile)).toBe(false);
  });

  it('should reject images over 4096x4096', async () => {
    const largeDimImage = new File([], 'image.jpg');
    const isValid = await validateImageDimensions(largeDimImage);
    expect(isValid).toBe(false);
  });

  it('should accept valid images', () => {
    const validFile = new File(['image data'], 'image.jpg');
    expect(validateUploadFile(validFile)).toBe(true);
  });
});
```

### Test Auth Flow

```typescript
describe('Authentication Flow', () => {
  it('should redirect to admin panel after sign in', async () => {
    const { getByText } = render(<App />);
    
    // Mock successful Google sign-in
    vi.mocked(signInWithGoogle).mockResolvedValue(mockUser);
    
    const signInBtn = getByText(/Kafe Girişi/i);
    await userEvent.click(signInBtn);
    
    await waitFor(() => {
      expect(window.location.hash).toContain('admin');
    });
  });
});
```

### Test Gallery Like/Unlike

```typescript
describe('Gallery Like Toggle', () => {
  it('should toggle like state', async () => {
    const { getByRole } = render(<MediaItem item={mockItem} />);
    const likeBtn = getByRole('button', { name: /like/i });
    
    await userEvent.click(likeBtn);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        likedBy: arrayUnion(currentUser.uid)
      })
    );
  });

  it('should prevent duplicate likes', async () => {
    const itemWithLike = {
      ...mockItem,
      likedBy: [currentUser.uid]
    };
    
    const { getByRole } = render(<MediaItem item={itemWithLike} />);
    const likeBtn = getByRole('button', { name: /unlike/i });
    
    await userEvent.click(likeBtn);
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        likedBy: arrayRemove(currentUser.uid)
      })
    );
  });
});
```

## Coverage Goals

| Category | Goal | Current |
|----------|------|---------|
| Statements | 80% | 0% |
| Branches | 75% | 0% |
| Functions | 80% | 0% |
| Lines | 80% | 0% |

## Best Practices

1. **Descriptive Test Names**
   ```typescript
   // ❌ Bad
   it('works', () => {});

   // ✅ Good
   it('should toggle like when user clicks heart icon', () => {});
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should update media item', async () => {
     // Arrange
     const mockItem = createMockMediaItem();
     render(<MediaItem item={mockItem} />);

     // Act
     const button = screen.getByRole('button');
     await userEvent.click(button);

     // Assert
     expect(updateDoc).toHaveBeenCalled();
   });
   ```

3. **Test Behavior, Not Implementation**
   ```typescript
   // ❌ Tests implementation
   it('calls setLiked', () => {
     expect(setLiked).toHaveBeenCalled();
   });

   // ✅ Tests behavior
   it('shows unlike button after liking', () => {
     expect(screen.getByRole('button', { name: /unlike/i })).toBeInTheDocument();
   });
   ```

## CI/CD Integration

Add to GitHub Actions (`.github/workflows/test.yml`):

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run test:coverage
```

## Debugging Tests

```bash
# Run single test file
npm run test -- upload.test.ts

# Run tests matching pattern
npm run test -- --grep "upload"

# Debug mode (breakpoints in Chrome)
node --inspect-brk ./node_modules/vitest/vitest.mjs

# Watch mode for TDD
npm run test -- --watch
```
