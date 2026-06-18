import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { CalendarPicker } from '../../components/common/CalendarPicker';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import { useLanguage } from '../../lib/language';
import type { CreateGoalInput, TimePeriod } from '../../types/goal';

type CreateGoalFormProps = {
  error?: string | null;
  goalCount: number;
  isGoalLimitEnabled: boolean;
  isSubmitting?: boolean;
  maxGoals: number;
  onCancel: () => void;
  onCreate: (input: CreateGoalInput) => Promise<void> | void;
};

const today = new Date().toISOString().slice(0, 10);

export function CreateGoalForm({
  error = null,
  goalCount,
  isGoalLimitEnabled,
  isSubmitting = false,
  maxGoals,
  onCancel,
  onCreate,
}: CreateGoalFormProps) {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [availableTime, setAvailableTime] = useState('30');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [currentLevel, setCurrentLevel] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const parsedTime = Number(availableTime);
  const canCreateMoreGoals = !isGoalLimitEnabled || goalCount < maxGoals;
  const canSubmit = useMemo(
    () =>
      canCreateMoreGoals &&
      title.trim().length >= 3 &&
      targetDate.length > 0 &&
      Number.isFinite(parsedTime) &&
      parsedTime > 0,
    [canCreateMoreGoals, parsedTime, targetDate, title],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWasSubmitted(true);

    if (!canSubmit || isSubmitting) {
      return;
    }

    void onCreate({
      availableTime: parsedTime,
      currentLevel: currentLevel.trim(),
      description: description.trim(),
      targetDate,
      timePeriod,
      title: title.trim(),
    });
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">{t.newGoal}</span>
          <h1>{t.createGoal}</h1>
          <p>{t.createGoalDescription}</p>
        </div>
      </header>

      <form className="form-panel" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>{t.goalTitle}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.goalTitlePlaceholder}
          />
          {wasSubmitted && title.trim().length < 3 ? <small>{t.goalTitleHelp}</small> : null}
        </label>

        <label className="form-field">
          <span>{t.description}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t.descriptionPlaceholder}
            rows={4}
          />
        </label>

        <div className="form-grid">
          <div className="form-field">
            <span>{t.targetDate}</span>
            <CalendarPicker
              ariaLabel={t.targetDateAria}
              error={wasSubmitted && !targetDate ? t.dateRequired : null}
              minValue={today}
              onChange={setTargetDate}
              value={targetDate}
            />
          </div>

          <label className="form-field">
            <span>{language === 'ru' ? 'Свободное время' : 'Available time'}</span>
            <input
              min={1}
              type="number"
              value={availableTime}
              onChange={(event) => setAvailableTime(event.target.value)}
            />
            {wasSubmitted && (!Number.isFinite(parsedTime) || parsedTime <= 0) ? (
              <small>{t.timePositive}</small>
            ) : null}
          </label>
        </div>

        <fieldset className="segmented-field">
          <legend>{t.timePeriod}</legend>
          <div>
            <button
              className={timePeriod === 'day' ? 'segment segment-active' : 'segment'}
              type="button"
              onClick={() => setTimePeriod('day')}
            >
              {t.timePeriodDay}
            </button>
            <button
              className={timePeriod === 'week' ? 'segment segment-active' : 'segment'}
              type="button"
              onClick={() => setTimePeriod('week')}
            >
              {t.timePeriodWeek}
            </button>
          </div>
        </fieldset>

        <label className="form-field">
          <span>{t.currentLevel}</span>
          <textarea
            value={currentLevel}
            onChange={(event) => setCurrentLevel(event.target.value)}
            placeholder={t.currentLevelPlaceholder}
            rows={3}
          />
        </label>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        {!canCreateMoreGoals ? (
          <div className="form-error" role="alert">
            {t.createGoalLimit(maxGoals)}
          </div>
        ) : null}

        <div className="form-actions">
          <Button disabled={isSubmitting} variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? (
              <ProgressiveFluxLoader
                className="progressive-flux-loader-compact"
                phases={[
                  { at: 0, label: language === 'ru' ? 'анализ' : 'analysis' },
                  { at: 45, label: language === 'ru' ? 'план' : 'plan' },
                  { at: 80, label: language === 'ru' ? 'готово' : 'ready' },
                ]}
              />
            ) : (
              t.createGoal
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
