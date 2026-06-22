import type { CSSProperties } from 'react';
import { CheckIcon } from '@radix-ui/react-icons';
import { useLanguage } from '../../lib/language';
import { appPalettes, usePalette } from '../../lib/palette';

export function PaletteSelector() {
  const { language } = useLanguage();
  const { palette: selectedPalette, setPaletteId } = usePalette();

  return (
    <article className="settings-card settings-palette-card">
      <div>
        <span>{language === 'ru' ? 'Палитра' : 'Palette'}</span>
        <strong>{language === 'ru' ? 'Мягкий цвет интерфейса' : 'Soft interface accent'}</strong>
      </div>

      <div className="palette-options" aria-label={language === 'ru' ? 'Палитра' : 'Palette'}>
        {appPalettes.map((palette) => {
          const isSelected = palette.id === selectedPalette.id;

          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? 'palette-option palette-option-selected' : 'palette-option'}
              key={palette.id}
              onClick={() => setPaletteId(palette.id)}
              style={
                {
                  '--palette-swatch': palette.primary,
                  '--palette-swatch-soft': palette.primarySoft,
                  '--palette-swatch-border': palette.border,
                } as CSSProperties
              }
              type="button"
            >
              <span className="palette-swatch" aria-hidden="true" />
              <span>{palette.label[language]}</span>
              {isSelected ? <CheckIcon aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </article>
  );
}
