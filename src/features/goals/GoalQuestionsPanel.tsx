import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import { useLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import { generateClarifyingQuestions } from './generateQuestions';
import { createGoalQuestions, fetchGoalQuestions, saveGoalQuestionAnswers } from './questionsApi';

type GoalQuestionsPanelProps = {
  goal: Goal;
  onAnswersSaved?: (options?: { openRoadmap?: boolean }) => void;
};

const pendingQuestionRequests = new Map<string, Promise<GoalQuestion[]>>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function mapAnswers(questions: GoalQuestion[]) {
  return questions.reduce<Record<string, string>>((accumulator, question) => {
    accumulator[question.id] = question.answer;
    return accumulator;
  }, {});
}

async function getOrCreateQuestions(goal: Goal, language: 'en' | 'ru') {
  const existingQuestions = await fetchGoalQuestions(goal.id);

  if (existingQuestions.length > 0) {
    return existingQuestions;
  }

  const pendingRequestKey = `${goal.id}:${language}`;
  const pendingRequest = pendingQuestionRequests.get(pendingRequestKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = generateClarifyingQuestions(goal, language)
    .then((questions) => createGoalQuestions(goal.id, questions))
    .finally(() => {
      pendingQuestionRequests.delete(pendingRequestKey);
    });

  pendingQuestionRequests.set(pendingRequestKey, nextRequest);

  return nextRequest;
}

export function GoalQuestionsPanel({ goal, onAnswersSaved }: GoalQuestionsPanelProps) {
  const { language, t } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const allQuestionsAnswered = useMemo(
    () => questions.length > 0 && questions.every((question) => answers[question.id]?.trim()),
    [answers, questions],
  );

  useEffect(() => {
    let isActive = true;

    getOrCreateQuestions(goal, language)
      .then((nextQuestions) => {
        if (!isActive) {
          return;
        }

        setQuestions(nextQuestions);
        setAnswers(mapAnswers(nextQuestions));
      })
      .catch((caughtError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [goal, language]);

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      const nextQuestions = await getOrCreateQuestions(goal, language);
      setQuestions(nextQuestions);
      setAnswers(mapAnswers(nextQuestions));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswers = async (message: string, options?: { openRoadmap?: boolean }) => {
    setError(null);
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const nextQuestions = await saveGoalQuestionAnswers(
        goal.id,
        questions.map((question) => ({
          answer: answers[question.id] ?? '',
          id: question.id,
        })),
      );

      setQuestions(nextQuestions);
      setAnswers(mapAnswers(nextQuestions));
      setSuccessMessage(message);
      onAnswersSaved?.(options);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="questions-panel" aria-label={t.answerFewQuestions}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t.goalDetails}</span>
          <h2>{t.answerFewQuestions}</h2>
          <p>{t.answersEnough}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="inline-state">
          <ProgressiveFluxLoader
            phases={[
              { at: 0, label: t.loadingGoal },
              { at: 40, label: t.loadingQuestions },
              { at: 75, label: t.checkingRoadmap },
              { at: 100, label: t.loadingReady },
            ]}
          />
        </div>
      ) : null}

      {error ? (
        <div className="form-error questions-error" role="alert">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void handleRetry()}>
            {t.retry}
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && questions.length > 0 ? (
        <>
          <div className="question-list">
            {questions.map((question, index) => (
              <label className="question-item" key={question.id}>
                <span>{t.question} {index + 1}</span>
                <strong>{question.question}</strong>
                <textarea
                  disabled={isSaving}
                  onChange={(event) => {
                    setAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [question.id]: event.target.value,
                    }));
                    setSuccessMessage(null);
                  }}
                  placeholder={t.yourAnswer}
                  rows={2}
                  value={answers[question.id] ?? ''}
                />
              </label>
            ))}
          </div>

          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <div className="question-actions">
            <Button
              disabled={isSaving}
              onClick={() => void saveAnswers(t.answersSavedNext)}
              variant="secondary"
            >
              {isSaving ? t.saving : t.saveAnswers}
            </Button>
            <Button
              disabled={isSaving || !allQuestionsAnswered}
              onClick={() =>
                void saveAnswers(t.answersSavedOpening, {
                  openRoadmap: true,
                })
              }
            >
              {t.saveAndOpenRoadmap}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
