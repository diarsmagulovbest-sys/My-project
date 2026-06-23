import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getInitialPaletteId,
  getPaletteById,
  PaletteContext,
  paletteStorageKey,
  type AppPaletteId,
} from './palette';

function hexToRgbTriplet(hex: string) {
  const normalizedHex = hex.replace('#', '');
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

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
    root.style.setProperty('--app-brand-rgb', hexToRgbTriplet(palette.primary));
    root.style.setProperty('--app-border-accent', palette.border);
    root.style.setProperty('--accent', palette.primary);
    root.style.setProperty('--accent-soft', palette.primarySoft);
    root.style.setProperty('--accent-muted', palette.primarySoft);
    root.style.setProperty('--accent-border', palette.border);
    localStorage.setItem(paletteStorageKey, palette.id);
  }, [palette]);

  const value = useMemo(() => ({ palette, setPaletteId }), [palette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}
