// ISO 13616 IBAN format + mod-97 checksum, and ISO 9362 BIC/SWIFT format. A malformed value
// here causes a real payment failure once it's in a bank batch file, so this is checked
// server-side before any row is allowed into an export.

const IBAN_FORMAT_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export function isValidIban(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!IBAN_FORMAT_RE.test(iban)) return false;
  return mod97Checksum(iban) === 1;
}

export function isValidBic(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return BIC_RE.test(raw.replace(/\s+/g, '').toUpperCase());
}

// Move the first 4 characters to the end, convert letters to numbers (A=10..Z=35), then
// compute the numeric string mod 97 — a valid IBAN checksum always reduces to 1.
function mod97Checksum(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(String(remainder) + numeric.slice(i, i + 7)) % 97;
  }
  return remainder;
}
