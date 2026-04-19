# Contributing to Share Vibe

## 🎯 Code Standards

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.json)
- No `any` types without justification
- Use interfaces for object types
- Export types alongside implementations

```typescript
// ✅ Good
export interface MediaItem {
  id: string;
  caption: string;
}

export function createMediaItem(caption: string): MediaItem {
  return { id: crypto.randomUUID(), caption };
}

// ❌ Avoid
export function createMediaItem(caption: any): any {
  return { id: crypto.randomUUID(), caption };
}
```

### React/Components
- Use functional components with hooks
- Memoize expensive components
- Use `useCallback` for event handlers
- Clear prop names and types

```typescript
// ✅ Good
interface ImageProps {
  src: string;
  alt: string;
  onLoad?: () => void;
}

const Image = memo(({ src, alt, onLoad }: ImageProps) => (
  <img src={src} alt={alt} onLoad={onLoad} loading="lazy" />
));

// ❌ Avoid
const Image = ({ src, alt, onLoad, ...rest }: any) => (
  <img src={src} alt={alt} onLoad={onLoad} {...rest} />
);
```

### CSS/Styling
- Use Tailwind utility classes for common styles
- BEM naming for custom CSS classes
- Responsive mobile-first approach
- Document color variables

```css
/* ✅ Good */
.mp-stand-card {
  /* Base mobile styles */
}

@media (min-width: 641px) {
  .mp-stand-card {
    /* Tablet+ styles */
  }
}

/* ❌ Avoid */
.stand-card { /* Unclear scope */
  /* Desktop-first, no mobile consideration */
}
```

## 📝 Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UploadComposer.tsx` |
| Hooks | camelCase, prefix `use` | `useUploadComposer.ts` |
| Types | PascalCase | `interface MediaItem` |
| Constants | UPPER_CASE | `MAX_UPLOAD_SIZE = 8MB` |
| CSS Classes | `.prefix-name-state` | `.mp-btn-primary` |
| Variables | camelCase | `mediaItems`, `selectedFile` |

## 🚀 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

Use descriptive names:
- `feature/add-image-filters`
- `fix/upload-validation`
- `docs/api-schema`
- `refactor/extract-upload-hook`

### 2. Make Changes

- Keep commits small and focused
- One feature per branch
- Write tests for new functionality
- Update documentation

```bash
git add src/
git commit -m "feat: add image rotation slider

- Add rotation state to useUploadComposer
- Add visual feedback for rotation
- Add CSS transforms for preview"
```

### 3. Validate Before Commit

```bash
# Type check
npm run lint

# Format code
# (prettier or similar - not yet configured)

# Run tests
npm run test

# Build to catch errors
npm run build
```

### 4. Submit Pull Request

- Write clear PR description
- Reference related issues
- Include before/after screenshots for UI changes
- Link to documentation if applicable

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor

## Related Issues
Fixes #123

## Changes
- Change 1
- Change 2

## Screenshots (if UI changes)
[Screenshot/GIF]

## Testing
- [ ] Unit tests added
- [ ] Manual testing done
- [ ] No breaking changes
```

## 🧪 Testing Requirements

### New Feature
1. Write unit tests for utility functions
2. Write component tests if UI changes
3. Integration test for complex flows
4. Minimum 80% coverage for new code

```bash
npm run test -- --coverage
```

### Bug Fix
1. Write test that reproduces the bug
2. Fix the bug (test should pass)
3. Ensure no regression (all tests pass)

## 📚 Documentation Requirements

Update these files when relevant:

- **SETUP.md** - New dependencies or setup steps
- **API.md** - New Firestore collections or fields
- **ARCHITECTURE.md** - New architectural patterns
- **TESTING.md** - New testing patterns
- **Code comments** - Complex logic requiring explanation

```typescript
/**
 * Calculates campaign progress for reward celebration
 * Returns the position in current campaign cycle
 * 
 * @example
 * getCampaignProgressCount(25, 20) // 5 (25 % 20)
 * getCampaignProgressCount(20, 20) // 20 (celebration threshold)
 */
export function getCampaignProgressCount(
  totalUploads: number,
  campaignTarget: number
): number {
  const remainder = totalUploads % campaignTarget;
  return remainder === 0 ? campaignTarget : remainder;
}
```

## 🐛 Reporting Issues

Use GitHub Issues with clear templates:

### Bug Report
```markdown
## Describe the bug
Clear description of what's broken

## Steps to reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected behavior
What should happen

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920x1080

## Screenshots
[If applicable]
```

### Feature Request
```markdown
## Description
What feature and why it's needed

## Motivation
Why this would be useful

## Suggested implementation
How it could be built (optional)
```

## 🔍 Code Review Checklist

Before requesting review, ensure:

- [ ] Code follows style guide
- [ ] No console.log() or debug code
- [ ] No hardcoded values (use constants)
- [ ] Error handling implemented
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Commits are squashed/organized
- [ ] PR description is clear

## 📖 Commit Message Guide

Format: `<type>: <subject>`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting, missing semicolons, etc.)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build, dependencies, tooling

```bash
# ✅ Good
git commit -m "feat: add image brightness slider"
git commit -m "fix: prevent duplicate likes on refresh"
git commit -m "docs: update API schema for media items"

# ❌ Avoid
git commit -m "update stuff"
git commit -m "WIP"
git commit -m "asdf"
```

## 🚫 What NOT to Do

1. **Don't commit secrets** - No API keys, tokens, passwords
2. **Don't modify unrelated code** - Keep commits focused
3. **Don't break existing tests** - All tests must pass
4. **Don't ignore TypeScript errors** - Fix them or justify `@ts-ignore`
5. **Don't hardcode values** - Use constants/env vars
6. **Don't skip error handling** - All async operations need try-catch
7. **Don't commit `node_modules`** - Always in `.gitignore`

## 🎓 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Docs](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Vitest Docs](https://vitest.dev/)

## ❓ Questions?

- Check existing issues/discussions
- Ask in PR comments
- Reach out to maintainers
