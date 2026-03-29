import { SESSION_YEAR_MIN, resolveSessionYearMax } from './session-year-range';

describe('session year range', () => {
  it('uses the current year when no override is provided', () => {
    expect(
      resolveSessionYearMax(undefined, new Date('2026-03-27T00:00:00Z')),
    ).toBe(2026);
  });

  it('accepts a valid override', () => {
    expect(resolveSessionYearMax('2030')).toBe(2030);
  });

  it('ignores invalid overrides', () => {
    expect(
      resolveSessionYearMax(
        String(SESSION_YEAR_MIN - 1),
        new Date('2026-03-27T00:00:00Z'),
      ),
    ).toBe(2026);
  });
});
