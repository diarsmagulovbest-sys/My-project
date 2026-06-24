import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage, type AppLanguage } from '../../lib/language';
import {
  mentorCharacterIds,
  mentorCharacters,
  setActiveMentorCharacterId,
  type MentorCharacter,
  type MentorCharacterId,
} from './mentorCharacters';
import { useActiveMentorCharacterId } from './useActiveMentorCharacterId';

type MentorCharacterCopy = {
  description: string;
  name: string;
  shortName: string;
  styles: string[];
};

const mentorCharacterCopy: Record<AppLanguage, Record<MentorCharacterId, MentorCharacterCopy>> = {
  en: {
    calm_plant: {
      description: 'A living plant companion that gets brighter when you act and worried when you avoid the goal.',
      name: 'Sprout Mentor',
      shortName: 'Sprout',
      styles: ['living', 'direct', 'mischievous', 'growth-based'],
    },
    friendly_mushroom: {
      description: 'A warm mentor who makes difficult goals feel easier to begin.',
      name: 'Friendly Mushroom',
      shortName: 'Mushroom',
      styles: ['friendly', 'warm', 'simple', 'encouraging'],
    },
    wise_golem: {
      description: 'A steady mentor who explains the reason behind each next step.',
      name: 'Wise Golem',
      shortName: 'Golem',
      styles: ['wise', 'steady', 'reflective', 'practical'],
    },
  },
  ru: {
    calm_plant: {
      description:
        '\u0416\u0438\u0432\u043e\u0439 \u0440\u043e\u0441\u0442\u043e\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0440\u0430\u0434\u0443\u0435\u0442\u0441\u044f \u0434\u0435\u043b\u0443 \u0438 \u0442\u0440\u0435\u0432\u043e\u0436\u0438\u0442\u0441\u044f, \u043a\u043e\u0433\u0434\u0430 \u0446\u0435\u043b\u044c \u0438\u0437\u0431\u0435\u0433\u0430\u044e\u0442.',
      name: '\u0420\u043e\u0441\u0442\u043e\u043a-\u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a',
      shortName: '\u0420\u043e\u0441\u0442\u043e\u043a',
      styles: ['\u0436\u0438\u0432\u043e\u0439', '\u043f\u0440\u044f\u043c\u043e\u0439', '\u0445\u0438\u0442\u0440\u044b\u0439', '\u043f\u0440\u043e \u0440\u043e\u0441\u0442'],
    },
    friendly_mushroom: {
      description:
        '\u0422\u0435\u043f\u043b\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0434\u0435\u043b\u0430\u0435\u0442 \u0441\u043b\u043e\u0436\u043d\u044b\u0435 \u0446\u0435\u043b\u0438 \u043f\u0440\u043e\u0449\u0435 \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430.',
      name: '\u0414\u0440\u0443\u0436\u0435\u043b\u044e\u0431\u043d\u044b\u0439 \u0433\u0440\u0438\u0431',
      shortName: '\u0413\u0440\u0438\u0431',
      styles: ['\u0434\u0440\u0443\u0436\u0435\u043b\u044e\u0431\u043d\u044b\u0439', '\u0442\u0435\u043f\u043b\u044b\u0439', '\u043f\u0440\u043e\u0441\u0442\u043e\u0439', '\u043e\u0431\u043e\u0434\u0440\u044f\u044e\u0449\u0438\u0439'],
    },
    wise_golem: {
      description:
        '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439 \u0438 \u043c\u0443\u0434\u0440\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043e\u0431\u044a\u044f\u0441\u043d\u044f\u0435\u0442 \u0441\u043c\u044b\u0441\u043b \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0433\u043e \u0448\u0430\u0433\u0430.',
      name: '\u041c\u0443\u0434\u0440\u044b\u0439 \u0433\u043e\u043b\u0435\u043c',
      shortName: '\u0413\u043e\u043b\u0435\u043c',
      styles: ['\u043c\u0443\u0434\u0440\u044b\u0439', '\u0443\u0441\u0442\u043e\u0439\u0447\u0438\u0432\u044b\u0439', '\u0440\u0430\u0437\u043c\u044b\u0448\u043b\u044f\u044e\u0449\u0438\u0439', '\u043f\u0440\u0430\u043a\u0442\u0438\u0447\u043d\u044b\u0439'],
    },
  },
};

