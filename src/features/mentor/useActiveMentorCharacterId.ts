import { useEffect, useState } from 'react';

import {
  activeMentorCharacterChangeEvent,
  getActiveMentorCharacterId,
  type MentorCharacterId,
} from './mentorCharacters';

export function useActiveMentorCharacterId() {
  const [activeMentorCharacterId, setActiveMentorCharacterId] = useState<MentorCharacterId>(() =>
    getActiveMentorCharacterId(),
  );

  useEffect(() => {
    const syncActiveMentorCharacterId = () => {
      setActiveMentorCharacterId(getActiveMentorCharacterId());
    };

    window.addEventListener(activeMentorCharacterChangeEvent, syncActiveMentorCharacterId);
    window.addEventListener('storage', syncActiveMentorCharacterId);

    return () => {
      window.removeEventListener(activeMentorCharacterChangeEvent, syncActiveMentorCharacterId);
      window.removeEventListener('storage', syncActiveMentorCharacterId);
    };
  }, []);

  return activeMentorCharacterId;
}
