// Cache for CSS custom property values to avoid repeated getComputedStyle calls
const cssColorCache = new Map<string, string>();

function getColorFromCSS(propertyName: string): string {
  // Check cache first
  if (cssColorCache.has(propertyName)) {
    return cssColorCache.get(propertyName)!;
  }
  
  if (typeof document === 'undefined') {
    return ''; // SSR: return empty, will hydrate on client
  }
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim();
  
  if (!value) {
    console.warn(`CSS custom property ${propertyName} not found. Check that SCSS is loaded.`);
  }
  
  // Cache the value for future access
  cssColorCache.set(propertyName, value);
  
  return value;
}

export const PERFORMANCE_COLORS = {
  /** Perfect performance - Cyan/Blue */
  get PERFECT() { return getColorFromCSS('--guide-perfect-color'); },
  /** Good performance - Green */
  get GOOD() { return getColorFromCSS('--guide-good-color'); },
  /** Light green - Between good and okay (>66%) */
  get DECENT() { return getColorFromCSS('--guide-decent-color'); },
  /** Okay performance - Yellow/Orange */
  get OK() { return getColorFromCSS('--guide-ok-color'); },
  /** Mediocre performance - Orange (>33%) */
  get MEDIOCRE() { return getColorFromCSS('--guide-mediocre-color'); },
  /** Bad performance - Red */
  get BAD() { return getColorFromCSS('--guide-bad-color'); },
  /** Very bad performance - Dark Red */
  get VERY_BAD() { return getColorFromCSS('--guide-very-bad-color'); },
};

/** Common UI colors */
export const UI_COLORS = {
  /** Available/Neutral state - Gray (from Guide.scss $available-cd-color) */
  get AVAILABLE() { return getColorFromCSS('--guide-available-color'); },
  /** Default cooldown/warning color - Orange (from Theme.scss $primaryColor) */
  get WARNING() { return getColorFromCSS('--theme-primary-color'); },
  /** Error/Critical state - Red */
  ERROR: '#dc2626',
  /** Success state - Green */
  SUCCESS: '#22c55e',
  /** Info state - Blue */
  INFO: '#3b82f6',
};

/** Stat card colors */
export const STAT_COLORS = {
  /** Default white for stats */
  DEFAULT: 'white',
  /** Red for major issues */
  MAJOR_ISSUE: '#dc2626',
  /** Orange for average issues */
  AVERAGE_ISSUE: '#fb923c',
  /** Yellow for minor issues */
  MINOR_ISSUE: '#fbbf24',
  /** Green for good performance */
  GOOD: '#22c55e',
} as const;

export const THEME_COLORS = {
  /** Primary brand color - Orange/Gold */
  get PRIMARY() { return getColorFromCSS('--theme-primary-color'); },
  /** Muted text color - Light Gray with transparency */
  get MUTED() { return getColorFromCSS('--theme-muted-color'); },
  /** Error/Danger color - Red */
  get RED() { return getColorFromCSS('--theme-red-color'); },
  /** Panel background color - Dark Gray */
  get PANEL() { return getColorFromCSS('--theme-panel-color'); },
  /** Main background color - Very Dark Gray */
  get BACKGROUND() { return getColorFromCSS('--theme-background-color'); },
  /** Primary text color - Off-white */
  get TEXT() { return getColorFromCSS('--theme-text-color'); },
};

