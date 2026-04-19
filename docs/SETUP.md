# Share Vibe - Setup & Development Guide

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Share\ Vibe

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Fill in your Firebase credentials
```

### Development

```bash
# Start dev server
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint TypeScript
npm run lint

# Build for production
npm run build
```

## 🔑 Environment Variables

Create `.env.local` file with:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=1:your_app_id:web:your_web_app_id

# Optional
VITE_ENV=development
VITE_ENABLE_ERROR_TRACKING=false
```

## 📁 Project Structure

```
Share Vibe/
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── tests/            # Test files
│   ├── App.tsx           # Main app component
│   ├── firebase.ts       # Firebase config
│   └── index.css         # Global styles
├── docs/                 # Documentation
├── scripts/              # Build scripts
├── vite.config.ts        # Vite configuration
├── vitest.config.ts      # Test configuration
├── tsconfig.json         # TypeScript config
└── package.json          # Dependencies
```

## 🚀 Deployment

### Firebase Hosting

```bash
# Deploy hosting only
npm run deploy:hosting

# Deploy Firestore rules
npm run deploy:rules

# Deploy everything (prod)
npm run build
npm run deploy:prod
```

## 📖 Documentation

- [API Schema](./API.md) - Firestore collections and fields
- [Architecture](./ARCHITECTURE.md) - System design and data flow
- [Testing](./TESTING.md) - Testing strategies and examples
- [Deployment](./DEPLOYMENT.md) - Production deployment guide

## 🐛 Troubleshooting

### Build Issues
- Clear `node_modules` and `dist`: `npm run clean && npm install`
- Check Node version: `node --version` (should be 18+)

### Firebase Issues
- Verify environment variables are set correctly
- Check Firebase project permissions
- Ensure Firestore is enabled in Firebase console

### Test Issues
- Clear vitest cache: `npm run test -- --clearCache`
- Ensure all mocks are properly configured in `src/tests/setup.ts`

## 📝 Contributing

Please follow these guidelines:
1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests for new features
3. Run `npm run lint` before committing
4. Update documentation
5. Submit pull request
