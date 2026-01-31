/**
 * Verification Script for Computed Match Statistics
 * 
 * This script allows you to test computed fields with sample data
 * to verify formulas are correct.
 * 
 * Usage:
 *   npm run verify-computed-fields
 *   or
 *   npx tsx src/scripts/verify-computed-fields.ts
 */

import { computeMatchStats, normalizeFieldNames } from '../services/matchStatsService.js';

// Sample test data - modify these values to test different scenarios
const sampleRawData = {
  // Game Info
  opponentName: 'Test Opponent',
  matchDate: '2024-01-15',
  competitionType: 'League',
  result: 'Win',
  matchDuration: 90, // minutes
  
  // 1st Half Stats
  goalsFor1stHalf: 2,
  goalsAgainst1stHalf: 0,
  shotsFor1stHalf: 8,
  shotsAgainst1stHalf: 3,
  attemptsFor1stHalf: 12,
  attemptsAgainst1stHalf: 5,
  passesFor1stHalf: 180,
  passesAgainst1stHalf: 120,
  
  // 2nd Half Stats
  goalsFor2ndHalf: 1,
  goalsAgainst2ndHalf: 1,
  shotsFor2ndHalf: 6,
  shotsAgainst2ndHalf: 4,
  attemptsFor2ndHalf: 10,
  attemptsAgainst2ndHalf: 6,
  passesFor2ndHalf: 200,
  passesAgainst2ndHalf: 150,
  
  // Attempts breakdown
  insideBoxAttempts: 15,
  outsideBoxAttempts: 7,
  oppInsideBoxAttempts: 8,
  oppOutsideBoxAttempts: 3,
  
  // Pass strings (for LPC and Pass Strings calculations)
  '3-pass string': 5,
  '4-pass string': 8,
  '5-pass string': 12,
  '6-pass string': 10,
  '7-pass string': 6,
  '8-pass string': 3,
  '9-pass string': 1,
  '10-pass string': 0,
  
  // Possession by zone (if manually entered)
  possessionDef: 35,
  possessionMid: 40,
  possessionAtt: 25,
};

/**
 * Calculate expected values manually for verification
 */
function calculateExpectedValues(raw: any) {
  // Full game stats (sum of halves)
  const goalsFor = (raw.goalsFor1stHalf || 0) + (raw.goalsFor2ndHalf || 0);
  const goalsAgainst = (raw.goalsAgainst1stHalf || 0) + (raw.goalsAgainst2ndHalf || 0);
  const shotsFor = (raw.shotsFor1stHalf || 0) + (raw.shotsFor2ndHalf || 0);
  const shotsAgainst = (raw.shotsAgainst1stHalf || 0) + (raw.shotsAgainst2ndHalf || 0);
  const attemptsFor = (raw.attemptsFor1stHalf || 0) + (raw.attemptsFor2ndHalf || 0);
  const attemptsAgainst = (raw.attemptsAgainst1stHalf || 0) + (raw.attemptsAgainst2ndHalf || 0);
  const passesFor = (raw.passesFor1stHalf || 0) + (raw.passesFor2ndHalf || 0);
  const passesAgainst = (raw.passesAgainst1stHalf || 0) + (raw.passesAgainst2ndHalf || 0);
  
  const expected = {
    // Full game stats
    goalsFor,
    goalsAgainst,
    shotsFor,
    shotsAgainst,
    attemptsFor,
    attemptsAgainst,
    passesFor,
    passesAgainst,
    
    // TSR
    tsr: shotsFor + shotsAgainst > 0 ? (shotsFor / (shotsFor + shotsAgainst)) * 100 : undefined,
    'opp tsr': shotsFor + shotsAgainst > 0 ? (shotsAgainst / (shotsFor + shotsAgainst)) * 100 : undefined,
    
    // Conversion Rate
    'conversion rate': shotsFor > 0 ? (goalsFor / shotsFor) * 100 : undefined,
    'opp conversion rate': shotsAgainst > 0 ? (goalsAgainst / shotsAgainst) * 100 : undefined,
    
    // Pass Share
    'pass share': passesFor + passesAgainst > 0 ? (passesFor / (passesFor + passesAgainst)) * 100 : undefined,
    'opp pass share': passesFor + passesAgainst > 0 ? (passesAgainst / (passesFor + passesAgainst)) * 100 : undefined,
    
    // PPM
    ppm: raw.matchDuration > 0 ? passesFor / raw.matchDuration : undefined,
    'opp ppm': raw.matchDuration > 0 ? passesAgainst / raw.matchDuration : undefined,
    
    // Attempts %
    'inside box attempts %': attemptsFor > 0 ? (raw.insideBoxAttempts / attemptsFor) * 100 : undefined,
    'outside box attempts %': attemptsFor > 0 ? (raw.outsideBoxAttempts / attemptsFor) * 100 : undefined,
    'opp inside box attempts %': attemptsAgainst > 0 ? (raw.oppInsideBoxAttempts / attemptsAgainst) * 100 : undefined,
    'opp outside box attempts %': attemptsAgainst > 0 ? (raw.oppOutsideBoxAttempts / attemptsAgainst) * 100 : undefined,
    
    // LPC (Longest Pass Chain) - highest pass string with value > 0
    'lpc avg': (() => {
      let maxLPC = 0;
      for (let i = 3; i <= 10; i++) {
        const fieldName = `${i}-pass string`;
        const value = raw[fieldName];
        if (value !== undefined && value !== null && value !== '' && Number(value) > 0) {
          maxLPC = Math.max(maxLPC, i);
        }
      }
      return maxLPC > 0 ? maxLPC : undefined;
    })(),
    
    // Pass Strings (3-5) - sum of 3, 4, 5 pass strings
    'pass strings (3-5)': (raw['3-pass string'] || 0) + (raw['4-pass string'] || 0) + (raw['5-pass string'] || 0),
    
    // Pass Strings (6+) - sum of 6, 7, 8, 9, 10 pass strings
    'pass strings (6+)': (raw['6-pass string'] || 0) + (raw['7-pass string'] || 0) + 
                         (raw['8-pass string'] || 0) + (raw['9-pass string'] || 0) + (raw['10-pass string'] || 0),
  };
  
  return expected;
}