export const CLASS_COLORS = {
  get DEATH_KNIGHT() { return getColorFromCSS('--class-death-knight-color'); },
  get DEMON_HUNTER() { return getColorFromCSS('--class-demon-hunter-color'); },
  get DRUID() { return getColorFromCSS('--class-druid-color'); },
  get EVOKER() { return getColorFromCSS('--class-evoker-color'); },
  get HUNTER() { return getColorFromCSS('--class-hunter-color'); },
  get MAGE() { return getColorFromCSS('--class-mage-color'); },
  get MONK() { return getColorFromCSS('--class-monk-color'); },
  get PALADIN() { return getColorFromCSS('--class-paladin-color'); },
  get PRIEST() { return getColorFromCSS('--class-priest-color'); },
  get ROGUE() { return getColorFromCSS('--class-rogue-color'); },
  get SHAMAN() { return getColorFromCSS('--class-shaman-color'); },
  get WARLOCK() { return getColorFromCSS('--class-warlock-color'); },
  get WARRIOR() { return getColorFromCSS('--class-warrior-color'); },
};

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a color string (hex or HSL) into HSL components
 * 
 * @param color - Color in hex (#rrggbb) or hsl(h, s%, l%) format
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 * 
 */
export function parseColor(color: string): HSL {
  // Handle HSL format
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
  if (hslMatch) {
    return {
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
    };
  }

  // Handle hex format
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    const r = parseInt(hexMatch[1], 16) / 255;
    const g = parseInt(hexMatch[2], 16) / 255;
    const b = parseInt(hexMatch[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  // Default fallback to orange
  console.warn(`Unable to parse color: ${color}, using default orange`);
  return { h: 35, s: 90, l: 55 };
}

/**
 * Converts hex color to RGB format
 * 
 * @param color - Color in hex format (#rrggbb)
 * @returns RGB string in format 'rgb(r,g,b)'
 * 
 */
export function hexToRgb(color: string): string {
  if (color.length !== 7 || !color.startsWith('#')) {
    console.error('Invalid hex color format: ' + color + ' - using white as fallback');
    return 'rgb(255,255,255)';
  }

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return `rgb(${r},${g},${b})`;
}

/**
 * Converts HSL to CSS hsl() string
 * 
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns HSL string in format 'hsl(h, s%, l%)'
 * 
 */
export function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Generates a 5-tier gradient from a base color
 * 
 * Returns colors from lightest to darkest:
 * - Tier 1: Lightest (+20% lightness, -10% saturation)
 * - Tier 2: Lighter (+10% lightness, -5% saturation)
 * - Tier 3: Base (unchanged)
 * - Tier 4: Darker (-10% lightness, -10° hue)
 * - Tier 5: Darkest (-20% lightness, -20° hue)
 * 
 * @param baseColor - Base color in hex or HSL format
 * @returns Array of 5 HSL color strings
 * 
 */
export function generateGradient(baseColor: string): string[] {
  const { h, s, l } = parseColor(baseColor);

  return [
    // Lightest - tier 1
    hslToString(h, Math.max(0, s - 10), Math.min(100, l + 20)),
    // Lighter - tier 2
    hslToString(h, Math.max(0, s - 5), Math.min(100, l + 10)),
    // Base - tier 3
    hslToString(h, s, l),
    // Darker - tier 4
    hslToString(Math.max(0, h - 10), s, Math.max(0, l - 10)),
    // Darkest - tier 5
    hslToString(Math.max(0, h - 20), s, Math.max(0, l - 20)),
  ];
}

/**
 * Adjusts the lightness of a color
 * 
 * @param color - Color in hex or HSL format
 * @param amount - Amount to adjust lightness by (-100 to 100)
 * @returns Adjusted color in HSL format
 * 
 */
export function adjustLightness(color: string, amount: number): string {
  const { h, s, l } = parseColor(color);
  return hslToString(h, s, Math.max(0, Math.min(100, l + amount)));
}

/**
 * Adjusts the saturation of a color
 * 
 * @param color - Color in hex or HSL format
 * @param amount - Amount to adjust saturation by (-100 to 100)
 * @returns Adjusted color in HSL format
 * 
 */
export function adjustSaturation(color: string, amount: number): string {
  const { h, s, l } = parseColor(color);
  return hslToString(h, Math.max(0, Math.min(100, s + amount)), l);
}

/**
 * Returns a color based on numeric performance (0-1 scale)
 * 
 * - ≥ 1.0: Perfect (green)
 * - > 0.666: Good (light green)
 * - > 0.5: Okay (yellow)
 * - > 0.333: Mediocre (orange)
 * - ≤ 0.333: Bad (red)
 * 
 * @param performance - Performance value from 0 to 1
 * @returns Hex color code
 * 
 */
export function colorForPerformance(performance: number): string {
  if (performance >= 1) {
    return PERFORMANCE_COLORS.GOOD;
  } else if (performance > 0.666) {
    return PERFORMANCE_COLORS.DECENT;
  } else if (performance > 0.5) {
    return PERFORMANCE_COLORS.OK;
  } else if (performance > 0.333) {
    return PERFORMANCE_COLORS.MEDIOCRE;
  } else {
    return PERFORMANCE_COLORS.BAD;
  }
}

/**
 * Returns a color based on efficiency thresholds
 * 
 * @param efficiency - Efficiency value (0-1)
 * @param majorIssue - Threshold for major issues
 * @param averageIssue - Threshold for average issues
 * @param recommended - Threshold for recommended performance
 * @returns Hex color code
 * 
 */
export function colorForEfficiency(
  efficiency: number,
  majorIssue: number,
  averageIssue: number,
  recommended: number,
): string {
  if (efficiency < majorIssue) {
    return STAT_COLORS.MAJOR_ISSUE;
  } else if (efficiency < averageIssue) {
    return STAT_COLORS.AVERAGE_ISSUE;
  } else if (efficiency < recommended) {
    return STAT_COLORS.MINOR_ISSUE;
  } else {
    return STAT_COLORS.GOOD;
  }
}

/**
 * Rounds a threshold value to a nice round number
 * 
 * @param value - Value to round
 * @returns Rounded value
 * 
 */
export function roundThreshold(value: number): number {
  if (value > 100000) return Math.round(value / 10000) * 10000;
  if (value > 50000) return Math.round(value / 5000) * 5000;
  return Math.round(value / 1000) * 1000;
}

/**
 * Creates an RGBA color string from hex
 * 
 * @param hex - Hex color code
 * @param alpha - Alpha value (0-1)
 * @returns RGBA string
 * 
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
}
