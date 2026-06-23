import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AppPalette,
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

function applyPaletteVariables(root: HTMLElement, palette: AppPalette) {
  const rgbTriplet = hexToRgbTriplet(palette.primary);
  const isDark = root.classList.contains('dark');
  const softAccent = isDark ? `rgba(${rgbTriplet}, 0.24)` : palette.primarySoft;
  const mutedAccent = isDark ? `rgba(${rgbTriplet}, 0.16)` : palette.primarySoft;
  const accentBorder = isDark ? `rgba(${rgbTriplet}, 0.48)` : palette.border;

  root.dataset.appPalette = palette.id;
  root.style.setProperty('--app-bg', isDark ? '#111925' : palette.background);
  root.style.setProperty('--app-bg-end', isDark ? '#141f2d' : '#f7fbff');
  root.style.setProperty('--app-surface', isDark ? '#1d2838' : palette.card);
  root.style.setProperty('--app-brand', palette.primary);
  root.style.setProperty('--app-brand-soft', softAccent);
  root.style.setProperty('--app-brand-strong', isDark ? '#f5f8fc' : palette.textAccent);
  root.style.setProperty('--app-brand-rgb', rgbTriplet);
  root.style.setProperty('--app-border-accent', accentBorder);
  root.style.setProperty('--accent', palette.primary);
  root.style.setProperty('--accent-soft', softAccent);
  root.style.setProperty('--accent-muted', mutedAccent);
  root.style.setProperty('--accent-border', accentBorder);
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState<AppPaletteId>(() => getInitialPaletteId());
  const palette = useMemo(() => getPaletteById(paletteId), [paletteId]);

  useEffect(() => {
    const root = document.documentElement;

    applyPaletteVariables(root, palette);
    localStorage.setItem(paletteStorageKey, palette.id);

    const observer = new MutationObserver(() => {
      applyPaletteVariables(root, palette);
    });

    observer.observe(root, { attributeFilter: ['class'], attributes: true });

    return () => {
      observer.disconnect();
    };
  }, [palette]);

  const value = useMemo(() => ({ palette, setPaletteId }), [palette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}
