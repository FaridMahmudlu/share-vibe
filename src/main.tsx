import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { applyBrandDocumentMeta } from './config/brand.ts';
import { CafeContextProvider } from './context/CafeContext.tsx';
import { initializeErrorTracking, initializeAnalytics } from './config/app.ts';
import './styles/index.css';

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
