import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/LanguageProvider';
import { PaletteProvider } from './lib/PaletteProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <PaletteProvider>
        <App />
      </PaletteProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
