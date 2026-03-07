import { computeMatchStats, normalizeFieldNames, RawMatchStats } from '../services/matchStatsService.js';

describe('matchStatsService', () => {
  // ---------------------------------------------------------------------------
  // computeMatchStats - TSR
  // ---------------------------------------------------------------------------
  describe('TSR (Total Shots Ratio)', () => {
    it('computes TSR from half stats', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 1, shotsFor1stHalf: 4,   // 5 total attempts for
        goalsAgainst1stHalf: 0, shotsAgainst1stHalf: 5, // 5 total attempts against
        goalsFor2ndHalf: 0, shotsFor2ndHalf: 1,   // 1 more for
        goalsAgainst2ndHalf: 1, shotsAgainst2ndHalf: 4, // 5 more against
      });
      // totalAttemptsFor = 6, totalAttemptsAgainst = 10, total = 16
      expect(result.tsr).toBeCloseTo((6 / 16) * 100, 5);
      expect(result['opp tsr']).toBeCloseTo((10 / 16) * 100, 5);
    });

    it('TSR + opp TSR sum to 100', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 2, shotsFor1stHalf: 3,
        goalsAgainst1stHalf: 1, shotsAgainst1stHalf: 7,
      });
      expect((result.tsr ?? 0) + (result['opp tsr'] ?? 0)).toBeCloseTo(100, 5);
    });

    it('returns no TSR when both sides have zero attempts', () => {
      const result = computeMatchStats({ opponentName: 'Opp', matchDate: '2024-01-01' });
      expect(result.tsr).toBeUndefined();
      expect(result['opp tsr']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Conversion Rate
  // ---------------------------------------------------------------------------
  describe('Conversion Rate', () => {
    it('computes conversion rate from half stats', () => {
      // 2 goals, 8 total attempts
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 1, shotsFor1stHalf: 3,
        goalsFor2ndHalf: 1, shotsFor2ndHalf: 3,
        goalsAgainst1stHalf: 0, shotsAgainst1stHalf: 5,
      });
      // goalsFor=2, totalAttemptsFor=8 → 25%
      expect(result['conversion rate']).toBeCloseTo(25, 5);
    });

    it('returns undefined conversion rate when no attempts', () => {
      const result = computeMatchStats({ opponentName: 'Opp', matchDate: '2024-01-01' });
      expect(result['conversion rate']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Pass Share
  // ---------------------------------------------------------------------------
  describe('Pass Share', () => {
    it('computes pass share from direct fields', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        passesFor: 300,
        passesAgainst: 200,
      });
      expect(result['pass share']).toBeCloseTo(60, 5);
      expect(result['opp pass share']).toBeCloseTo(40, 5);
    });

    it('computes pass share from half stats', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        passesFor1stHalf: 150,
        passesFor2ndHalf: 150,
        passesAgainst1stHalf: 100,
        passesAgainst2ndHalf: 100,
      });
      expect(result['pass share']).toBeCloseTo(60, 5);
    });

    it('pass share + opp pass share sum to 100', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        passesFor: 123,
        passesAgainst: 456,
      });
      expect((result['pass share'] ?? 0) + (result['opp pass share'] ?? 0)).toBeCloseTo(100, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - PPM
  // ---------------------------------------------------------------------------
  describe('PPM (Passes Per Minute)', () => {
    it('computes ppm from possession minutes', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        passesFor: 300,
        possessionMins: 50,
        passesAgainst: 200,
        oppPossessionMins: 40,
      });
      expect(result.ppm).toBeCloseTo(6, 5);
      expect(result['opp ppm']).toBeCloseTo(5, 5);
    });

    it('returns undefined ppm when possession minutes not provided', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        passesFor: 300,
      });
      expect(result.ppm).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Box Attempts %
  // ---------------------------------------------------------------------------
  describe('Inside/Outside Box Attempts %', () => {
    it('computes outside box as 100 - inside', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        insideBoxAttempts: 70,
        oppInsideBoxAttempts: 55,
      });
      expect(result['inside box attempts %']).toBe(70);
      expect(result['outside box attempts %']).toBe(30);
      expect(result['opp inside box attempts %']).toBe(55);
      expect(result['opp outside box attempts %']).toBe(45);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Result
  // ---------------------------------------------------------------------------
  describe('Result computation', () => {
    it('returns Win when goalsFor > goalsAgainst', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 2, goalsAgainst1stHalf: 1,
      });
      expect(result.result).toBe('Win');
    });

    it('returns Loss when goalsFor < goalsAgainst', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 0, goalsAgainst1stHalf: 3,
      });
      expect(result.result).toBe('Loss');
    });

    it('returns Draw when goalsFor === goalsAgainst', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 1, goalsAgainst1stHalf: 1,
      });
      expect(result.result).toBe('Draw');
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Half-to-full aggregation
  // ---------------------------------------------------------------------------
  describe('Half-to-full aggregation', () => {
    it('sums 1st + 2nd half goals into full game total', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 2,
        goalsFor2ndHalf: 3,
        goalsAgainst1stHalf: 1,
        goalsAgainst2ndHalf: 0,
      });
      expect(result.goalsFor).toBe(5);
      expect(result.goalsAgainst).toBe(1);
    });

    it('falls back to direct field when no half stats', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor: 3,
        goalsAgainst: 2,
      });
      expect(result.goalsFor).toBe(3);
    });

    it('prefers half stats over direct field when halves are non-zero', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 1,
        goalsFor2ndHalf: 1,
        goalsFor: 99, // should be ignored
      });
      expect(result.goalsFor).toBe(2);
    });

    it('computes total attempts per half', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        goalsFor1stHalf: 1, shotsFor1stHalf: 4,
        goalsFor2ndHalf: 2, shotsFor2ndHalf: 3,
        goalsAgainst1stHalf: 0, shotsAgainst1stHalf: 2,
        goalsAgainst2ndHalf: 1, shotsAgainst2ndHalf: 4,
      });
      expect(result['total attempts (1st half)']).toBe(5);
      expect(result['total attempts (2nd half)']).toBe(5);
      expect(result['total attempts']).toBe(10);
      expect(result['opp total attempts (1st half)']).toBe(2);
      expect(result['opp total attempts (2nd half)']).toBe(5);
      expect(result['opp total attempts']).toBe(7);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - LPC
  // ---------------------------------------------------------------------------
  describe('LPC (Longest Pass Chain)', () => {
    it('returns highest non-zero pass string length', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 5,
        '6-pass string': 2,
        '8-pass string': 1,
        '9-pass string': 0,
        '10-pass string': 0,
        passesFor: 100,
      });
      expect(result['lpc avg']).toBe(8);
    });

    it('returns undefined when no pass strings have values', () => {
      const result = computeMatchStats({ opponentName: 'Opp', matchDate: '2024-01-01' });
      expect(result['lpc avg']).toBeUndefined();
    });

    it('handles string zero values gracefully', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': '0',
        '4-pass string': '0',
      } as unknown as RawMatchStats);
      expect(result['lpc avg']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Pass String Aggregates
  // ---------------------------------------------------------------------------
  describe('Pass String Aggregates', () => {
    it('computes pass strings (3-5)', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 5,
        '4-pass string': 3,
        '5-pass string': 2,
        '6-pass string': 1,
        passesFor: 200,
      });
      expect(result['pass strings (3-5)']).toBe(10);
    });

    it('computes pass strings (6+)', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '6-pass string': 2,
        '7-pass string': 1,
        '8-pass string': 3,
        passesFor: 200,
      });
      expect(result['pass strings (6+)']).toBe(6);
    });

    it('computes pass strings <4 (only 3-pass)', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 7,
        '4-pass string': 3,
        passesFor: 200,
      });
      expect(result['pass strings <4']).toBe(7);
    });

    it('computes pass strings 4+', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 7,
        '4-pass string': 3,
        '5-pass string': 2,
        '6-pass string': 1,
        passesFor: 200,
      });
      expect(result['pass strings 4+']).toBe(6);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - SPI
  // ---------------------------------------------------------------------------
  describe('SPI (Sustained Passing Index)', () => {
    it('computes SPI correctly', () => {
      // 5 3-pass strings = 15 passes, 3 5-pass strings = 15 passes → 30 in strings / 150 total = 20%
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 5,
        '5-pass string': 3,
        passesFor: 150,
      });
      expect(result.spi).toBeCloseTo(20, 5);
    });

    it('returns undefined SPI when no passes', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 5,
      });
      expect(result.spi).toBeUndefined();
    });

    it('uses half passes when direct passesFor not provided', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 10, // 30 passes in strings
        passesFor1stHalf: 75,
        passesFor2ndHalf: 75, // 150 total
      });
      expect(result.spi).toBeCloseTo(20, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Weighted SPI
  // ---------------------------------------------------------------------------
  describe('SPI (w) - Weighted SPI', () => {
    it('computes weighted SPI with 15% bonus per pass over 3', () => {
      // 3 3-pass strings → 9 passes × 1.0 = 9
      // 4 5-pass strings → 20 passes × 1.30 = 26
      // 2 6-pass strings → 12 passes × 1.45 = 17.4
      // weightedSum = 52.4, total = 150
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 3,
        '5-pass string': 4,
        '6-pass string': 2,
        passesFor: 150,
      });
      const expectedWeighted = ((3 * 3 * 1.0) + (5 * 4 * 1.30) + (6 * 2 * 1.45)) / 150 * 100;
      expect(result['spi (w)']).toBeCloseTo(expectedWeighted, 4);
    });

    it('3-pass strings have no bonus (multiplier 1.0)', () => {
      // Pure 3-pass strings: weighted = unweighted
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 10, // 30 passes, multiplier 1.0
        passesFor: 100,
      });
      expect(result['spi (w)']).toBeCloseTo(result.spi ?? 0, 5);
    });

    it('higher pass strings yield higher weighted SPI than unweighted', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        '3-pass string': 5,
        '10-pass string': 2, // multiplier = 1 + (7 * 0.15) = 2.05
        passesFor: 100,
      });
      expect(result['spi (w)'] ?? 0).toBeGreaterThan(result.spi ?? 0);
    });
  });

  // ---------------------------------------------------------------------------
  // computeMatchStats - Possession Zone
  // ---------------------------------------------------------------------------
  describe('Possession Zone', () => {
    it('passes through zone possession values', () => {
      const result = computeMatchStats({
        opponentName: 'Opp',
        matchDate: '2024-01-01',
        possessionDef: 30,
        possessionMid: 45,
        possessionAtt: 25,
      });
      expect(result['possess % (def)']).toBe(30);
      expect(result['possess % (mid)']).toBe(45);
      expect(result['possess % (att)']).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // normalizeFieldNames
  // ---------------------------------------------------------------------------
  describe('normalizeFieldNames', () => {
    it('maps display names to camelCase fields', () => {
      const result = normalizeFieldNames({
        'Goals For': 3,
        'Shots Against': 5,
        'Passes For': 200,
      });
      expect(result.goalsFor).toBe(3);
      expect(result.shotsAgainst).toBe(5);
      expect(result.passesFor).toBe(200);
    });

    it('handles 1st half field names', () => {
      const result = normalizeFieldNames({
        'Goals For (1st half)': 2,
        'Shots Against (1st half)': 4,
      });
      expect(result.goalsFor1stHalf).toBe(2);
      expect(result.shotsAgainst1stHalf).toBe(4);
    });

    it('handles 2nd half field names', () => {
      const result = normalizeFieldNames({
        'Goals Against (2nd half)': 1,
        'Passes For (2nd half)': 80,
      });
      expect(result.goalsAgainst2ndHalf).toBe(1);
      expect(result.passesFor2ndHalf).toBe(80);
    });

    it('normalizes case-insensitively', () => {
      const result = normalizeFieldNames({ 'GOALS FOR': 5 });
      expect(result.goalsFor).toBe(5);
    });

    it('preserves pass string field names', () => {
      const result = normalizeFieldNames({ '3-pass string': 7, '6-pass string': 2 });
      expect(result['3-pass string']).toBe(7);
      expect(result['6-pass string']).toBe(2);
    });

    it('preserves unknown fields as-is', () => {
      const result = normalizeFieldNames({ customField: 'value' });
      expect((result as Record<string, unknown>).customField).toBe('value');
    });
  });
});
