/**
 * Builds a RegExp that matches a money amount inside table-cell text no matter
 * how the portal formats it: "2000", "2,000", "2000.00", "৳2,000.00", "2000 Tk"...
 * It will NOT match inside a bigger number (so 500 does not match 1500 or 5000).
 */
export function amountPattern(amount: number): RegExp {
  const plain = String(amount);
  const withCommas = amount.toLocaleString('en-US');
  const variants = Array.from(new Set([plain, withCommas])).map((v) =>
    v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return new RegExp(`(?<![\\d,.])(?:${variants.join('|')})(?:\\.0+)?(?![\\d,])`);
}

/** Parses "1,500.00", "৳ 1500", "1500 BDT" -> 1500 */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.\-]/g, '');
  return parseFloat(cleaned);
}
