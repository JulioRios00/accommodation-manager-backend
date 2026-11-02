import { bedroomLetterFromName, isInactiveBedroomLetter } from './bed-code.util';

describe('isInactiveBedroomLetter', () => {
  it('treats a Z bedroom as not lettable', () => {
    expect(isInactiveBedroomLetter('Z')).toBe(true);
    expect(isInactiveBedroomLetter('z')).toBe(true);
    expect(isInactiveBedroomLetter(' Z ')).toBe(true);
  });

  it('leaves every other bedroom alone', () => {
    for (const letter of ['A', 'B', 'C', 'Y', 'AA']) {
      expect(isInactiveBedroomLetter(letter)).toBe(false);
    }
  });

  // Historical rows carry no bedroom letter at all; they are ordinary beds, not inactive.
  it('does not treat a missing letter as inactive', () => {
    expect(isInactiveBedroomLetter(null)).toBe(false);
    expect(isInactiveBedroomLetter(undefined)).toBe(false);
    expect(isInactiveBedroomLetter('')).toBe(false);
  });

  it('reads the letter back out of an imported bedroom name', () => {
    expect(isInactiveBedroomLetter(bedroomLetterFromName('Bedroom Z'))).toBe(true);
    expect(isInactiveBedroomLetter(bedroomLetterFromName('Bedroom A'))).toBe(false);
  });
});
