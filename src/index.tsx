import logger from './loggerSingleton';
import { StartNetworkLoggingOptions } from './types';

export { default } from './components/NetworkLogger';
export type { NetworkLoggerProps } from './components/NetworkLogger';

export const startNetworkLogging = (options?: StartNetworkLoggingOptions) => {
  logger.enableXHRInterception(options);
};

export const stopNetworkLogging = () => {
  logger.disableXHRInterception();
};

export const getRequests = () => logger.getRequests();

export const clearRequests = () => logger.clearRequests();

/** Pause or resume capture programmatically. */
export const pauseNetworkLogging = () => logger.onPausedChange(true);

export const resumeNetworkLogging = () => logger.onPausedChange(false);

export const isNetworkLoggingPaused = () => logger.isPaused;

export { getBackHandler } from './backHandler';

export { default as NetworkRequestInfo } from './NetworkRequestInfo';

export type { ThemeName, Theme, ThemeColors } from './theme';
export type { FontFamilies } from './fonts';
export type {
  Headers,
  RequestMethod,
  RequestState,
  RequestTiming,
  StatusClass,
  StartNetworkLoggingOptions,
  NetworkRequestInfoRow,
  DetailTab,
  Filters,
  SearchScopes,
} from './types';
