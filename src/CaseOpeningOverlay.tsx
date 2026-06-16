import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CASE_OPENING_CONFIG } from './caseOpeningConfig';

type LootItem = {
  id: string;
  name: string;
  chance: string;
};

type ReelItem = LootItem & {
  reelKey: string;
};

type CaseOpeningOverlayProps = {
  caseName: string;
  items: LootItem[];
  onClose: () => void;
};

const easingMap = {
  easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
};

function weightedPick(items: LootItem[]) {
  const weighted = items.map((item) => ({
    item,
    weight: Number.parseFloat(item.chance.replace('%', '')),
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = Math.random() * totalWeight;
  let cursor = 0;

  for (const entry of weighted) {
    cursor += entry.weight;
    if (roll <= cursor) {
      return entry.item;
    }
  }

  return items[0];
}

function buildReelItems(items: LootItem[], winner: LootItem) {
  const config = CASE_OPENING_CONFIG;
  const span = config.CARD_WIDTH_PX + config.CARD_SPACING_PX;
  const viewportWidth =
    config.VISIBLE_CARD_COUNT * config.CARD_WIDTH_PX +
    (config.VISIBLE_CARD_COUNT - 1) * config.CARD_SPACING_PX;
  const indicatorCenter =
    config.WINNING_ITEM_POSITION * span + config.CARD_WIDTH_PX / 2;
  const desiredDistance =
    (config.SCROLL_SPEED_PX_PER_SEC * config.ANIMATION_DURATION_MS) / 1000;

  const winnerIndex = Math.max(
    config.VISIBLE_CARD_COUNT + 8,
    Math.round((desiredDistance + indicatorCenter - config.CARD_WIDTH_PX / 2) / span),
  );
  const totalItems = winnerIndex + config.VISIBLE_CARD_COUNT + 4;

  const reelItems: ReelItem[] = Array.from({ length: totalItems }, (_, index) => {
    const item = items[index % items.length];
    return { ...item, reelKey: `${item.id}-${index}` };
  });

  reelItems[winnerIndex] = { ...winner, reelKey: `${winner.id}-winner` };

  const stopOffset = winnerIndex * span - (indicatorCenter - config.CARD_WIDTH_PX / 2);

  return {
    reelItems,
    winner,
    stopOffset,
    viewportWidth,
    indicatorCenter,
  };
}

export default function CaseOpeningOverlay({
  caseName,
  items,
  onClose,
}: CaseOpeningOverlayProps) {
  const winner = useMemo(() => weightedPick(items), [items]);
  const { reelItems, stopOffset, viewportWidth, indicatorCenter } = useMemo(
    () => buildReelItems(items, winner),
    [items, winner],
  );
  const [offset, setOffset] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const config = CASE_OPENING_CONFIG;
    const easing = easingMap[config.EASING_TYPE];
    const spinDistance = stopOffset - config.BOUNCE_AMOUNT_PX;
    const accelMs = config.ANIMATION_DURATION_MS * config.ACCELERATION_RATIO;
    const decelMs = config.ANIMATION_DURATION_MS * config.DECELERATION_RATIO;
    const cruiseMs = Math.max(0, config.ANIMATION_DURATION_MS - accelMs - decelMs);

    const accelDistance = spinDistance * 0.08;
    const decelDistance = spinDistance * 0.34;
    const cruiseDistance = spinDistance - accelDistance - decelDistance;

    let frameId = 0;
    let bounceFrameId = 0;
    const startTime = performance.now();

    const runBounce = () => {
      const bounceStart = performance.now();

      const animateBounce = (now: number) => {
        const elapsed = now - bounceStart;
        const progress = Math.min(elapsed / config.BOUNCE_DURATION_MS, 1);
        const overshoot = Math.sin(progress * Math.PI) * config.BOUNCE_AMOUNT_PX * 0.35;
        const eased = easing(progress);
        const bounceOffset =
          spinDistance + config.BOUNCE_AMOUNT_PX * eased + overshoot * (1 - progress);

        setOffset(bounceOffset);

        if (progress < 1) {
          bounceFrameId = requestAnimationFrame(animateBounce);
          return;
        }

        setOffset(stopOffset);
        setIsFinished(true);
      };

      bounceFrameId = requestAnimationFrame(animateBounce);
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;

      if (elapsed < accelMs) {
        const progress = accelMs === 0 ? 1 : elapsed / accelMs;
        setOffset(accelDistance * Math.pow(progress, 2));
        frameId = requestAnimationFrame(animate);
        return;
      }

      if (elapsed < accelMs + cruiseMs) {
        const progress = cruiseMs === 0 ? 1 : (elapsed - accelMs) / cruiseMs;
        setOffset(accelDistance + cruiseDistance * progress);
        frameId = requestAnimationFrame(animate);
        return;
      }

      if (elapsed < config.ANIMATION_DURATION_MS) {
        const progress =
          decelMs === 0 ? 1 : (elapsed - accelMs - cruiseMs) / decelMs;
        setOffset(accelDistance + cruiseDistance + decelDistance * easing(progress));
        frameId = requestAnimationFrame(animate);
        return;
      }

      setOffset(spinDistance);
      runBounce();
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(bounceFrameId);
    };
  }, [stopOffset]);

  return (
    <div className="opening-overlay" role="dialog" aria-modal="true" aria-label={`${caseName} opening`}>
      <div
        className="opening-panel"
        style={
          {
            '--reel-card-width': `${CASE_OPENING_CONFIG.CARD_WIDTH_PX}px`,
            '--reel-card-gap': `${CASE_OPENING_CONFIG.CARD_SPACING_PX}px`,
          } as CSSProperties
        }
      >
        <div className="opening-header">
          <span>{caseName}</span>
          {isFinished ? (
            <button type="button" className="overlay-close overlay-claim" onClick={onClose}>
              Claim
            </button>
          ) : null}
        </div>

        <div className="reel-shell">
          <div className="reel-viewport" style={{ width: `${viewportWidth}px` }}>
            <div className="reel-track" style={{ transform: `translate3d(${-offset}px, 0, 0)` }}>
              {reelItems.map((item) => (
                <div className="reel-card" key={item.reelKey}>
                  <div className={`loot-icon loot-${item.id}`} aria-hidden="true" />
                  <span>{item.name}</span>
                  <strong>{item.chance}</strong>
                </div>
              ))}
            </div>
            <div className="reel-stripe" style={{ left: `${indicatorCenter}px` }} />
            <div className="reel-marker" style={{ left: `${indicatorCenter}px` }} />
          </div>
        </div>

        <div className={`reward-reveal${isFinished ? ' reward-reveal-visible' : ''}`}>
          <div className="reward-card">
            <div className={`loot-icon loot-${winner.id}`} aria-hidden="true" />
            <strong>{winner.name}</strong>
            <span>{winner.chance}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
