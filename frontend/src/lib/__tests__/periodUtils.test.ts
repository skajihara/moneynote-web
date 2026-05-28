import { getPeriodRange, prevYearMonth, nextYearMonth, getCurrentYearMonth } from '../periodUtils';

describe('getPeriodRange', () => {
  it('returns calendar month when startDayOfMonth is 1', () => {
    const result = getPeriodRange(2026, 5, 1);
    expect(result.from).toEqual(new Date(2026, 4, 1));
    expect(result.to).toEqual(new Date(2026, 4, 31));
    expect(result.label).toBe('2026年5月');
  });

  it('returns calendar month when startDayOfMonth is <= 1', () => {
    const result = getPeriodRange(2026, 2, 0);
    expect(result.from).toEqual(new Date(2026, 1, 1));
    expect(result.label).toBe('2026年2月');
  });

  it('calculates cross-month period when startDayOfMonth > 1', () => {
    const result = getPeriodRange(2026, 4, 25);
    expect(result.from).toEqual(new Date(2026, 2, 25));
    expect(result.to).toEqual(new Date(2026, 3, 24));
    expect(result.label).toContain('2026年4月');
    expect(result.label).toContain('3/25');
    expect(result.label).toContain('4/24');
  });

  it('handles January boundary (month=1, startDayOfMonth > 1)', () => {
    const result = getPeriodRange(2026, 1, 25);
    expect(result.from).toEqual(new Date(2025, 11, 25));
    expect(result.to).toEqual(new Date(2026, 0, 24));
  });

  it('clamps startDay to end of month', () => {
    const result = getPeriodRange(2026, 3, 31);
    expect(result.from.getDate()).toBeLessThanOrEqual(28);
  });
});

describe('prevYearMonth', () => {
  it('returns previous month in same year', () => {
    expect(prevYearMonth(2026, 5)).toEqual({ year: 2026, month: 4 });
  });

  it('wraps to December of previous year when month is January', () => {
    expect(prevYearMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('nextYearMonth', () => {
  it('returns next month in same year', () => {
    expect(nextYearMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });

  it('wraps to January of next year when month is December', () => {
    expect(nextYearMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });
});

describe('getCurrentYearMonth', () => {
  it('returns current year and month when startDayOfMonth is 1', () => {
    const today = new Date();
    const result = getCurrentYearMonth(1);
    expect(result.year).toBe(today.getFullYear());
    expect(result.month).toBe(today.getMonth() + 1);
  });

  it('returns current month when today date >= startDayOfMonth', () => {
    const today = new Date();
    const startDay = 1;
    const result = getCurrentYearMonth(startDay);
    expect(result.year).toBe(today.getFullYear());
    expect(result.month).toBe(today.getMonth() + 1);
  });

  it('returns previous month when today is before startDayOfMonth', () => {
    const today = new Date();
    const startDay = today.getDate() + 1;
    if (startDay <= 28) {
      const result = getCurrentYearMonth(startDay);
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      expect(result.year).toBe(prev.getFullYear());
      expect(result.month).toBe(prev.getMonth() + 1);
    }
  });
});
