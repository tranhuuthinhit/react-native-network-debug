import React, { useContext, useMemo } from 'react';
import { DeepPartial } from './types';

export type ThemeName = 'light' | 'dark';

export type ThemeColors = {
  /* ── Surfaces ───────────────────────────────────────────── */
  /** Screen background */
  bg: string;
  /** Sticky bottom action bar */
  bgRaised: string;
  /** Cards, rows, inputs, bottom sheets */
  surface: string;
  /** Code / JSON blocks — one step darker than `surface` */
  surfaceCode: string;
  /** Chips, sheet list items, secondary buttons, bar tracks */
  surfaceAlt: string;

  /* ── Lines ──────────────────────────────────────────────── */
  /** Input / control borders */
  border: string;
  /** Card borders */
  borderSoft: string;
  /** Row dividers inside cards */
  divider: string;
  /** Divider above the action bar */
  dividerDark: string;
  /** Sheet top border, grab handle, skeleton bars */
  handle: string;
  /** Context-menu / lifted-field border */
  menuBorder: string;
  /** Dividers inside a context menu */
  menuDivider: string;

  /* ── Text ramp ──────────────────────────────────────────── */
  /** Primary text */
  text: string;
  /** Long-press lifted field value only */
  textStrong: string;
  /** Secondary labels, icon strokes */
  textSecondary: string;
  /** Meta text, section labels, header keys */
  textMuted: string;
  /** Query string, JSON punctuation */
  textFaint: string;
  /** URL host segment */
  textFaintest: string;

  /* ── Success / 2xx ──────────────────────────────────────── */
  success: string;
  successText: string;
  successBg: string;
  successBorder: string;

  /* ── Danger / error ─────────────────────────────────────── */
  danger: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  /** Whole error row background */
  dangerRowBg: string;
  dangerRowBorder: string;
  /** Waterfall track inside an error row */
  dangerRowTrack: string;
  /** Method label in an error row */
  dangerMethod: string;
  /** URL path in an error row */
  dangerPath: string;
  /** URL host in an error row */
  dangerHost: string;

  /* ── Warn / slow / paused ───────────────────────────────── */
  warn: string;
  warnText: string;
  warnBg: string;
  warnBorder: string;
  /** Slow-duration chip fill on a list row */
  warnChipBg: string;

  /* ── Accent ─────────────────────────────────────────────── */
  accent: string;
  /** "Decode" chip background */
  accentBgSoft: string;
  /** Focused search field border */
  accentBorder: string;
  /** Text sitting on an accent fill */
  onAccent: string;

  /* ── Syntax tokens ──────────────────────────────────────── */
  jsonKey: string;
  jsonString: string;
  jsonNumber: string;
  jsonLiteral: string;
  jsonPunctuation: string;

  /* ── Misc ───────────────────────────────────────────────── */
  /** Waterfall track, skeleton fill */
  track: string;
  /** Modal / sheet backdrop */
  backdrop: string;

  /* ── Legacy aliases (react-native-network-logger v3 API) ── */
  background: string;
  link: string;
  card: string;
  statusGood: string;
  statusWarning: string;
  statusBad: string;
  secondary: string;
  onSecondary: string;
  muted: string;
};

export type Theme = {
  colors: ThemeColors;
};

/**
 * Type scale from the design handoff. `lineHeight` values are the
 * handoff's unitless multipliers resolved against the font size,
 * because RN only accepts absolute line heights.
 */
export const type = {
  screenTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.16 },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  detailUrl: { fontSize: 13, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 1.32 },
  statusPill: { fontSize: 11, fontWeight: '600' },
  method: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.8 },
  rowMeta: { fontSize: 11, fontWeight: '500' },
  rowUrl: { fontSize: 12.5, fontWeight: '400', lineHeight: 19 },
  headerKey: { fontSize: 11.5, fontWeight: '400' },
  headerValue: { fontSize: 12.5, fontWeight: '400', lineHeight: 19 },
  code: { fontSize: 12.5, fontWeight: '400', lineHeight: 23 },
  codeLoose: { fontSize: 12.5, fontWeight: '400', lineHeight: 24 },
  tab: { fontSize: 12, fontWeight: '500' },
  tabActive: { fontSize: 12, fontWeight: '600' },
  chip: { fontSize: 11.5, fontWeight: '600' },
  sheetItem: { fontSize: 14.5, fontWeight: '500' },
  actionButton: { fontSize: 13, fontWeight: '600' },
  statCaption: { fontSize: 11, fontWeight: '500', letterSpacing: 1.1 },
  statValue: { fontSize: 15, fontWeight: '600' },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyBody: { fontSize: 13, fontWeight: '400', lineHeight: 21 },
} as const;

/** 4pt base. */
export const space = {
  /** Screen horizontal padding */
  gutter: 14,
  cardPadV: 12,
  cardPadH: 13,
  rowGap: 9,
  sectionGap: 14,
} as const;

export const radius = {
  sheet: 22,
  card: 13,
  cardLg: 14,
  input: 12,
  chip: 9,
  chipSm: 8,
  stat: 11,
  pill: 5,
  bar: 2,
  track: 3,
} as const;

/** ≥ 44pt for repeatedly-tapped controls, ≥ 38pt elsewhere. */
export const hit = { tap: 44, control: 38, icon: 36 } as const;

/** Content is capped and centred on tablets. */
export const MAX_CONTENT_WIDTH = 560;

