import { useState, type FormEvent } from 'react';
import { Button } from '../../components/common/Button';
import type { Goal } from '../../types/goal';
import type { PlanAdaptationResponse } from '../../validations/aiResponses';
import { fetchRoadmap } from '../roadmap/roadmapApi';
import { generatePlanAdaptation, planAdaptationReasons } from './generatePlanAdaptation';
import type { PlanAdaptationReasonId } from './generatePlanAdaptation';
import { fetchRecentProgressLogs } from './mentorChatApi';

type PlanAdaptationPanelProps = {
  goal: Goal;
};

const changeTypeLabels: Record<PlanAdaptationResponse['planChanges'][number]['type'], string> = {
  focus: 'Фокус',
  postpone: 'Перенести',
  simplify: 'Упростить',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

export function PlanAdaptationPanel({ goal }: PlanAdaptationPanelProps) {
  const [adaptation, setAdaptation] = useState<PlanAdaptationResponse | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reasonId, setReasonId] = useState<PlanAdaptationReasonId>('too_difficult');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setIsGenerating(true);

    try {
      const [roadmapStages, progressLogs] = await Promise.all([
        fetchRoadmap(goal.id),
        fetchRecentProgressLogs(goal.id),
      ]);
      const nextAdaptation = await generatePlanAdaptation({
        comment,
        goal,
        progressLogs,
        reasonId,
        roadmapStages,
      });

      setAdaptation(nextAdaptation);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="plan-adaptation-panel" aria-label="Адаптация плана">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Я застрял</span>
          <h2>Предложить адаптацию плана</h2>
          <p>AI предложит, как упростить ближайшие шаги. План сам не изменится.</p>
        </div>
      </div>

      <form className="plan-adaptation-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="plan-adaptation-field">
          <span>Причина</span>
          <select
            className="plan-adaptation-select"
            disabled={isGenerating}
            onChange={(event) => setReasonId(event.target.value as PlanAdaptationReasonId)}
            value={reasonId}
          >
            {planAdaptationReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <label className="plan-adaptation-field">
          <span>Комментарий</span>
          <textarea
            className="plan-adaptation-textarea"
            disabled={isGenerating}
            maxLength={300}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Например: не успеваю после школы или не понимаю задание..."
            rows={3}
            value={comment}
          />
        </label>

        {error ? (
          <div className="form-error mentor-chat-error" role="alert">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="plan-adaptation-actions">
          <Button disabled={isGenerating} type="submit">
            {isGenerating ? 'Думаем...' : 'Предложить адаптацию'}
          </Button>
        </div>
      </form>

      {adaptation ? (
        <div className="plan-adaptation-result" aria-live="polite">
          <div>
            <span>Сегодня</span>
            <strong>{adaptation.nextSmallAction}</strong>
          </div>
          <ul>
            {adaptation.planChanges.map((change) => (
              <li key={`${change.type}-${change.change}`}>
                <span>{changeTypeLabels[change.type]}</span>
                {change.change}
              </li>
            ))}
          </ul>
          <p>{adaptation.explanation}</p>
        </div>
      ) : null}
    </section>
  );
}
