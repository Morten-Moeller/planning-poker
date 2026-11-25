import { cardName, cardSymbol } from './cards';
import type { Card } from './cards';

export function CardValue({
  card,
  className,
  testId,
}: {
  card: Card;
  className?: string;
  testId?: string;
}) {
  const name = cardName(card);
  if (name === null) {
    return (
      <span className={className} data-testid={testId}>
        {cardSymbol(card)}
      </span>
    );
  }
  return (
    <span className={className} data-testid={testId} role="img" aria-label={name}>
      {cardSymbol(card)}
    </span>
  );
}
