import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import type { CreateGoalInput, TimePeriod } from '../../types/goal';

type CreateGoalFormProps = {
  error?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onCreate: (input: CreateGoalInput) => Promise<void> | void;
};

const today = new Date().toISOString().slice(0, 10);

export function CreateGoalForm({
  error = null,
  isSubmitting = false,
  onCancel,
  onCreate,
}: CreateGoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [availableTime, setAvailableTime] = useState('30');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [currentLevel, setCurrentLevel] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const parsedTime = Number(availableTime);
  const canSubmit = useMemo(
    () => title.trim().length >= 3 && targetDate.length > 0 && Number.isFinite(parsedTime) && parsedTime > 0,
    [parsedTime, targetDate, title],
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
          <span className="eyebrow">Новая цель</span>
          <h1>Создать цель</h1>
          <p>Заполни основу. На следующих этапах AI будет задавать уточняющие вопросы.</p>
        </div>
      </header>

      <form className="form-panel" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Название цели</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: научиться собирать кубик Рубика"
          />
          {wasSubmitted && title.trim().length < 3 ? (
            <small>Напиши цель чуть подробнее, минимум 3 символа.</small>
          ) : null}
        </label>

        <label className="form-field">
          <span>Описание</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Что именно ты хочешь получить в результате?"
            rows={4}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Желаемый срок</span>
            <input
              min={today}
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
            {wasSubmitted && !targetDate ? <small>Выбери дату.</small> : null}
          </label>

          <label className="form-field">
            <span>Свободное время</span>
            <input
              min={1}
              type="number"
              value={availableTime}
              onChange={(event) => setAvailableTime(event.target.value)}
            />
            {wasSubmitted && (!Number.isFinite(parsedTime) || parsedTime <= 0) ? (
              <small>Укажи число больше нуля.</small>
            ) : null}
          </label>
        </div>

        <fieldset className="segmented-field">
          <legend>Единица времени</legend>
          <div>
            <button
              className={timePeriod === 'day' ? 'segment segment-active' : 'segment'}
              type="button"
              onClick={() => setTimePeriod('day')}
            >
              В день
            </button>
            <button
              className={timePeriod === 'week' ? 'segment segment-active' : 'segment'}
              type="button"
              onClick={() => setTimePeriod('week')}
            >
              В неделю
            </button>
          </div>
        </fieldset>

        <label className="form-field">
          <span>Текущий уровень</span>
          <textarea
            value={currentLevel}
            onChange={(event) => setCurrentLevel(event.target.value)}
            placeholder="Например: новичок, уже пробовал пару раз, знаю основы"
            rows={3}
          />
        </label>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="form-actions">
          <Button disabled={isSubmitting} variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? 'Создаём...' : 'Создать цель'}
          </Button>
        </div>
      </form>
    </div>
  );
}
