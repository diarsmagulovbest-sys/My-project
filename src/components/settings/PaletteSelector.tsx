import type { CSSProperties } from 'react';
import { CheckIcon } from '@radix-ui/react-icons';
import { useLanguage } from '../../lib/language';
import { appPalettes, usePalette } from '../../lib/palette';

export function PaletteSelector() {
  const { language } = useLanguage();
  const { palette: selectedPalette, setPaletteId } = usePalette();
  const paletteTitle = language === 'ru' ? '\u041f\u0430\u043b\u0438\u0442\u0440\u0430' : 'Palette';
  const paletteDescription =
    language === 'ru'
      ? '\u0410\u043a\u0446\u0435\u043d\u0442 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430'
      : 'Interface accent';

  return (
    <article className="settings-card settings-palette-card">
      <div>
        <span>{paletteTitle}</span>
        <strong>{paletteDescription}</strong>
      </div>

      <div className="palette-options" aria-label={paletteTitle}>
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
              title={palette.label[language]}
              type="button"
            >
              <span className="palette-swatch" aria-hidden="true" />
              <span>{palette.label[language]}</span>
              {isSelected ? <CheckIcon aria-hidden="true" className="palette-check" /> : null}
            </button>
          );
        })}
      </div>
    </article>
  );
}
