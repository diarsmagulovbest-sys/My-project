import { useEffect, useMemo, useRef, useState } from 'react';

export type ProgressiveFluxPhase = {
  at: number;
  label: string;
};

type ProgressiveFluxLoaderProps = {
  className?: string;
  duration?: number;
  phases?: ProgressiveFluxPhase[];
  showLabel?: boolean;
  value?: number;
};

const defaultPhases: ProgressiveFluxPhase[] = [
  { at: 0, label: 'starting up' },
  { at: 25, label: 'loading assets' },
  { at: 55, label: 'preparing magic' },
  { at: 80, label: 'almost there' },
  { at: 100, label: 'all done' },
];

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function pickLabel(value: number, phases: ProgressiveFluxPhase[]) {
  let active = phases[0]?.label ?? '';

  for (const phase of phases) {
    if (value >= phase.at) {
      active = phase.label;
    }
  }

  return active;
}

export function ProgressiveFluxLoader({
  className = '',
  duration = 12,
  phases = defaultPhases,
  showLabel = true,
  value,
}: ProgressiveFluxLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const isControlled = typeof value === 'number';

  useEffect(() => {
    if (isControlled) {
      return undefined;
    }

    let animationFrame = 0;
    const totalMs = Math.max(500, duration * 1000);

    const tick = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const nextProgress = (elapsed / totalMs) * 100;

      if (nextProgress >= 100) {
        startTimeRef.current = timestamp;
        setInternalProgress(0);
      } else {
        setInternalProgress(nextProgress);
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, isControlled]);

  const sortedPhases = useMemo(
    () => [...phases].sort((first, second) => first.at - second.at),
    [phases],
  );
  const progress = clampProgress(isControlled ? value ?? 0 : internalProgress);
  const label = pickLabel(progress, sortedPhases);
  const roundedProgress = Math.round(progress);

  return (
    <div
      className={['progressive-flux-loader', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}
      aria-valuetext={label ? `${roundedProgress}% - ${label}` : `${roundedProgress}%`}
    >
      {showLabel ? (
        <div className="progressive-flux-label" aria-hidden="true" key={label}>
          {label.split('').map((letter, index) => (
            <span key={`${label}-${index}`}>{letter === ' ' ? '\u00a0' : letter}</span>
          ))}
        </div>
      ) : null}

      <div className="progressive-flux-track">
        <div className="progressive-flux-fill" style={{ width: `${progress}%` }}>
          <span />
        </div>
      </div>
    </div>
  );
}
