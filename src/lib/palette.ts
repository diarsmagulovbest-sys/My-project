import { createContext, useContext } from 'react';
import type { AppLanguage } from './language';

export type AppPaletteId = 'sky_blue' | 'soft_pink' | 'salad_green' | 'lavender' | 'warm_peach';

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
    id: 'sky_blue',
    label: { en: 'Sky Blue', ru: 'Небесный' },
    primary: '#2f6df6',
    primarySoft: '#eaf2ff',
    background: '#f5f8ff',
    card: '#ffffff',
    border: '#dbe8ff',
    textAccent: '#2458d3',
  },
  {
    id: 'soft_pink',
    label: { en: 'Soft Pink', ru: 'Нежный розовый' },
    primary: '#df5f92',
    primarySoft: '#fff0f6',
    background: '#fff7fb',
    card: '#ffffff',
    border: '#f5d5e4',
    textAccent: '#bf4778',
  },
  {
    id: 'salad_green',
    label: { en: 'Salad Green', ru: 'Салатовый' },
    primary: '#35a853',
    primarySoft: '#edf9ef',
    background: '#f7fcf6',
    card: '#ffffff',
    border: '#d7efdc',
    textAccent: '#268540',
  },
  {
    id: 'lavender',
    label: { en: 'Lavender', ru: 'Лаванда' },
    primary: '#7a62d6',
    primarySoft: '#f2efff',
    background: '#f8f6ff',
    card: '#ffffff',
    border: '#e2dcfb',
    textAccent: '#624bbd',
  },
  {
    id: 'warm_peach',
    label: { en: 'Warm Peach', ru: 'Тёплый персик' },
    primary: '#e0784f',
    primarySoft: '#fff2ec',
    background: '#fff8f3',
    card: '#ffffff',
    border: '#f4dccf',
    textAccent: '#c66240',
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

    return isPaletteId(savedPalette) ? savedPalette : 'sky_blue';
  } catch {
    return 'sky_blue';
  }
}

export function usePalette() {
  const context = useContext(PaletteContext);

  if (!context) {
    throw new Error('usePalette must be used inside PaletteProvider');
  }

  return context;
}
