import type { ReactNode } from 'react';
import type { Card } from './cards';

export type GlyphCard = Extract<Card, '?' | 'COFFEE'>;

const VIEW_BOX = '0 0 240 240';

export function isGlyphCard(card: Card): card is GlyphCard {
  return card === '?' || card === 'COFFEE';
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEW_BOX}
      fill="none"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function QuestionMark() {
  return (
    <Glyph>
      <g strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="120" cy="201" rx="52" ry="8" fill="currentColor" opacity=".12" />
        <path
          d="M60 104c-9 16-10 38-2 53M179 111c8-15 8-30 1-44"
          stroke="currentColor"
          strokeWidth="3"
          opacity=".35"
        />
        <path
          d="M91 84c0-20 15-32 35-32 23 0 38 13 38 32 0 17-11 25-25 34-10 6-14 13-14 24"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="31"
          transform="translate(1 6)"
        />
        <path
          d="M86 79c0-20 15-32 35-32 23 0 38 13 38 32 0 17-11 25-25 34-10 6-14 13-14 24"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="30"
        />
        <path
          d="M86 79c0-20 15-32 35-32 23 0 38 13 38 32 0 17-11 25-25 34-10 6-14 13-14 24"
          stroke="var(--poker-body, #503079)"
          strokeWidth="22"
        />
        <path d="M86 72c3-13 15-21 30-21" stroke="var(--poker-soft, #DDD0F7)" strokeWidth="5" />
        <path d="M150 92c-4 7-11 12-20 18-9 6-13 13-14 21" stroke="currentColor" strokeWidth="5" />
        <circle cx="123" cy="179" r="16" fill="var(--poker-ink, #241438)" />
        <circle
          cx="120"
          cy="174"
          r="14"
          fill="var(--poker-body, #503079)"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="4"
        />
        <path d="M115 169a7 7 0 0 1 8-2" stroke="var(--poker-soft, #DDD0F7)" strokeWidth="4" />
        <path d="m184 143 6 10-6 10-6-10z" fill="currentColor" />
        <path d="M53 57v12m-6-6h12" stroke="currentColor" strokeWidth="3" />
        <circle cx="70" cy="181" r="3" fill="currentColor" opacity=".65" />
      </g>
    </Glyph>
  );
}

function CoffeeBreak() {
  return (
    <Glyph>
      <g strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="117" cy="194" rx="72" ry="10" fill="currentColor" opacity=".12" />
        <path d="M47 180c7 23 132 23 140 0" fill="var(--poker-shade, #39235D)" />
        <ellipse cx="117" cy="179" rx="70" ry="13" fill="var(--poker-soft, #DDD0F7)" />
        <path d="M65 181c27 10 76 10 103-1" stroke="currentColor" strokeWidth="4" opacity=".65" />
        <path
          d="M166 109h11c31 0 29 46-6 47h-8"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="18"
        />
        <path d="M168 109h9c24 0 23 39-7 39" stroke="var(--poker-soft, #DDD0F7)" strokeWidth="9" />
        <path
          d="M63 103h106l-7 53c-2 20-20 30-46 30s-44-10-46-30z"
          fill="var(--poker-body, #503079)"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="4"
        />
        <path
          d="m132 111 30-1-6 44c-2 15-13 23-29 25 10-13 9-41 5-68Z"
          fill="var(--poker-shade, #39235D)"
        />
        <path
          d="m78 122 4 29c1 7 5 12 11 15"
          stroke="var(--poker-soft, #DDD0F7)"
          strokeWidth="6"
          opacity=".85"
        />
        <ellipse
          cx="116"
          cy="104"
          rx="53"
          ry="14"
          fill="var(--poker-soft, #DDD0F7)"
          stroke="var(--poker-ink, #241438)"
          strokeWidth="4"
        />
        <ellipse cx="116" cy="105" rx="42" ry="8" fill="var(--poker-ink, #241438)" />
        <path d="M90 105c12-5 32-5 45-1" stroke="currentColor" strokeWidth="3" opacity=".9" />
        <path
          d="M93 79c-15-16 14-21 2-39M119 75c-13-14 14-23 2-42M143 81c-12-12 11-18 5-31"
          stroke="currentColor"
          strokeWidth="6"
        />
        <path d="M49 66v12m-6-6h12" stroke="currentColor" strokeWidth="3" />
        <path d="m182 69 5 8-5 8-5-8z" fill="currentColor" />
        <circle cx="43" cy="135" r="3" fill="currentColor" opacity=".65" />
      </g>
    </Glyph>
  );
}

export function CardGlyph({ card }: { card: GlyphCard }) {
  return card === '?' ? <QuestionMark /> : <CoffeeBreak />;
}
