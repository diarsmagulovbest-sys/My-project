type CaseId = 'cargo' | 'customs' | 'captain' | 'legendary';

const roofLines = Array.from({ length: 7 }, (_, index) => index);
const frontBars = Array.from({ length: 6 }, (_, index) => index);

type CaseModel2DProps = {
  caseId: CaseId;
  onOpen: () => void;
  compact?: boolean;
  title?: string;
  price?: string;
};

const caseLabelMap: Record<CaseId, string> = {
  cargo: 'GL',
  customs: 'AP',
  captain: 'CP',
  legendary: 'LT',
};

export default function CaseModel2D({
  caseId,
  onOpen,
  compact = false,
  title = 'Cargo Case',
  price = 'FREE',
}: CaseModel2DProps) {
  return (
    <main className={compact ? 'store-page compact-page' : 'store-page'}>
      <article
        className={compact ? `item-card compact-card case-${caseId}` : `item-card case-${caseId}`}
        aria-label={`${title} item card`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className={`case-icon case-icon-${caseId}`}>
          <div className="icon-glow" />
          <div className="case-lid">
            {roofLines.map((line) => (
              <span className="roof-line" key={line} />
            ))}
            <span className="top-lock lock-one" />
            <span className="top-lock lock-two" />
          </div>
          <div className={`loot-items preview-items preview-${caseId}`} aria-hidden="true">
            <span className="loot-item preview-item-one" />
            <span className="loot-item preview-item-two" />
            <span className="loot-item preview-item-three" />
            <span className="loot-item preview-item-four" />
          </div>
          <div className="case-body">
            {frontBars.map((bar) => (
              <span className="front-bar" key={bar} />
            ))}
            <span className="case-label">{caseLabelMap[caseId]}</span>
            <span className="case-warning">!</span>
          </div>
          <div className="case-side">
            <span />
            <span />
            <span />
          </div>
          <span className="corner c1" />
          <span className="corner c2" />
          <span className="corner c3" />
          <span className="corner c4" />
          <span className="base-light" />
        </div>

        <h1>{title}</h1>
        <p>{price}</p>
      </article>
    </main>
  );
}
