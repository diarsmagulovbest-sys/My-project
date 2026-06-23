import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useLanguage, type AppLanguage } from '../../lib/language';
import {
  getActiveMentorCharacterId,
  mentorCharacterIds,
  mentorCharacters,
  setActiveMentorCharacterId,
  type MentorCharacter,
  type MentorCharacterId,
} from './mentorCharacters';

type MentorCharacterCopy = {
  description: string;
  name: string;
  shortName: string;
  styles: string[];
};

const mentorCharacterCopy: Record<AppLanguage, Record<MentorCharacterId, MentorCharacterCopy>> = {
  en: {
    ancient_totem: {
      description: 'A quiet observer who helps you notice patterns and choose one clear focus.',
      name: 'Ancient Totem',
      shortName: 'Totem',
      styles: ['observant', 'minimal', 'strategic', 'grounded'],
    },
    calm_plant: {
      description: 'A gentle guide who helps you move forward with small steps and less pressure.',
      name: 'Calm Plant',
      shortName: 'Plant',
      styles: ['calm', 'supportive', 'gentle', 'patient'],
    },
    creative_terrarium: {
      description: 'A flexible idea-maker who suggests experiments, options, and creative practice.',
      name: 'Creative Terrarium',
      shortName: 'Terrarium',
      styles: ['creative', 'experimental', 'curious', 'flexible'],
    },
    energetic_dragon: {
      description: 'A high-energy mentor who helps you start fast and keep momentum.',
      name: 'Energetic Dragon',
      shortName: 'Dragon',
      styles: ['energetic', 'motivating', 'action-focused', 'bold'],
    },
    friendly_mushroom: {
      description: 'A warm mentor who makes difficult goals feel easier to begin.',
      name: 'Friendly Mushroom',
      shortName: 'Mushroom',
      styles: ['friendly', 'warm', 'simple', 'encouraging'],
    },
    mysterious_knight: {
      description: 'A focused mentor who frames progress as a disciplined personal quest.',
      name: 'Mysterious Knight',
      shortName: 'Knight',
      styles: ['focused', 'reserved', 'challenge-oriented', 'honorable'],
    },
    strict_robot: {
      description: 'A clear and disciplined mentor who prefers structure and concrete actions.',
      name: 'Strict Robot',
      shortName: 'Robot',
      styles: ['structured', 'direct', 'disciplined', 'precise'],
    },
    wise_golem: {
      description: 'A steady mentor who explains the reason behind each next step.',
      name: 'Wise Golem',
      shortName: 'Golem',
      styles: ['wise', 'steady', 'reflective', 'practical'],
    },
  },
  ru: {
    ancient_totem: {
      description:
        '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439 \u043d\u0430\u0431\u043b\u044e\u0434\u0430\u0442\u0435\u043b\u044c, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0437\u0430\u043c\u0435\u0447\u0430\u0442\u044c \u043f\u0430\u0442\u0442\u0435\u0440\u043d\u044b \u0438 \u0432\u044b\u0431\u0438\u0440\u0430\u0442\u044c \u0444\u043e\u043a\u0443\u0441.',
      name: '\u0414\u0440\u0435\u0432\u043d\u0438\u0439 \u0442\u043e\u0442\u0435\u043c',
      shortName: '\u0422\u043e\u0442\u0435\u043c',
      styles: ['\u043d\u0430\u0431\u043b\u044e\u0434\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0439', '\u043a\u0440\u0430\u0442\u043a\u0438\u0439', '\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u043d\u044b\u0439', '\u0441\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439'],
    },
    calm_plant: {
      description:
        '\u041c\u044f\u0433\u043a\u0438\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0438\u0434\u0442\u0438 \u043c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u043c\u0438 \u0448\u0430\u0433\u0430\u043c\u0438 \u0431\u0435\u0437 \u0434\u0430\u0432\u043b\u0435\u043d\u0438\u044f.',
      name: '\u0421\u043f\u043e\u043a\u043e\u0439\u043d\u043e\u0435 \u0440\u0430\u0441\u0442\u0435\u043d\u0438\u0435',
      shortName: '\u0420\u0430\u0441\u0442\u0435\u043d\u0438\u0435',
      styles: ['\u0441\u043f\u043e\u043a\u043e\u0439\u043d\u044b\u0439', '\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0449\u0438\u0439', '\u043c\u044f\u0433\u043a\u0438\u0439', '\u0442\u0435\u0440\u043f\u0435\u043b\u0438\u0432\u044b\u0439'],
    },
    creative_terrarium: {
      description:
        '\u0413\u0438\u0431\u043a\u0438\u0439 \u0438 \u0442\u0432\u043e\u0440\u0447\u0435\u0441\u043a\u0438\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u0435\u0442 \u044d\u043a\u0441\u043f\u0435\u0440\u0438\u043c\u0435\u043d\u0442\u044b \u0438 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b.',
      name: '\u0422\u0432\u043e\u0440\u0447\u0435\u0441\u043a\u0438\u0439 \u0442\u0435\u0440\u0440\u0430\u0440\u0438\u0443\u043c',
      shortName: '\u0422\u0435\u0440\u0440\u0430\u0440\u0438\u0443\u043c',
      styles: ['\u0442\u0432\u043e\u0440\u0447\u0435\u0441\u043a\u0438\u0439', '\u044d\u043a\u0441\u043f\u0435\u0440\u0438\u043c\u0435\u043d\u0442\u0430\u043b\u044c\u043d\u044b\u0439', '\u043b\u044e\u0431\u043e\u043f\u044b\u0442\u043d\u044b\u0439', '\u0433\u0438\u0431\u043a\u0438\u0439'],
    },
    energetic_dragon: {
      description:
        '\u042d\u043d\u0435\u0440\u0433\u0438\u0447\u043d\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0431\u044b\u0441\u0442\u0440\u043e \u043d\u0430\u0447\u0430\u0442\u044c \u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u044c \u0442\u0435\u043c\u043f.',
      name: '\u042d\u043d\u0435\u0440\u0433\u0438\u0447\u043d\u044b\u0439 \u0434\u0440\u0430\u043a\u043e\u043d',
      shortName: '\u0414\u0440\u0430\u043a\u043e\u043d',
      styles: ['\u044d\u043d\u0435\u0440\u0433\u0438\u0447\u043d\u044b\u0439', '\u043c\u043e\u0442\u0438\u0432\u0438\u0440\u0443\u044e\u0449\u0438\u0439', '\u0434\u0435\u0439\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439', '\u0441\u043c\u0435\u043b\u044b\u0439'],
    },
    friendly_mushroom: {
      description:
        '\u0422\u0435\u043f\u043b\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0434\u0435\u043b\u0430\u0435\u0442 \u0441\u043b\u043e\u0436\u043d\u044b\u0435 \u0446\u0435\u043b\u0438 \u043f\u0440\u043e\u0449\u0435 \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u0442\u0430.',
      name: '\u0414\u0440\u0443\u0436\u0435\u043b\u044e\u0431\u043d\u044b\u0439 \u0433\u0440\u0438\u0431',
      shortName: '\u0413\u0440\u0438\u0431',
      styles: ['\u0434\u0440\u0443\u0436\u0435\u043b\u044e\u0431\u043d\u044b\u0439', '\u0442\u0435\u043f\u043b\u044b\u0439', '\u043f\u0440\u043e\u0441\u0442\u043e\u0439', '\u043e\u0431\u043e\u0434\u0440\u044f\u044e\u0449\u0438\u0439'],
    },
    mysterious_knight: {
      description:
        '\u0421\u043e\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0432\u0438\u0434\u0438\u0442 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043a\u0430\u043a \u043b\u0438\u0447\u043d\u044b\u0439 \u043a\u0432\u0435\u0441\u0442.',
      name: '\u0422\u0430\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0440\u044b\u0446\u0430\u0440\u044c',
      shortName: '\u0420\u044b\u0446\u0430\u0440\u044c',
      styles: ['\u0441\u0444\u043e\u043a\u0443\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439', '\u0441\u0434\u0435\u0440\u0436\u0430\u043d\u043d\u044b\u0439', '\u043d\u0430 \u0432\u044b\u0437\u043e\u0432', '\u0447\u0435\u0441\u0442\u043d\u044b\u0439'],
    },
    strict_robot: {
      description:
        '\u0427\u0435\u0442\u043a\u0438\u0439 \u0438 \u0434\u0438\u0441\u0446\u0438\u043f\u043b\u0438\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u043a, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u043b\u044e\u0431\u0438\u0442 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443 \u0438 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u0438\u043a\u0443.',
      name: '\u0421\u0442\u0440\u043e\u0433\u0438\u0439 \u0440\u043e\u0431\u043e\u0442',
      shortName: '\u0420\u043e\u0431\u043e\u0442',
      styles: ['\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u044b\u0439', '\u043f\u0440\u044f\u043c\u043e\u0439', '\u0434\u0438\u0441\u0446\u0438\u043f\u043b\u0438\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439', '\u0442\u043e\u0447\u043d\u044b\u0439'],
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
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}

export function MentorCharactersPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language];
  const [selectedCharacterId, setSelectedCharacterId] = useState<MentorCharacterId>(() =>
    getActiveMentorCharacterId(),
  );

  const handleSelect = (characterId: MentorCharacterId) => {
    setSelectedCharacterId(characterId);
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
