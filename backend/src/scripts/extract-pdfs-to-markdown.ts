/**
 * Extract PDFs from US Soccer Docs folder to markdown files
 * 
 * This script:
 * 1. Reads PDFs from docs/US Soccer Docs/
 * 2. Extracts text content
 * 3. Converts to markdown format
 * 4. Saves to backend/src/frameworks/us-soccer/
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
// pdf-parse exports PDFParse as a class
const PDFParse = pdfParseModule.PDFParse;

interface PDFFile {
  name: string;
  path: string;
  outputName: string;
  category: 'framework' | 'methodology' | 'session';
}

// Key PDFs to extract (prioritize framework documents)
const KEY_PDFS: PDFFile[] = [
  // Main framework documents
  {
    name: 'C-Course Player Development Framework.pdf',
    path: 'docs/US Soccer Docs/C-Course Player Development Framework.pdf',
    outputName: 'coaching-license-c.md',
    category: 'framework',
  },
  {
    name: 'u13-u19 11v11 Player Development Framework.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/Player Development Framework/11v11/u13-u19 11v11 Player Development Framework.pdf',
    outputName: 'player-development-framework-11v11.md',
    category: 'framework',
  },
  {
    name: 'u7_u8 us-soccer-player-development-framework-u7-u8-learning-plan.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/Player Development Framework/4v4/u7_u8 us-soccer-player-development-framework-u7-u8-learning-plan.pdf',
    outputName: 'player-development-framework-4v4.md',
    category: 'framework',
  },
  {
    name: 'u9_u10 us-soccer-player-development-framework-u9-u10-learning-plan.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/Player Development Framework/7v7/u9_u10 us-soccer-player-development-framework-u9-u10-learning-plan.pdf',
    outputName: 'player-development-framework-7v7.md',
    category: 'framework',
  },
  {
    name: 'u11_u12 us-soccer-player-development-framework-u11-u12-learning-plan.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/Player Development Framework/9v9/u11_u12 us-soccer-player-development-framework-u11-u12-learning-plan.pdf',
    outputName: 'player-development-framework-9v9.md',
    category: 'framework',
  },
  // Methodology documents
  {
    name: 'us-soccer-d-license-2020-resource-packet PPP methodolgy.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/us-soccer-d-license-2020-resource-packet PPP methodolgy.pdf',
    outputName: 'coaching-license-d.md',
    category: 'methodology',
  },
  {
    name: 'play-practice-play_model.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/PPP Documents/play-practice-play_model.pdf',
    outputName: 'play-practice-play-methodology.md',
    category: 'methodology',
  },
  {
    name: 'Grassroots TrainingSessionManualwithCoach_sToolKit.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/PPP Documents/Grassroots TrainingSessionManualwithCoach_sToolKit.pdf',
    outputName: 'grassroots-training-manual.md',
    category: 'methodology',
  },
  {
    name: 'grassroots-roadmap.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/PPP Documents/grassroots-roadmap.pdf',
    outputName: 'grassroots-roadmap.md',
    category: 'methodology',
  },
  {
    name: 'what-is-play-practice-play.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/PPP Documents/what-is-play-practice-play.pdf',
    outputName: 'what-is-play-practice-play.md',
    category: 'methodology',
  },
  {
    name: 'ROADMAPS USSF.pdf',
    path: 'docs/US Soccer Docs/US Soccer Methods/P-P-P/PPP Documents/ROADMAPS USSF.pdf',
    outputName: 'us-soccer-roadmaps.md',
    category: 'methodology',
  },
];

/**
 * Post-process extracted text to improve quality
 */
