import { StartNetworkLoggingOptions } from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const startNetworkLogging = (options?: StartNetworkLoggingOptions) => {
  console.warn('startNetworkLogging is not implemented on this platform');
};

export const stopNetworkLogging = () => {};

export const getRequests = () => [];

export const clearRequests = () => {};

export const pauseNetworkLogging = () => {};

export const resumeNetworkLogging = () => {};

export const isNetworkLoggingPaused = () => false;

export { getBackHandler } from './backHandler';

export type { ThemeName, Theme, ThemeColors } from './theme';
export type { FontFamilies } from './fonts';

export default () => null;
