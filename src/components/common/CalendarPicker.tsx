import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import {
  Button as CalendarButton,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  I18nProvider,
} from 'react-aria-components';
import { useLanguage } from '../../lib/language';

type CalendarPickerProps = {
  ariaLabel: string;
  error?: string | null;
  minValue?: string;
  onChange: (value: string) => void;
  value: string;
};

function getCalendarDate(value: string): CalendarDate | null {
  if (!value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function formatIsoDate(value: string, locale: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function CalendarPicker({
  ariaLabel,
  error = null,
  minValue,
  onChange,
  value,
}: CalendarPickerProps) {
  const { language, t } = useLanguage();
  const locale = language === 'ru' ? 'ru' : 'en-US';
  const selectedDate = getCalendarDate(value);
  const minDate = minValue ? parseDate(minValue) : undefined;
  const currentDate = today(getLocalTimeZone());
  const emptyLabel = t.noDateSelected;

  return (
    <div className={error ? 'calendar-picker-shell calendar-picker-shell-error' : 'calendar-picker-shell'}>
      <I18nProvider locale={locale}>
        <AriaCalendar
          aria-label={ariaLabel}
          className="calendar-picker"
          isDateUnavailable={(date) => (minDate ? date.compare(minDate) < 0 : false)}
          minValue={minDate}
          onChange={(date) => onChange(date.toString())}
          value={selectedDate}
        >
          <header className="calendar-picker-header">
            <CalendarButton className="calendar-picker-nav" slot="previous">
              <ChevronLeftIcon aria-hidden="true" />
            </CalendarButton>
            <Heading className="calendar-picker-heading" />
            <CalendarButton className="calendar-picker-nav" slot="next">
              <ChevronRightIcon aria-hidden="true" />
            </CalendarButton>
          </header>

          <CalendarGrid className="calendar-picker-grid">
            <CalendarGridHeader>
              {(day) => <CalendarHeaderCell className="calendar-picker-weekday">{day}</CalendarHeaderCell>}
            </CalendarGridHeader>
            <CalendarGridBody>
              {(date) => (
                <CalendarCell
                  className={
                    date.compare(currentDate) === 0
                      ? 'calendar-picker-cell calendar-picker-cell-today'
                      : 'calendar-picker-cell'
                  }
                  date={date}
                />
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </AriaCalendar>
      </I18nProvider>

      <div className="calendar-picker-selected" aria-live="polite">
        <span>{t.selected}</span>
        <strong>{value ? formatIsoDate(value, locale) ?? emptyLabel : emptyLabel}</strong>
      </div>

      {error ? <small className="calendar-picker-error">{error}</small> : null}
    </div>
  );
}
