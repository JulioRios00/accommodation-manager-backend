// Bedrooms created from an import are named "Bedroom X" (see import-xlsx.use-case.ts's
// ensureBedroom) — extract the letter back out for matching/display. Falls back to the full
// name for manually-created bedrooms that don't follow that convention.
export function bedroomLetterFromName(bedroomName: string | null | undefined): string | null {
  if (!bedroomName) return null;
  const m = bedroomName.match(/^Bedroom\s+(.+)$/i);
  return m ? m[1] : bedroomName;
}
