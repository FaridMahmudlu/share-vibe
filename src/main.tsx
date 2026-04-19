import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { applyBrandDocumentMeta } from './brandAssets.ts';
import { CafeContextProvider } from './context/CafeContext.tsx';
import { initializeErrorTracking, initializeAnalytics } from './config.ts';
import './index.css';

// SEO Initialization
import { initCoreWebVitalsTracking } from './seo/utils';
import { injectSchema, createOrganizationSchema, createWebsiteSchema } from './seo/schemas';

// Initialize configuration and error tracking
initializeErrorTracking();
initializeAnalytics();

// Initialize SEO
initCoreWebVitalsTracking();
injectSchema(createOrganizationSchema());
injectSchema(createWebsiteSchema());

applyBrandDocumentMeta();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <CafeContextProvider>
        <App />
      </CafeContextProvider>
    </ErrorBoundary>
  </StrictMode>,
);
