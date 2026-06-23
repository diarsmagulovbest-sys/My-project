import { createContext, useContext } from 'react';
import type { AppLanguage } from './language';

export type AppPaletteId = 'plum_mauve' | 'sky_blue' | 'soft_pink' | 'lavender' | 'warm_peach';

export type AppPalette = {
  id: AppPaletteId;
  label: Record<AppLanguage, string>;
  primary: string;
  primarySoft: string;
  background: string;
  card: string;
  border: string;
  textAccent: string;
};

export type PaletteContextValue = {
  palette: AppPalette;
  setPaletteId: (paletteId: AppPaletteId) => void;
};

export const paletteStorageKey = 'app-palette';

export const appPalettes = [
  {
    id: 'plum_mauve',
    label: { en: 'Plum', ru: 'Plum' },
    primary: '#835d6b',
    primarySoft: '#f7dbe7',
    background: '#f3f9fd',
    card: '#ffffff',
    border: '#e6d7df',
    textAccent: '#694451',
  },
  {
    id: 'sky_blue',
    label: { en: 'Sky', ru: 'Sky' },
    primary: '#2d6c84',
    primarySoft: '#dff3fc',
    background: '#f3f9fd',
    card: '#ffffff',
    border: '#cbe5f2',
    textAccent: '#245a70',
  },
  {
    id: 'soft_pink',
    label: { en: 'Rose', ru: 'Rose' },
    primary: '#c86f91',
    primarySoft: '#fde5ee',
    background: '#fff7fb',
    card: '#ffffff',
    border: '#f1cbd9',
    textAccent: '#a45473',
  },
  {
    id: 'lavender',
    label: { en: 'Lavender', ru: 'Lavender' },
    primary: '#8d68bf',
    primarySoft: '#efe3fb',
    background: '#f8f6ff',
    card: '#ffffff',
    border: '#decdf2',
    textAccent: '#6f4c9d',
  },
  {
    id: 'warm_peach',
    label: { en: 'Peach', ru: 'Peach' },
    primary: '#c97962',
    primarySoft: '#fde8df',
    background: '#fff8f3',
    card: '#ffffff',
    border: '#efd3c8',
    textAccent: '#9f5d4a',
  },
] as const satisfies AppPalette[];

export const PaletteContext = createContext<PaletteContextValue | null>(null);

export function isPaletteId(value: unknown): value is AppPaletteId {
  return typeof value === 'string' && appPalettes.some((palette) => palette.id === value);
}

export function getPaletteById(paletteId: AppPaletteId) {
  return appPalettes.find((palette) => palette.id === paletteId) ?? appPalettes[0];
}

export function getInitialPaletteId(): AppPaletteId {
  try {
    const savedPalette = localStorage.getItem(paletteStorageKey);

    return isPaletteId(savedPalette) ? savedPalette : 'plum_mauve';
  } catch {
    return 'plum_mauve';
  }
}

export function usePalette() {
  const context = useContext(PaletteContext);

  if (!context) {
    throw new Error('usePalette must be used inside PaletteProvider');
  }

  return context;
}
