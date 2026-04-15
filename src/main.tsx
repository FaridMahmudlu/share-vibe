import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyBrandDocumentMeta } from './brandAssets.ts';
import './index.css';

applyBrandDocumentMeta();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
