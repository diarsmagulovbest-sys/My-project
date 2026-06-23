import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getInitialPaletteId,
  getPaletteById,
  PaletteContext,
  paletteStorageKey,
  type AppPaletteId,
} from './palette';

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState<AppPaletteId>(() => getInitialPaletteId());
  const palette = useMemo(() => getPaletteById(paletteId), [paletteId]);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.appPalette = palette.id;
    root.style.setProperty('--app-bg', palette.background);
    root.style.setProperty('--app-surface', palette.card);
    root.style.setProperty('--app-brand', palette.primary);
    root.style.setProperty('--app-brand-soft', palette.primarySoft);
    root.style.setProperty('--app-brand-strong', palette.textAccent);
    root.style.setProperty('--app-border-accent', palette.border);
    localStorage.setItem(paletteStorageKey, palette.id);
  }, [palette]);

  const value = useMemo(() => ({ palette, setPaletteId }), [palette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}