const darkTheme: Theme = {
  colors: {
    bg: '#0a0b0c',
    bgRaised: '#0d0e10',
    surface: '#141618',
    surfaceCode: '#101214',
    surfaceAlt: '#1c1f22',

    border: '#24282c',
    borderSoft: '#1e2226',
    divider: '#1c1f22',
    dividerDark: '#1a1d20',
    handle: '#2a2f34',
    menuBorder: '#3a4046',
    menuDivider: '#262a2f',

    text: '#eceef0',
    textStrong: '#ffffff',
    textSecondary: '#c8ced3',
    textMuted: '#8b9298',
    textFaint: '#7d858b',
    textFaintest: '#6b7378',

    success: '#35c07a',
    successText: '#4fd894',
    successBg: 'rgba(53,192,122,0.14)',
    successBorder: 'rgba(53,192,122,0.32)',

    danger: '#ff5c5c',
    dangerText: '#ff8080',
    dangerBg: 'rgba(255,92,92,0.16)',
    dangerBorder: 'rgba(255,92,92,0.42)',
    dangerRowBg: 'rgba(255,92,92,0.055)',
    dangerRowBorder: 'rgba(255,92,92,0.28)',
    dangerRowTrack: '#241a1b',
    dangerMethod: '#ffbdbd',
    dangerPath: '#ffe3e3',
    dangerHost: '#8a6668',

    warn: '#ffb454',
    warnText: '#ffca7d',
    warnBg: 'rgba(255,180,84,0.07)',
    warnBorder: 'rgba(255,180,84,0.26)',
    warnChipBg: 'rgba(255,180,84,0.1)',

    accent: '#5aa7ff',
    accentBgSoft: '#131a22',
    accentBorder: '#3d6ea8',
    onAccent: '#0a0b0c',

    jsonKey: '#8ec2ff',
    jsonString: '#7ddba0',
    jsonNumber: '#ffca7d',
    jsonLiteral: '#c79fff',
    jsonPunctuation: '#7d858b',

    track: '#1c1f22',
    backdrop: 'rgba(0,0,0,0.58)',

    // legacy aliases
    background: '#0a0b0c',
    link: '#5aa7ff',
    card: '#141618',
    statusGood: '#35c07a',
    statusWarning: '#ffb454',
    statusBad: '#ff5c5c',
    secondary: '#1c1f22',
    onSecondary: '#eceef0',
    muted: '#8b9298',
  },
};

/**
 * The redesign is a dark developer tool, but `theme="light"` keeps
 * working for anyone upgrading from `react-native-network-logger`.
 * The neutral ramp inverts; status colours stay literal (darkened
 * only enough to clear 4.5:1 on white) because greens must read as
 * green and reds as red in a debug tool.
 */
const lightTheme: Theme = {
  colors: {
    bg: '#f5f6f7',
    bgRaised: '#ffffff',
    surface: '#ffffff',
    surfaceCode: '#f7f8f9',
    surfaceAlt: '#eceef0',

    border: '#d4d8dc',
    borderSoft: '#e2e5e8',
    divider: '#e8eaed',
    dividerDark: '#dfe2e6',
    handle: '#c4cace',
    menuBorder: '#c4cace',
    menuDivider: '#e8eaed',

    text: '#14171a',
    textStrong: '#000000',
    textSecondary: '#3d444a',
    textMuted: '#5f676d',
    textFaint: '#6d757b',
    textFaintest: '#828a90',

    success: '#1f9d5f',
    successText: '#14804a',
    successBg: 'rgba(31,157,95,0.12)',
    successBorder: 'rgba(31,157,95,0.34)',

    danger: '#e03131',
    dangerText: '#c02626',
    dangerBg: 'rgba(224,49,49,0.1)',
    dangerBorder: 'rgba(224,49,49,0.34)',
    dangerRowBg: 'rgba(224,49,49,0.045)',
    dangerRowBorder: 'rgba(224,49,49,0.24)',
    dangerRowTrack: '#f6dede',
    dangerMethod: '#9b2020',
    dangerPath: '#7d1a1a',
    dangerHost: '#b06a6a',

    warn: '#d98218',
    warnText: '#9c5c0c',
    warnBg: 'rgba(217,130,24,0.08)',
    warnBorder: 'rgba(217,130,24,0.28)',
    warnChipBg: 'rgba(217,130,24,0.12)',

    accent: '#1a73e8',
    accentBgSoft: '#e8f0fe',
    accentBorder: '#1a73e8',
    onAccent: '#ffffff',

    jsonKey: '#1a56b8',
    jsonString: '#14804a',
    jsonNumber: '#9c5c0c',
    jsonLiteral: '#6b34c4',
    jsonPunctuation: '#6d757b',

    track: '#e2e5e8',
    backdrop: 'rgba(0,0,0,0.42)',

    // legacy aliases
    background: '#f5f6f7',
    link: '#1a73e8',
    card: '#ffffff',
    statusGood: '#1f9d5f',
    statusWarning: '#d98218',
    statusBad: '#e03131',
    secondary: '#eceef0',
    onSecondary: '#14171a',
    muted: '#5f676d',
  },
};

const themes: { [key in ThemeName]: Theme } = {
  dark: darkTheme,
  light: lightTheme,
};

export const ThemeContext = React.createContext<ThemeName | DeepPartial<Theme>>(
  'dark'
);

export const useTheme = (): Theme => {
  const themeValue = useContext(ThemeContext);

  return useMemo(() => {
    if (typeof themeValue === 'string') {
      return themes[themeValue] ?? darkTheme;
    }
    return {
      colors: {
        ...darkTheme.colors,
        ...(themeValue?.colors as Partial<ThemeColors> | undefined),
      },
    };
  }, [themeValue]);
};

/**
 * Memoised per theme so `StyleSheet.create` is not re-run on every
 * render — the list re-renders at the logger refresh rate.
 */
export const useThemedStyles = <T>(styles: (theme: Theme) => T): T => {
  const theme = useTheme();

  return useMemo(() => styles(theme), [theme, styles]);
};