function postProcessText(text: string): string {
  // 0. CRITICAL: Fix joined words FIRST - before any other processing
  // These must happen first to catch all instances before whitespace normalization
  text = text.replace(/FRAMEWORKFUN/gi, 'FRAMEWORK FUN');
  text = text.replace(/FRAMEWORKBASIC/gi, 'FRAMEWORK BASIC');
  text = text.replace(/FRAMEWORKNEEDS/gi, 'FRAMEWORK NEEDS');
  
  // 1. Remove spaces between single letters (e.g., "U . S ." → "U.S.")
  // Handle "U . S ." patterns
  text = text.replace(/([A-Z])\s+\.\s+([A-Z])\s+\.\s+([A-Z])/g, '$1.$2.$3');
  text = text.replace(/([A-Z])\s+\.\s+([A-Z])/g, '$1.$2');
  
  // Fix broken words like "U.S.SOCC ERFE DERA TION" → "U.S. SOCCER FEDERATION"
  text = text.replace(/([A-Z])\s+([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})/g, (match, a, b, c, d) => {
    // If it looks like a broken word (short segments), join them
    if (b.length <= 5 && c.length <= 5 && d.length <= 5) {
      return `${a}${b}${c}${d}`;
    }
    return match;
  });
  
  // Fix patterns like "U.S.SOCC ERFE DERA TION"
  text = text.replace(/([A-Z]\.?[A-Z]?\.?)\s+([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})/g, (match, prefix, b, c, d) => {
    if (b.length <= 5 && c.length <= 5 && d.length <= 5) {
      return `${prefix} ${b}${c}${d}`;
    }
    return match;
  });
  
  // Fix address patterns like "1 8 0 1 S.PRAI RIEA V E ."
  text = text.replace(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g, '$1$2$3$4');
  text = text.replace(/([A-Z])\s+\.\s*([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z])\s+\./g, '$1.$2$3$4.');
  
  // Fix broken words more aggressively (2-3 letter segments)
  text = text.replace(/([A-Z]{1,3})\s+([A-Z]{1,3})\s+([A-Z]{1,3})\s+([A-Z]{1,3})/g, (match, a, b, c, d) => {
    // Only if total length is reasonable (likely a broken word)
    if (match.replace(/\s/g, '').length <= 15) {
      return `${a}${b}${c}${d}`;
    }
    return match;
  });
  
  // Fix specific broken word patterns
  text = text.replace(/SOCC\s+ERFE\s+DERA\s+TION/gi, 'SOCCER FEDERATION');
  text = text.replace(/YERD\s+EVEL\s+OPME\s+NTFR\s+AMEW\s+O\s+R\s+K/gi, 'PLAYER DEVELOPMENT FRAMEWORK');
  text = text.replace(/ERDE\s+VELO\s+PMEN\s+TFRA\s+MEWO\s+R\s+K/gi, 'PLAYER DEVELOPMENT FRAMEWORK');
  text = text.replace(/INTRODUCTIONPLA\s+PLAYER/gi, 'INTRODUCTION PLAYER');
  text = text.replace(/WHOISINFRONTOFUS/gi, 'WHO IS IN FRONT OF US');
  text = text.replace(/WHOISINFRONT\s+OF\s+US/gi, 'WHO IS IN FRONT OF US');
  text = text.replace(/THEGAME/gi, 'THE GAME');
  text = text.replace(/THE\s+GAMEFOCUSON/gi, 'THE GAME FOCUS ON');
  // Fix joined words at end of phrases
  text = text.replace(/FRAMEWORKFUN/gi, 'FRAMEWORK FUN');
  text = text.replace(/FRAMEWORKBASIC/gi, 'FRAMEWORK BASIC');
  text = text.replace(/FRAMEWORK\s+FUN/gi, 'FRAMEWORK FUN');
  text = text.replace(/FRAMEWORK\s+BASIC/gi, 'FRAMEWORK BASIC');
  text = text.replace(/APPROACHWHO/gi, 'APPROACH WHO');
  text = text.replace(/APPROACH\s+WHO/gi, 'APPROACH WHO');
  text = text.replace(/^##\s+PLAY\s+PLAYER\s+DEVELOPMENT\s+FRAMEWORK$/gm, '## PLAYER DEVELOPMENT FRAMEWORK');
  
  // More aggressive fix for common joined patterns
  text = text.replace(/([A-Z]+\s+[A-Z]+\s+[A-Z]+\s+[A-Z]+\s+FRAMEWORK)(FUN|BASIC|NEEDS)/gi, '$1 $2');
  text = text.replace(/(FRAMEWORK)(FUN|BASIC|NEEDS)/gi, '$1 $2');
  
  // Fix remaining FRAMEWORK joined words (catch any we missed)
  text = text.replace(/(FRAMEWORK)(FUN|BASIC|NEEDS)/gi, '$1 $2');
  text = text.replace(/(U\.S\.\s*Soccer\s*PLAYER\s*DEVELOPMENT\s*FRAMEWORK)([A-Z]+)/gi, '$1 $2');
  
  // Fix joined words (common patterns where words are concatenated)
  text = text.replace(/([A-Z]{4,})([A-Z]{4,})/g, (match, a, b) => {
    // Known word combinations that should be separated
    const knownWords = ['THE', 'GAME', 'FOCUS', 'ON', 'FRAMEWORK', 'FUN', 'BASIC', 'APPROACH', 'WHO', 'IS', 'IN', 'FRONT', 'OF', 'US'];
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();
    
    // Check if parts match known words
    for (const word of knownWords) {
      if (aUpper.endsWith(word) && knownWords.includes(bUpper.substring(0, 4))) {
        return `${a} ${b}`;
      }
      if (bUpper.startsWith(word) && knownWords.includes(aUpper.substring(aUpper.length - 4))) {
        return `${a} ${b}`;
      }
    }
    return match;
  });

  // 2. Remove page numbers and slide references
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '');
  text = text.replace(/Slide\s+#\d+/gi, '');
  text = text.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
  text = text.replace(/P\s*\d+/g, ''); // Remove "P2", "P3", etc.

  // 3. Remove copyright notices and boilerplate
  text = text.replace(/©\s*\d{4}[^\n]*CONFIDENTIAL[^\n]*/gi, '');
  text = text.replace(/©\s*\d{4}[^\n]*U\.S\.\s*Soccer[^\n]*/gi, '');
  text = text.replace(/Not to be shared[^\n]*/gi, '');
  text = text.replace(/U\.S\.\s*Soccer\s*Federation[^\n]*/gi, '');
  text = text.replace(/U\.S\.\s*SOCCER\s*FEDERATION/gi, 'U.S. SOCCER FEDERATION');

  // 4. Remove repeated headers/footers (common patterns)
  text = text.replace(/U\.S\.\s*Soccer\s*Player\s*Development\s*Framework\s*Slide\s*#\d+/gi, '');
  text = text.replace(/U\.S\.\s*SOCCER\s*PLAYER\s*DEVELOPMENT\s*FRAMEWORK/gi, 'U.S. SOCCER PLAYER DEVELOPMENT FRAMEWORK');
  
  // Remove address lines and broken address patterns
  text = text.replace(/\d+\s+S\.\s*PRAIRIE\s*AV[^\n]*/gi, '');
  text = text.replace(/CHICAGO,\s*IL\s*\d{5}/gi, '');
  text = text.replace(/\d+\s+\d+\s+\d+\s+\d+\s+S\.\s*PRAI[^\n]*/gi, '');
  text = text.replace(/CHIC\s*A\s*G\s*O[^\n]*/gi, '');
  text = text.replace(/U\.S\.SOCC\s*E\s*R\s*\|\s*\d+[^\n]*/gi, '');

  // 5. Remove duplicate/repeated phrases (common in headers/footers)
  text = text.replace(/(U\.S\.\s*Soccer\s*PLAYER\s*DEVELOPMENT\s*FRAMEWORK\s*){2,}/gi, 'U.S. SOCCER PLAYER DEVELOPMENT FRAMEWORK');
  
  // 5. Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  text = text.replace(/ \n/g, '\n'); // Space before newline
  text = text.replace(/\n /g, '\n'); // Space after newline

  // 6. Better header detection and formatting
  // Convert ALL CAPS lines (with some words) to headers
  text = text.replace(/^([A-Z][A-Z\s]{15,})\n/gm, (match) => {
    const trimmed = match.trim();
    // Skip if it's just repeated characters or very short
    if (trimmed.length < 20) {
      return `## ${trimmed}\n`;
    }
    // Skip if it's a broken word pattern
    if (trimmed.match(/^[A-Z]{1,3}\s+[A-Z]{1,3}\s+[A-Z]{1,3}/)) {
      return `${trimmed}\n`;
    }
    return `## ${trimmed}\n`;
  });

  // Convert numbered sections to subheadings
  text = text.replace(/^(\d+\.\s+[A-Z][^\n]{10,})\n/gm, '### $1\n');

  // Convert labels (ending with colon) to bold
  text = text.replace(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:)\s*\n/gm, '**$1**\n\n');

  // 7. Clean up bullet points
  text = text.replace(/^(\s*•\s+)/gm, '- '); // Convert bullet to markdown
  text = text.replace(/^(\s*-\s*-\s*)/gm, '- '); // Fix double dashes

  // 8. Remove empty lines at start/end of sections
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/^\n+/, '');
  text = text.replace(/\n+$/, '');

  // 9. Fix common acronyms and abbreviations
  text = text.replace(/\bU\.S\.\s+Soccer\b/gi, 'U.S. Soccer');
  text = text.replace(/\bU\.S\.\s*SOCCER\b/g, 'U.S. SOCCER');

  // 10. Remove redundant section markers
  text = text.replace(/^##\s*##\s*/gm, '## '); // Fix double headers

  return text.trim();
}

/**
 * Extract text from PDF and convert to markdown
 */
async function extractPDFToMarkdown(pdfPath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), '..', pdfPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`PDF not found: ${fullPath}`);
  }

  const dataBuffer = fs.readFileSync(fullPath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();

  // Extract text - data is the result from getText()
  let text = data.text || '';

  // Apply critical fixes FIRST (before post-processing)
  // These must happen immediately after extraction
  // Use multiple approaches to ensure we catch all instances
  const fixes = [
    [/FRAMEWORKFUN/gi, 'FRAMEWORK FUN'],
    [/FRAMEWORKBASIC/gi, 'FRAMEWORK BASIC'],
    [/FRAMEWORKNEEDS/gi, 'FRAMEWORK NEEDS'],
    [/MEANDMYSCANNING/gi, 'ME AND MY SCANNING'],
    [/MEANDMYMOVEMENT/gi, 'ME AND MY MOVEMENT'],
    [/MEANDTHEBALL/gi, 'ME AND THE BALL'],
    [/MEANDMYTEAMMATES/gi, 'ME AND MY TEAMMATES'],
    [/WHOISINFRONTOFUS/gi, 'WHO IS IN FRONT OF US'],
    [/THEGAME/gi, 'THE GAME'],
  ];
  
  for (const [pattern, replacement] of fixes) {
    text = text.replace(pattern as RegExp, replacement as string);
  }
  
  // Also try string-based replacement as fallback
  text = text.split('FRAMEWORKFUN').join('FRAMEWORK FUN');
  text = text.split('FRAMEWORKBASIC').join('FRAMEWORK BASIC');
  text = text.split('FRAMEWORKNEEDS').join('FRAMEWORK NEEDS');

  // Apply post-processing improvements
  text = postProcessText(text);

  return text;
}