const pageCopy = {
  en: {
    active: 'Active character',
    avatar: 'Avatar placeholder',
    description:
      'Your journey is personal. Select the mentor whose energy matches the path you want to walk today.',
    selected: 'Selected',
    select: 'Select',
    style: 'Style',
    title: 'Choose your Companion',
  },
  ru: {
    active: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u0436',
    avatar: '\u0417\u0430\u0433\u043b\u0443\u0448\u043a\u0430 \u0430\u0432\u0430\u0442\u0430\u0440\u0430',
    description:
      '\u0412\u044b\u0431\u0435\u0440\u0438 \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a\u0430. \u041f\u043e\u043a\u0430 \u044d\u0442\u043e \u0442\u043e\u043b\u044c\u043a\u043e UI-\u0432\u044b\u0431\u043e\u0440, \u043e\u043d \u0435\u0449\u0435 \u043d\u0435 \u043c\u0435\u043d\u044f\u0435\u0442 \u043e\u0442\u0432\u0435\u0442\u044b AI.',
    selected: '\u0412\u044b\u0431\u0440\u0430\u043d',
    select: '\u0412\u044b\u0431\u0440\u0430\u0442\u044c',
    style: '\u0421\u0442\u0438\u043b\u044c',
    title: '\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u0436\u0438-\u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a\u0438',
  },
} satisfies Record<AppLanguage, Record<string, string>>;

function getAvatarText(character: MentorCharacter, copy: MentorCharacterCopy) {
  return copy.shortName.slice(0, 2) || character.shortName.slice(0, 2);
}

type MentorCharacterImageProps = {
  alt?: string;
  className: string;
  fallbackText: string;
  src?: string;
};

function MentorCharacterImage({
  alt = '',
  className,
  fallbackText,
  src,
}: MentorCharacterImageProps) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div className={className}>
      {src && !hasImageError ? (
        <img src={src} alt={alt} onError={() => setHasImageError(true)} />
      ) : (
        <span className="mentor-avatar-mark" aria-label={fallbackText}>
          {fallbackText}
        </span>
      )}
    </div>
  );
}

export function MentorCharactersPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language];
  const selectedCharacterId = useActiveMentorCharacterId();

  const handleSelect = (characterId: MentorCharacterId) => {
    setActiveMentorCharacterId(characterId);
  };

  return (
    <div className="page-stack mentors-stitch-page">
      <header className="mentors-stitch-header">
        <div>
          <span className="eyebrow">{copy.active}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </header>

      <section className="mentor-character-grid mentors-stitch-grid" aria-label={copy.title}>
        {mentorCharacterIds.map((characterId) => {
          const character = mentorCharacters[characterId];
          const characterCopy = mentorCharacterCopy[language][characterId];
          const isSelected = selectedCharacterId === characterId;

          return (
            <article
              className={
                isSelected
                  ? 'mentor-character-card mentor-character-card-selected'
                  : 'mentor-character-card'
              }
              key={character.id}
            >
              <MentorCharacterImage
                alt={characterCopy.name}
                className={`mentor-character-avatar mentor-character-avatar-${character.id}`}
                fallbackText={getAvatarText(character, characterCopy)}
                src={character.avatarPath}
              />

              <div className="mentor-character-card-top">
                <span className="mentor-character-badge">{characterCopy.styles[0]}</span>
                {isSelected ? <span className="mentor-character-selected-pill">{copy.selected}</span> : null}
              </div>

              <div className="mentor-character-copy">
                <span className="eyebrow">{characterCopy.shortName}</span>
                <h2>{characterCopy.name}</h2>
                <p>{characterCopy.description}</p>
              </div>

              <div className="mentor-character-meta">
                <span>{copy.style}</span>
                <div className="mentor-character-tags">
                  {characterCopy.styles.slice(0, 3).map((style) => (
                    <small key={style}>{style}</small>
                  ))}
                </div>
              </div>

              <Button
                disabled={isSelected}
                onClick={() => handleSelect(character.id)}
                variant={isSelected ? 'secondary' : 'primary'}
              >
                {isSelected ? copy.selected : copy.select}
              </Button>
            </article>
          );
        })}
      </section>
    </div>
  );
}
