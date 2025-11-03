#!/usr/bin/env tsx
/**
 * Generates SCSS variable files from the single source of truth in common/colors.ts
 * This ensures colors are only defined once and stay in sync.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the color constants
import { 
  PERFORMANCE_COLORS, 
  UI_COLORS, 
  STAT_COLORS, 
  THEME_COLORS 
} from '../../src/common/colors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate the Theme.scss file
 */
function generateThemeScss(): string {
  return `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// This file is generated from common/colors.ts by scripts/colors/generate-scss.ts
// To modify colors, edit common/colors.ts and run: pnpm generate:colors

// Theme colors from THEME_COLORS
$primaryColor: ${THEME_COLORS.PRIMARY};
$muted: ${THEME_COLORS.MUTED};
$red: ${THEME_COLORS.RED};
$panelColor: ${THEME_COLORS.PANEL};
$backgroundColor: ${THEME_COLORS.BACKGROUND};
$textColor: ${THEME_COLORS.TEXT};
`;
}

/**
 * Generate the Guide.scss color variables section
 */
function generateGuideScss(): string {
  return `// AUTO-GENERATED COLOR VARIABLES - DO NOT EDIT MANUALLY
// This section is generated from common/colors.ts by scripts/colors/generate-scss.ts
// To modify colors, edit common/colors.ts and run: pnpm generate:colors

// Performance colors from PERFORMANCE_COLORS
$perfect-perf-color: ${PERFORMANCE_COLORS.PERFECT};
$good-perf-color: ${PERFORMANCE_COLORS.GOOD};
$decent-perf-color: ${PERFORMANCE_COLORS.DECENT};
$ok-perf-color: ${PERFORMANCE_COLORS.OK};
$mediocre-perf-color: ${PERFORMANCE_COLORS.MEDIOCRE};
$bad-perf-color: ${PERFORMANCE_COLORS.BAD};
$very-bad-perf-color: ${PERFORMANCE_COLORS.VERY_BAD};

// UI colors from UI_COLORS
$available-cd-color: ${UI_COLORS.AVAILABLE};

// Export as CSS custom properties for runtime access
:root {
  --guide-perfect-color: #{$perfect-perf-color};
  --guide-good-color: #{$good-perf-color};
  --guide-decent-color: #{$decent-perf-color};
  --guide-ok-color: #{$ok-perf-color};
  --guide-mediocre-color: #{$mediocre-perf-color};
  --guide-bad-color: #{$bad-perf-color};
  --guide-very-bad-color: #{$very-bad-perf-color};
  --guide-available-color: #{$available-cd-color};
}
`;
}

/**
 * Update Theme.scss file
 */
function updateThemeScss() {
  const themePath = path.join(__dirname, '../../src/interface/Theme.scss');
  const content = generateThemeScss();
  
  fs.writeFileSync(themePath, content, 'utf-8');
  console.log('✓ Generated Theme.scss');
}

/**
 * Update Guide.scss color variables section
 */
function updateGuideScss() {
  const guidePath = path.join(__dirname, '../../src/interface/guide/Guide.scss');
  const existingContent = fs.readFileSync(guidePath, 'utf-8');
  
  // Find the section to replace (from @use to .guide-container)
  const startMarker = '@use \'interface/Theme\';';
  const endMarker = '.guide-container {';
  
  const startIndex = existingContent.indexOf(startMarker);
  const endIndex = existingContent.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not find markers in Guide.scss');
  }
  
  const before = existingContent.substring(0, startIndex + startMarker.length);
  const after = existingContent.substring(endIndex);
  
  const newContent = before + '\n\n' + generateGuideScss() + '\n' + after;
  
  fs.writeFileSync(guidePath, newContent, 'utf-8');
  console.log('✓ Generated Guide.scss color variables');
}

/**
 * Main execution
 */
function main() {
  console.log('Generating SCSS files from common/colors.ts...\n');
  
  try {
    updateThemeScss();
    updateGuideScss();
    
    console.log('\n✓ All SCSS files generated successfully!');
    console.log('\nColors are now sourced from: src/common/colors.ts');
    console.log('SCSS files are auto-generated - do not edit them directly.');
  } catch (error) {
    console.error('\n✗ Error generating SCSS files:', error);
    process.exit(1);
  }
}

main();
