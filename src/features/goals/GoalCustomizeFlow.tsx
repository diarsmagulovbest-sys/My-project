import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  CheckIcon,
  ChevronLeftIcon,
  HeartIcon,
  MagicWandIcon,
  ReaderIcon,
  RocketIcon,
} from '@radix-ui/react-icons';
import { Button } from '../../components/common/Button';
import { useLanguage } from '../../lib/language';
import type { Goal } from '../../types/goal';
import type { GoalQuestion } from '../../types/goalQuestion';
import { generateClarifyingQuestions } from './generateQuestions';
import { createGoalQuestions, fetchGoalQuestions, saveGoalQuestionAnswers } from './questionsApi';

type GoalCustomizeFlowProps = {
  goal: Goal;
  onBackToGoal: () => void;
  onDone: () => void;
};

const pendingCustomizeQuestionRequests = new Map<string, Promise<GoalQuestion[]>>();
const optionIcons = [HeartIcon, MagicWandIcon, RocketIcon, ReaderIcon];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function mapSelections(questions: GoalQuestion[]) {
  return questions.reduce<Record<string, number | null>>((selections, question) => {
    selections[question.id] = question.selectedOptionIndex;
    return selections;
  }, {});
}

async function getOrCreateCustomizeQuestions(goal: Goal, language: 'en' | 'ru') {
  const existingQuestions = await fetchGoalQuestions(goal.id);

  if (existingQuestions.length > 0) {
    return existingQuestions;
  }

  const pendingRequestKey = `${goal.id}:${language}`;
  const pendingRequest = pendingCustomizeQuestionRequests.get(pendingRequestKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = generateClarifyingQuestions(goal, language)
    .then((questions) => createGoalQuestions(goal.id, questions))
    .finally(() => {
      pendingCustomizeQuestionRequests.delete(pendingRequestKey);
    });

  pendingCustomizeQuestionRequests.set(pendingRequestKey, nextRequest);

  return nextRequest;
}

export function GoalCustomizeFlow({ goal, onBackToGoal, onDone }: GoalCustomizeFlowProps) {
  const { language, t } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [questions, setQuestions] = useState<GoalQuestion[]>([]);
  const [selections, setSelections] = useState<Record<string, number | null>>({});

  const choiceQuestions = useMemo(
    () => questions.filter((question) => question.responseKind === 'single_choice' && question.answerOptions.length >= 2),
    [questions],
  );
  const currentQuestion = choiceQuestions[currentQuestionIndex] ?? null;
  const selectedOptionIndex = currentQuestion ? selections[currentQuestion.id] ?? null : null;
  const isLastQuestion = currentQuestionIndex >= choiceQuestions.length - 1;

  useEffect(() => {
    let isActive = true;

    setCurrentQuestionIndex(0);
    setError(null);
    setIsLoading(true);

    getOrCreateCustomizeQuestions(goal, language)
      .then((nextQuestions) => {
        if (!isActive) {
          return;
        }

        setQuestions(nextQuestions);
        setSelections(mapSelections(nextQuestions));
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

    try {
      const nextQuestions = await getOrCreateCustomizeQuestions(goal, language);
      setQuestions(nextQuestions);
      setSelections(mapSelections(nextQuestions));
      setCurrentQuestionIndex(0);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((index) => index - 1);
      return;
    }

    onBackToGoal();
  };

  const selectOption = (index: number) => {
    if (!currentQuestion || isSaving) {
      return;
    }

    setSelections((currentSelections) => ({
      ...currentSelections,
      [currentQuestion.id]: index,
    }));
  };

  const saveCurrentQuestion = async () => {
    if (!currentQuestion || selectedOptionIndex === null) {
      return;
    }

    const selectedAnswer = currentQuestion.answerOptions[selectedOptionIndex];

    if (!selectedAnswer) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const nextQuestions = await saveGoalQuestionAnswers(goal.id, [
        {
          answer: selectedAnswer,
          id: currentQuestion.id,
          selectedOptionIndex,
        },
      ]);

      setQuestions(nextQuestions);
      setSelections(mapSelections(nextQuestions));

      if (isLastQuestion) {
        onDone();
        return;
      }

      setCurrentQuestionIndex((index) => index + 1);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  };

  const moveSelection = (direction: 1 | -1) => {
    if (!currentQuestion) {
      return;
    }

    const optionCount = currentQuestion.answerOptions.length;
    const currentIndex = selectedOptionIndex ?? (direction === 1 ? -1 : 0);
    const nextIndex = (currentIndex + direction + optionCount) % optionCount;

    selectOption(nextIndex);
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      selectOption(0);
    }

    if (event.key === 'End' && currentQuestion) {
      event.preventDefault();
      selectOption(currentQuestion.answerOptions.length - 1);
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      selectOption(index);
    }
  };

  return (
    <section className="goal-customize-page" aria-label={goal.title}>
      <div className="goal-customize-shell">
        <div className="goal-customize-device">
          <div className="goal-customize-notch" aria-hidden="true" />
          <div className="goal-customize-phone">
            <div className="goal-customize-art" aria-hidden="true" />
            <button className="goal-customize-back" type="button" onClick={handleBack} aria-label={t.back}>
              <ChevronLeftIcon />
            </button>

            <div className="goal-customize-copy">
              <span className="goal-customize-step">
                {choiceQuestions.length > 0
                  ? `${t.question} ${Math.min(currentQuestionIndex + 1, choiceQuestions.length)} / ${choiceQuestions.length}`
                  : t.question}
              </span>
              <h2>{currentQuestion?.question ?? goal.title}</h2>
            </div>

            {isLoading ? (
              <div className="goal-customize-loading" aria-live="polite">
                <div className="goal-customize-skeleton-list" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <span key={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="goal-customize-error" role="alert">
                <span>{error}</span>
                <Button variant="secondary" onClick={() => void handleRetry()}>
                  {t.retry}
                </Button>
              </div>
            ) : null}

            {!isLoading && !error && currentQuestion ? (
              <fieldset className="goal-customize-options" role="radiogroup">
                <legend className="sr-only">{currentQuestion.question}</legend>
                {currentQuestion.answerOptions.map((option, index) => {
                  const Icon = optionIcons[index % optionIcons.length];
                  const isSelected = selectedOptionIndex === index;

                  return (
                    <button
                      aria-checked={isSelected}
                      className={isSelected ? 'goal-customize-option goal-customize-option-selected' : 'goal-customize-option'}
                      disabled={isSaving}
                      key={`${currentQuestion.id}-${option}`}
                      onClick={() => selectOption(index)}
                      onKeyDown={(event) => handleOptionKeyDown(event, index)}
                      role="radio"
                      type="button"
                    >
                      <Icon aria-hidden="true" />
                      <span>{option}</span>
                      {isSelected ? <CheckIcon aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </fieldset>
            ) : null}

            {!isLoading && !error && !currentQuestion ? (
              <div className="goal-customize-empty">
                <strong>{t.planReady}</strong>
                <div>
                  <Button onClick={onDone}>{t.openGoal}</Button>
                  <Button variant="secondary" onClick={() => void handleRetry()}>
                    {t.retry}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="goal-customize-footer">
              <button
                className="goal-customize-next"
                disabled={!currentQuestion || selectedOptionIndex === null || isSaving}
                onClick={() => void saveCurrentQuestion()}
                type="button"
              >
                {isSaving ? t.saving : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