/**
 * Format markdown with proper structure
 */
function formatMarkdown(content: string, title: string, category: string): string {
  const header = `# ${title}\n\n`;
  const metadata = `> **Category:** ${category}\n> **Source:** US Soccer Framework Documents\n> **Extracted:** ${new Date().toISOString().split('T')[0]}\n\n---\n\n`;
  
  return header + metadata + content;
}

/**
 * Main extraction function
 */
async function extractAllPDFs() {
  console.log('📄 Starting PDF extraction...\n');

  // Create output directory
  const outputDir = path.join(process.cwd(), 'src', 'frameworks', 'us-soccer');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: Array<{ name: string; success: boolean; error?: string; pages?: number }> = [];

  for (const pdfFile of KEY_PDFS) {
    try {
      console.log(`📖 Extracting: ${pdfFile.name}...`);
      
      const content = await extractPDFToMarkdown(pdfFile.path);
      const formatted = formatMarkdown(content, pdfFile.outputName.replace('.md', '').replace(/-/g, ' '), pdfFile.category);
      
      const outputPath = path.join(outputDir, pdfFile.outputName);
      fs.writeFileSync(outputPath, formatted, 'utf-8');
      
      // Get page count from PDF
      const fullPath = path.join(process.cwd(), '..', pdfFile.path);
      const dataBuffer = fs.readFileSync(fullPath);
      const pageParser = new PDFParse({ data: dataBuffer });
      const pageInfo = await pageParser.getInfo();
      
      results.push({
        name: pdfFile.name,
        success: true,
        pages: pageInfo.total,
      });
      
      console.log(`  ✅ Extracted ${pageInfo.total} pages → ${pdfFile.outputName}`);
    } catch (error: any) {
      console.error(`  ❌ Error extracting ${pdfFile.name}:`, error.message);
      results.push({
        name: pdfFile.name,
        success: false,
        error: error.message,
      });
    }
  }

  console.log('\n📊 Extraction Summary:');
  console.log('='.repeat(50));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n📁 Output directory: ${outputDir}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Failed extractions:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractAllPDFs()
    .then(() => {
      console.log('\n✅ PDF extraction complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ PDF extraction failed:', error);
      process.exit(1);
    });
}

export { extractAllPDFs };
