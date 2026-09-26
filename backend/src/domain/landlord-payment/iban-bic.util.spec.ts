import { isValidIban, isValidBic } from './iban-bic.util';

describe('isValidIban', () => {
  it.each([
    ['IE29AIBK93115212345678', 'IE'],
    ['IE29 AIBK 9311 5212 3456 78', 'IE with spaces'],
    ['DE89370400440532013000', 'DE'],
    ['GB29NWBK60161331926819', 'GB'],
  ])('accepts a valid IBAN (%s — %s)', (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ['IE29AIBK93115212345679', 'broken checksum'],
    ['NOTANIBAN', 'not IBAN-shaped at all'],
    ['IE29AIBK931152123', 'too short'],
    ['', 'empty string'],
    [null, 'null'],
    [undefined, 'undefined'],
  ])('rejects an invalid IBAN (%s — %s)', (iban) => {
    expect(isValidIban(iban as string | null | undefined)).toBe(false);
  });
});

describe('isValidBic', () => {
  it.each([
    ['AIBKIE2D', '8-char'],
    ['AIBKIE2DXXX', '11-char with branch code'],
    ['aibkie2d', 'lowercase (normalized)'],
  ])('accepts a valid BIC (%s — %s)', (bic) => {
    expect(isValidBic(bic)).toBe(true);
  });

  it.each([
    ['AIBK1E2D', 'digit in country code position'],
    ['AIBKIE2', 'too short'],
    ['', 'empty string'],
    [null, 'null'],
  ])('rejects an invalid BIC (%s — %s)', (bic) => {
    expect(isValidBic(bic as string | null)).toBe(false);
  });
});
