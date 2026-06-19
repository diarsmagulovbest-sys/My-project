import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/common/Button';
import type { Goal } from '../../types/goal';
import type { MentorConversation, MentorMessage } from '../../types/mentorChat';
import { fetchRoadmap } from '../roadmap/roadmapApi';
import { generateMentorReply } from './generateMentorReply';
import {
  createMentorMessage,
  fetchMentorMessages,
  fetchRecentProgressLogs,
  getOrCreateMentorConversation,
} from './mentorChatApi';

type MentorChatProps = {
  goal: Goal;
};

type MentorReplyRetryState = {
  conversation: MentorConversation;
  messages: MentorMessage[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

function getMessageAuthor(message: MentorMessage) {
  return message.role === 'assistant' ? 'AI-наставник' : 'Ты';
}

export function MentorChat({ goal }: MentorChatProps) {
  const [conversation, setConversation] = useState<MentorConversation | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [retryState, setRetryState] = useState<MentorReplyRetryState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    getOrCreateMentorConversation(goal)
      .then(async (nextConversation) => {
        const nextMessages = await fetchMentorMessages(nextConversation.id);

        if (!isActive) {
          return;
        }

        setConversation(nextConversation);
        setMessages(nextMessages);
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setError(getErrorMessage(caughtError));
        }
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const createAssistantReply = async (
    activeConversation: MentorConversation,
    nextMessages: MentorMessage[],
  ) => {
    const [roadmapStages, progressLogs] = await Promise.all([
      fetchRoadmap(goal.id),
      fetchRecentProgressLogs(goal.id),
    ]);
    const mentorReply = await generateMentorReply({
      goal,
      messages: nextMessages,
      progressLogs,
      roadmapStages,
    });

    return createMentorMessage(activeConversation.id, 'assistant', mentorReply.message);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    setDraft('');
    setError(null);
    setIsSending(true);
    setRetryState(null);

    let activeConversation: MentorConversation | null = null;
    let messagesWithUserReply: MentorMessage[] | null = null;
    let userMessageWasSaved = false;

    try {
      activeConversation = conversation ?? (await getOrCreateMentorConversation(goal));

      if (!conversation) {
        setConversation(activeConversation);
      }

      const userMessage = await createMentorMessage(activeConversation.id, 'user', content);
      userMessageWasSaved = true;
      messagesWithUserReply = [...messages, userMessage];

      setMessages(messagesWithUserReply);

      const assistantMessage = await createAssistantReply(activeConversation, messagesWithUserReply);

      setMessages([...messagesWithUserReply, assistantMessage]);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      if (userMessageWasSaved && activeConversation && messagesWithUserReply) {
        setRetryState({
          conversation: activeConversation,
          messages: messagesWithUserReply,
        });
      } else {
        setDraft(content);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryAssistantReply = async () => {
    if (!retryState || isSending) {
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      const assistantMessage = await createAssistantReply(
        retryState.conversation,
        retryState.messages,
      );

      setMessages([...retryState.messages, assistantMessage]);
      setRetryState(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mentor-chat-panel" aria-label="AI Mentor chat">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">AI-наставник</span>
          <h2>Чат по этой цели</h2>
          <p>Можно спросить про задания, следующий шаг или непонятную часть плана.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="inline-state">
          <strong>Загружаем чат...</strong>
          <p>Проверяем сохранённую переписку по этой цели.</p>
        </div>
      ) : null}

      {!isLoading && messages.length === 0 ? (
        <div className="inline-state">
          <strong>Чат готов</strong>
          <p>Напиши вопрос, и наставник ответит с учётом цели, профиля и дорожной карты.</p>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="mentor-message-list" aria-live="polite">
          {messages.map((message) => (
            <article
              className={
                message.role === 'assistant'
                  ? 'mentor-message mentor-message-assistant'
                  : 'mentor-message mentor-message-user'
              }
              key={message.id}
            >
              <span>{getMessageAuthor(message)}</span>
              <p>{message.content}</p>
            </article>
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : null}

      {error ? (
        <div className="form-error mentor-chat-error" role="alert">
          <span>{error}</span>
          {retryState ? (
            <Button
              disabled={isSending}
              onClick={() => void handleRetryAssistantReply()}
              variant="secondary"
            >
              {isSending ? 'Повторяем...' : 'Повторить ответ'}
            </Button>
          ) : null}
        </div>
      ) : null}

      <form className="mentor-chat-form" onSubmit={(event) => void handleSend(event)}>
        <textarea
          className="mentor-chat-input"
          disabled={isLoading || isSending}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Спроси наставника про эту цель..."
          rows={3}
          value={draft}
        />
        <div className="mentor-chat-actions">
          <Button disabled={isLoading || isSending || !draft.trim()} type="submit">
            {isSending ? 'Отвечаем...' : 'Отправить'}
          </Button>
        </div>
      </form>
    </section>
  );
}
