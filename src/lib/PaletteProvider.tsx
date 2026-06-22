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
    document.documentElement.dataset.appPalette = palette.id;
    localStorage.setItem(paletteStorageKey, palette.id);
  }, [palette.id]);

  const value = useMemo(() => ({ palette, setPaletteId }), [palette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}
