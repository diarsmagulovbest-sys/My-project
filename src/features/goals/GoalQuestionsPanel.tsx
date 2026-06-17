import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { ProgressiveFluxLoader } from '../../components/common/ProgressiveFluxLoader';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import { generateClarifyingQuestions } from './generateQuestions';
import { createGoalQuestions, fetchGoalQuestions, saveGoalQuestionAnswers } from './questionsApi';

type GoalQuestionsPanelProps = {
  goal: Goal;
  onAnswersSaved?: () => void;
};

const pendingQuestionRequests = new Map<string, Promise<GoalQuestion[]>>();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

function mapAnswers(questions: GoalQuestion[]) {
  return questions.reduce<Record<string, string>>((accumulator, question) => {
    accumulator[question.id] = question.answer;
    return accumulator;
  }, {});
}

async function getOrCreateQuestions(goal: Goal) {
  const existingQuestions = await fetchGoalQuestions(goal.id);

  if (existingQuestions.length > 0) {
    return existingQuestions;
  }

  const pendingRequest = pendingQuestionRequests.get(goal.id);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = generateClarifyingQuestions(goal)
    .then((questions) => createGoalQuestions(goal.id, questions))
    .finally(() => {
      pendingQuestionRequests.delete(goal.id);
    });

  pendingQuestionRequests.set(goal.id, nextRequest);

  return nextRequest;
}

export function GoalQuestionsPanel({ goal, onAnswersSaved }: GoalQuestionsPanelProps) {
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

    getOrCreateQuestions(goal)
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
  }, [goal]);

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    setSuccessMessage(null);

    try {
      const nextQuestions = await getOrCreateQuestions(goal);
      setQuestions(nextQuestions);
      setAnswers(mapAnswers(nextQuestions));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswers = async (message: string) => {
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
      onAnswersSaved?.();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="questions-panel" aria-label="Уточняющие вопросы">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Уточнение цели</span>
          <h2>Ответь на несколько вопросов</h2>
          <p>Так план получится точнее и ближе к твоей реальной ситуации.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="inline-state">
          <ProgressiveFluxLoader
            phases={[
              { at: 0, label: 'анализ цели' },
              { at: 40, label: 'подбор вопросов' },
              { at: 75, label: 'проверка' },
              { at: 100, label: 'готово' },
            ]}
          />
        </div>
      ) : null}

      {error ? (
        <div className="form-error questions-error" role="alert">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void handleRetry()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && questions.length > 0 ? (
        <>
          <div className="question-list">
            {questions.map((question, index) => (
              <label className="question-item" key={question.id}>
                <span>Вопрос {index + 1}</span>
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
                  placeholder="Твой ответ"
                  rows={3}
                  value={answers[question.id] ?? ''}
                />
              </label>
            ))}
          </div>

          {successMessage ? <p className="form-success">{successMessage}</p> : null}

          <div className="question-actions">
            <Button
              disabled={isSaving}
              onClick={() => void saveAnswers('Ответы сохранены.')}
              variant="secondary"
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить ответы'}
            </Button>
            <Button
              disabled={isSaving || !allQuestionsAnswered}
              onClick={() => void saveAnswers('Ответы сохранены.')}
            >
              Продолжить
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