/**
 * Compare computed values with expected values
 */
function compareValues(computed: any, expected: any, fieldName: string): { match: boolean; computed: any; expected: any; diff?: number } {
  const computedVal = computed[fieldName];
  const expectedVal = expected[fieldName];
  
  if (computedVal === undefined && expectedVal === undefined) {
    return { match: true, computed: undefined, expected: undefined };
  }
  
  if (computedVal === undefined || expectedVal === undefined) {
    return { match: false, computed: computedVal, expected: expectedVal };
  }
  
  // For numeric values, allow small floating point differences
  const diff = Math.abs(computedVal - expectedVal);
  const match = diff < 0.0001; // Allow for floating point precision
  
  return { match, computed: computedVal, expected: expectedVal, diff };
}

/**
 * Main verification function
 */
function verifyComputedFields() {
  console.log('🔍 Verifying Computed Match Statistics\n');
  console.log('=' .repeat(60));
  
  // Normalize field names (simulates form input)
  const normalized = normalizeFieldNames(sampleRawData);
  console.log('\n📥 Normalized Input Data:');
  console.log(JSON.stringify(normalized, null, 2));
  
  // Compute statistics
  const computed = computeMatchStats(normalized);
  console.log('\n📊 Computed Statistics:');
  console.log(JSON.stringify(computed, null, 2));
  
  // Calculate expected values manually
  const expected = calculateExpectedValues(sampleRawData);
  console.log('\n✅ Expected Values (Manual Calculation):');
  console.log(JSON.stringify(expected, null, 2));
  
  // Compare results
  console.log('\n🔬 Verification Results:');
  console.log('=' .repeat(60));
  
  const fieldsToCheck = [
    'goalsFor',
    'goalsAgainst',
    'shotsFor',
    'shotsAgainst',
    'attemptsFor',
    'attemptsAgainst',
    'passesFor',
    'passesAgainst',
    'tsr',
    'opp tsr',
    'conversion rate',
    'opp conversion rate',
    'pass share',
    'opp pass share',
    'ppm',
    'opp ppm',
    'inside box attempts %',
    'outside box attempts %',
    'opp inside box attempts %',
    'opp outside box attempts %',
    'lpc avg',
  ];
  
  let allMatch = true;
  fieldsToCheck.forEach(field => {
    const comparison = compareValues(computed, expected, field);
    const status = comparison.match ? '✅' : '❌';
    console.log(`${status} ${field}:`);
    console.log(`   Computed: ${comparison.computed}`);
    console.log(`   Expected: ${comparison.expected}`);
    if (comparison.diff !== undefined && !comparison.match) {
      console.log(`   Difference: ${comparison.diff}`);
    }
    console.log();
    
    if (!comparison.match) {
      allMatch = false;
    }
  });
  
  // Check for missing computations
  console.log('\n⚠️  Missing Computations:');
  const missingFields = [
    'pass strings (3-5)',
    'pass strings (6+)',
    'pass strings <4',
    'pass strings 4+',
    'spi',
    'spi (w)',
    'opp spi',
    'opp spi (w)',
  ];
  
  missingFields.forEach(field => {
    const computedAny = computed as any;
    if (computedAny[field] === undefined) {
      console.log(`   ❌ ${field} - NOT COMPUTED`);
    } else {
      console.log(`   ✅ ${field} - Computed: ${computedAny[field]}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (allMatch) {
    console.log('✅ All implemented computations match expected values!');
  } else {
    console.log('❌ Some computations do not match expected values. Please review.');
  }
  console.log('\n💡 To test with different values, edit sampleRawData in this file.');
}

// Run verification
verifyComputedFields();
