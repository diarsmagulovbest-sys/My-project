import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

export type ProgressiveFluxPhase = {
  at: number;
  label: string;
};

type ProgressiveFluxLoaderProps = {
  className?: string;
  duration?: number;
  loop?: boolean;
  onComplete?: () => void;
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
  loop = true,
  onComplete,
  phases = defaultPhases,
  showLabel = true,
  value,
}: ProgressiveFluxLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const isControlled = typeof value === 'number';

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isControlled) {
      return undefined;
    }

    let animationFrame = 0;
    let restartTimer = 0;
    let startTime: number | null = null;
    const totalMs = Math.max(500, duration * 1000);

    const tick = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const nextProgress = clampProgress((elapsed / totalMs) * 100);
      setInternalProgress(nextProgress);

      if (nextProgress >= 100) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }

        if (loop) {
          restartTimer = window.setTimeout(() => {
            startTime = null;
            completedRef.current = false;
            setInternalProgress(0);
            animationFrame = requestAnimationFrame(tick);
          }, 700);
        }

        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(restartTimer);
    };
  }, [duration, isControlled, loop]);

  const sortedPhases = useMemo(
    () => [...phases].sort((first, second) => first.at - second.at),
    [phases],
  );
  const progress = clampProgress(isControlled ? value ?? 0 : internalProgress);
  const label = pickLabel(progress, sortedPhases);
  const roundedProgress = Math.round(progress);
  const classNames = [
    'progressive-flux-loader',
    isControlled ? 'progressive-flux-loader-controlled' : 'progressive-flux-loader-uncontrolled',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const fillStyle: CSSProperties = isControlled
    ? { width: `${progress}%` }
    : { '--flux-duration': `${Math.max(500, duration * 1000)}ms` } as CSSProperties;

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    if (progress >= 100 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }

    if (progress < 100) {
      completedRef.current = false;
    }
  }, [isControlled, progress]);

  return (
    <div
      className={classNames}
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
        <div className="progressive-flux-fill" style={fillStyle}>
          <span />
        </div>
      </div>
    </div>
  );
}
