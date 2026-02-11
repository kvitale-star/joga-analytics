/**
 * Framework Loader Service
 * Loads US Soccer framework documents and club philosophy
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface USSFrameworkContext {
  licenseLevels: Record<string, string>; // D, C, B, A, Pro
  playerDevelopmentFrameworks: Record<string, string>; // 4v4, 7v7, 9v9, 11v11
  methodologies: Record<string, string>; // Play-Practice-Play, etc.
}

export interface ClubPhilosophy {
  playingStyle: string;
  trainingMethodology: string;
  clubValues: string;
  nonNegotiables: string[];
}

/**
 * Load all US Soccer framework documents
 */
export async function loadUSSFrameworks(): Promise<USSFrameworkContext> {
  const frameworksDir = path.join(__dirname, '../frameworks/us-soccer');

  const licenseLevels: Record<string, string> = {};
  const playerDevelopmentFrameworks: Record<string, string> = {};
  const methodologies: Record<string, string> = {};

  // Load license level documents
  const licenseFiles = [
    { level: 'D', file: 'coaching-license-d.md' },
    { level: 'C', file: 'coaching-license-c.md' },
  ];

  for (const { level, file } of licenseFiles) {
    const filePath = path.join(frameworksDir, file);
    if (fs.existsSync(filePath)) {
      licenseLevels[level] = fs.readFileSync(filePath, 'utf-8');
    }
  }

  // Load player development frameworks
  const devFrameworkFiles = [
    { format: '4v4', file: 'player-development-framework-4v4.md' },
    { format: '7v7', file: 'player-development-framework-7v7.md' },
    { format: '9v9', file: 'player-development-framework-9v9.md' },
    { format: '11v11', file: 'player-development-framework-11v11.md' },
  ];

  for (const { format, file } of devFrameworkFiles) {
    const filePath = path.join(frameworksDir, file);
    if (fs.existsSync(filePath)) {
      playerDevelopmentFrameworks[format] = fs.readFileSync(filePath, 'utf-8');
    }
  }

  // Load methodology documents
  const methodologyFiles = [
    { name: 'play-practice-play', file: 'play-practice-play-methodology.md' },
    { name: 'grassroots-training', file: 'grassroots-training-manual.md' },
    { name: 'grassroots-roadmap', file: 'grassroots-roadmap.md' },
    { name: 'what-is-ppp', file: 'what-is-play-practice-play.md' },
    { name: 'us-soccer-roadmaps', file: 'us-soccer-roadmaps.md' },
  ];

  for (const { name, file } of methodologyFiles) {
    const filePath = path.join(frameworksDir, file);
    if (fs.existsSync(filePath)) {
      methodologies[name] = fs.readFileSync(filePath, 'utf-8');
    }
  }

  return {
    licenseLevels,
    playerDevelopmentFrameworks,
    methodologies,
  };
}

/**
 * Load club philosophy documents
 * Returns default JOGA philosophy if files don't exist
 */
export async function loadClubPhilosophy(): Promise<ClubPhilosophy> {
  const clubDir = path.join(__dirname, '../frameworks/club');

  // Default JOGA philosophy (can be overridden by files)
  const defaultPhilosophy: ClubPhilosophy = {
    playingStyle: `JOGA emphasizes possession-based, attacking soccer with a focus on technical development and creative play. We prioritize building from the back, maintaining possession, and creating goal-scoring opportunities through patient build-up play.`,
    trainingMethodology: `Training follows the Play-Practice-Play model, emphasizing game-realistic scenarios and decision-making. Sessions are designed to be fun, engaging, and developmentally appropriate for each age group.`,
    clubValues: `JOGA values respect, teamwork, growth mindset, and love of the game. We prioritize player development over results, creating a positive learning environment where players can take risks and learn from mistakes.`,
    nonNegotiables: [
      'Possession-based, collective play - control the game through smart decision-making, not fixed patterns',
      'Game intelligence over scripts - read the field and make tactful decisions that become unconscious habits',
      'Context-driven flexibility - clear default tendencies with context driving exceptions',
      'Collective foundation - collectiveness, resilience under stress, ability to play without the ball',
      'Process over results - success measured by consistent improvement, resilience, and competitive mindset',
      'Respect for teammates, opponents, coaches, and officials',
      'Effort and commitment in training and matches',
      'Positive attitude and growth mindset',
      'Team-first mentality - play for something greater than yourself',
      'Smart decision-making and off-ball support must be recognized and valued',
    ],
  };

  // Try to load from files if they exist
  const playingStylePath = path.join(clubDir, 'joga-philosophy.md');
  const trainingMethodologyPath = path.join(clubDir, 'training-methodology.md');
  const clubValuesPath = path.join(clubDir, 'club-values.md');

  const playingStyle = fs.existsSync(playingStylePath)
    ? fs.readFileSync(playingStylePath, 'utf-8')
    : defaultPhilosophy.playingStyle;

  const trainingMethodology = fs.existsSync(trainingMethodologyPath)
    ? fs.readFileSync(trainingMethodologyPath, 'utf-8')
    : defaultPhilosophy.trainingMethodology;

  const clubValues = fs.existsSync(clubValuesPath)
    ? fs.readFileSync(clubValuesPath, 'utf-8')
    : defaultPhilosophy.clubValues;

  return {
    playingStyle,
    trainingMethodology,
    clubValues,
    nonNegotiables: defaultPhilosophy.nonNegotiables, // Keep as array for now
  };
}

/**
 * Get framework context for a specific age group/format
 */
export function getFrameworkForAgeGroup(
  frameworks: USSFrameworkContext,
  ageGroup: string
): {
  developmentFramework: string | null;
  recommendedLicenseLevel: string | null;
} {
  // Map age groups to formats
  const ageToFormat: Record<string, string> = {
    'U7': '4v4',
    'U8': '4v4',
    'U9': '7v7',
    'U10': '7v7',
    'U11': '9v9',
    'U12': '9v9',
    'U13': '11v11',
    'U14': '11v11',
    'U15': '11v11',
    'U16': '11v11',
    'U17': '11v11',
    'U18': '11v11',
    'U19': '11v11',
  };

  const format = ageToFormat[ageGroup] || '11v11';
  const developmentFramework = frameworks.playerDevelopmentFrameworks[format] || null;

  // Recommend license level based on age
  let recommendedLicenseLevel: string | null = null;
  if (['U7', 'U8', 'U9', 'U10'].includes(ageGroup)) {
    recommendedLicenseLevel = 'D'; // Grassroots
  } else if (['U11', 'U12', 'U13', 'U14'].includes(ageGroup)) {
    recommendedLicenseLevel = 'C'; // Youth
  } else {
    recommendedLicenseLevel = 'C'; // Youth/Adult
  }

  return {
    developmentFramework,
    recommendedLicenseLevel,
  };
}
