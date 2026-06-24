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
  const [availableHours, setAvailableHours] = useState('0');
  const [availableMinutes, setAvailableMinutes] = useState('30');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [currentLevel, setCurrentLevel] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const parsedHours = Number(availableHours);
  const parsedMinutes = Number(availableMinutes);
  const parsedTime =
    Number.isFinite(parsedHours) && Number.isFinite(parsedMinutes)
      ? parsedHours * 60 + parsedMinutes
      : Number.NaN;
  const isTimeValid =
    Number.isFinite(parsedHours) &&
    Number.isFinite(parsedMinutes) &&
    parsedHours >= 0 &&
    parsedMinutes >= 0 &&
    parsedMinutes < 60 &&
    parsedTime > 0;
  const canCreateMoreGoals = !isGoalLimitEnabled || goalCount < maxGoals;
  const canSubmit = useMemo(
    () =>
      canCreateMoreGoals &&
      title.trim().length >= 3 &&
      targetDate.length > 0 &&
      isTimeValid,
    [canCreateMoreGoals, isTimeValid, targetDate, title],
  );
  const hoursLabel = language === 'ru' ? 'hr' : 'hours';

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
    <div className="page-stack create-goal-stitch-page">
      <header className="page-header page-header-compact">
        <div>
          <span className="eyebrow">{t.newGoal}</span>
          <h1>{t.createGoal}</h1>
          <p>{t.createGoalDescription}</p>
        </div>
      </header>

      <form className="form-panel form-panel-compact" onSubmit={handleSubmit}>
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
            rows={2}
          />
        </label>

        <div className="form-grid form-grid-compact">
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

          <div className="form-field goal-time-field">
            <div className="goal-time-label">{t.availableTime}</div>
            <div className="goal-time-picker">
              <label className="goal-time-input">
                <span>{hoursLabel}</span>
                <input
                  inputMode="numeric"
                  min={0}
                  step={1}
                  type="number"
                  value={availableHours}
                  onChange={(event) => setAvailableHours(event.target.value)}
                />
              </label>
              <label className="goal-time-input">
                <span>{t.min}</span>
                <input
                  inputMode="numeric"
                  max={59}
                  min={0}
                  step={5}
                  type="number"
                  value={availableMinutes}
                  onChange={(event) => setAvailableMinutes(event.target.value)}
                />
              </label>
            </div>
            <fieldset className="segmented-field segmented-field-compact">
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
            {wasSubmitted && !isTimeValid ? <small>{t.timePositive}</small> : null}
          </div>
        </div>

        <label className="form-field">
          <span>{t.currentLevel}</span>
          <textarea
            value={currentLevel}
            onChange={(event) => setCurrentLevel(event.target.value)}
            placeholder={t.currentLevelPlaceholder}
            rows={2}
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
                  { at: 0, label: t.loadingGoal },
                  { at: 45, label: t.loadingMentor },
                  { at: 80, label: t.loadingReady },
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
