import { CREDIT_GLYPH } from "@/lib/credits";
import { cn } from "@/lib/utils";
import { Fragment, type ReactNode } from "react";

type CreditGlyphProps = {
  className?: string;
  onDark?: boolean;
};

export function CreditGlyph({ className, onDark = false }: CreditGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("credit-glyph", onDark && "credit-glyph--on-dark", className)}
      aria-hidden
    >
      <polygon
        className="credit-glyph__hex"
        points="6.2,3.55 17.8,3.55 22.25,12 17.8,20.45 6.2,20.45 1.75,12"
        strokeWidth="2.55"
        strokeLinejoin="round"
      />
      <polygon
        className="credit-glyph__star"
        points="12,6.85 13.44,10.2 17.05,10.52 14.32,12.9 15.12,16.45 12,14.62 8.88,16.45 9.68,12.9 6.95,10.52 10.56,10.2"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function withCreditGlyphs(text: string, onDark = false): ReactNode {
  if (!text.includes(CREDIT_GLYPH)) return text;
  const parts = text.split(CREDIT_GLYPH);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <CreditGlyph onDark={onDark} /> : null}
    </Fragment>
  ));
}
