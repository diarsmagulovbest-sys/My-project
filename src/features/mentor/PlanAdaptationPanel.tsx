import { useState, type FormEvent } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { PlanAdaptationResponse } from '../../validations/aiResponses';
import { fetchRoadmap } from '../roadmap/roadmapApi';
import {
  generatePlanAdaptation,
  getPlanAdaptationReasonLabel,
  planAdaptationReasons,
} from './generatePlanAdaptation';
import type { PlanAdaptationReasonId } from './generatePlanAdaptation';
import { fetchRecentProgressLogs } from './mentorChatApi';
import { getMentorCharacterLine } from './mentorCharacters';
import { useActiveMentorCharacterId } from './useActiveMentorCharacterId';

type PlanAdaptationPanelProps = {
  goal: Goal;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function PlanAdaptationPanel({ goal }: PlanAdaptationPanelProps) {
  const { language, t } = useLanguage();
  const changeTypeLabels: Record<PlanAdaptationResponse['planChanges'][number]['type'], string> = {
    focus: t.focus,
    postpone: language === 'ru' ? 'Перенести' : 'Postpone',
    simplify: language === 'ru' ? 'Упростить' : 'Simplify',
  };
  const [adaptation, setAdaptation] = useState<PlanAdaptationResponse | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reasonId, setReasonId] = useState<PlanAdaptationReasonId>('too_difficult');
  const activeMentorCharacterId = useActiveMentorCharacterId();

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
        activeMentorCharacterId,
        comment,
        goal,
        language,
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
    <section className="plan-adaptation-panel" aria-label={t.stuckAdaptationTitle}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t.iAmStuck}</span>
          <h2>{t.stuckAdaptationTitle}</h2>
          <p>{getMentorCharacterLine(activeMentorCharacterId, 'stuckHelp')}</p>
        </div>
      </div>

      <form className="plan-adaptation-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="plan-adaptation-field">
          <span>{t.reason}</span>
          <select
            className="plan-adaptation-select"
            disabled={isGenerating}
            onChange={(event) => setReasonId(event.target.value as PlanAdaptationReasonId)}
            value={reasonId}
          >
            {planAdaptationReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {getPlanAdaptationReasonLabel(reason.id, language)}
              </option>
            ))}
          </select>
        </label>

        <label className="plan-adaptation-field">
          <span>{t.optionalNote}</span>
          <textarea
            className="plan-adaptation-textarea"
            disabled={isGenerating}
            maxLength={300}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              language === 'ru'
                ? 'Например: стало меньше времени после школы или я не понимаю задание.'
                : 'Example: I have less time after school, or I do not understand the task.'
            }
            rows={2}
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
            {isGenerating ? t.thinking : t.suggestAdaptation}
          </Button>
        </div>
      </form>

      {adaptation ? (
        <div className="plan-adaptation-result" aria-live="polite">
          <div>
            <span>{t.today}</span>
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
