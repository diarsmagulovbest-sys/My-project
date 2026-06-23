type EmojiTokenProps = {
  className?: string;
  label: string;
  symbol: string;
  tone?: 'accent' | 'blue' | 'pink';
};

export function EmojiToken({ className = '', label, symbol, tone = 'accent' }: EmojiTokenProps) {
  const classNames = ['emoji-token', `emoji-token-${tone}`, className].filter(Boolean).join(' ');

  return (
    <span aria-label={label} className={classNames} role="img">
      <span aria-hidden="true">{symbol}</span>
    </span>
  );
}
