import { Platform } from 'react-native';

/**
 * The design calls for IBM Plex Sans + IBM Plex Mono. Shipping font
 * binaries would break the zero-dependency promise and require native
 * linking, so we resolve the closest system faces instead and let the
 * host app override both via the `fontFamily` prop on `<NetworkLogger />`.
 *
 * If the app already bundles IBM Plex (or any other pair), pass:
 *   <NetworkLogger fontFamily={{ sans: 'IBMPlexSans', mono: 'IBMPlexMono' }} />
 */
export type FontFamilies = {
  /** UI face — labels, titles, buttons. */
  sans?: string;
  /** Mono face — URLs, headers, JSON, cURL, timings, status codes. */
  mono?: string;
};

export const systemMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

/**
 * `undefined` means "RN default UI font", which is San Francisco on
 * iOS and Roboto on Android — the correct platform-neutral choice.
 */
export const systemSans = undefined;

export const defaultFonts: Required<FontFamilies> = {
  sans: systemSans as unknown as string,
  mono: systemMono,
};
