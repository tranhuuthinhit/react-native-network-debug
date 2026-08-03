import { Share } from 'react-native';

type ClipboardModule = {
  setString: (value: string) => void;
};

let resolved: ClipboardModule | null | undefined;

/**
 * The library ships zero dependencies, so the clipboard is resolved at
 * runtime from whichever implementation the host app already has:
 *
 *   1. `@react-native-clipboard/clipboard` (the community package)
 *   2. `expo-clipboard`
 *   3. `Clipboard` from react-native core — removed in RN 0.83, and
 *      deprecated well before that, so it is tried last and behind a
 *      guard rather than imported at the top level.
 *
 * When none is present, callers fall back to the platform share sheet
 * so "copy" still does something useful.
 */
const resolveClipboard = (): ClipboardModule | null => {
  if (resolved !== undefined) return resolved;

  const candidates: (() => ClipboardModule | null)[] = [
    () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-clipboard/clipboard');
      const impl = mod?.default ?? mod;
      return typeof impl?.setString === 'function' ? impl : null;
    },
    () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-clipboard');
      if (typeof mod?.setStringAsync === 'function') {
        return { setString: (v: string) => void mod.setStringAsync(v) };
      }
      return null;
    },
    () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('react-native');
      const impl = mod?.Clipboard;
      return typeof impl?.setString === 'function' ? impl : null;
    },
  ];

  for (const candidate of candidates) {
    try {
      const impl = candidate();
      if (impl) {
        resolved = impl;
        return resolved;
      }
    } catch {
      // Module not installed — try the next one.
    }
  }

  resolved = null;
  return resolved;
};

/**
 * Returns `true` when the value reached the clipboard, `false` when we
 * had to fall back to the share sheet. Callers use this to decide
 * whether to show the "copied" toast.
 */
export const copyToClipboard = async (value: string): Promise<boolean> => {
  const clipboard = resolveClipboard();

  if (clipboard) {
    clipboard.setString(value);
    return true;
  }

  try {
    await Share.share({ message: value });
  } catch {
    // User dismissed the share sheet.
  }
  return false;
};

/** True when a real clipboard is available — used to label affordances. */
export const hasClipboard = () => resolveClipboard() !== null;

/** Test seam. */
export const __resetClipboardCache = () => {
  resolved = undefined;
};
