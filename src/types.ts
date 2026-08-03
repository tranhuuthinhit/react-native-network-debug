import NetworkRequestInfo from './NetworkRequestInfo';
import type { SplitUrl } from './utils/splitUrl';

export type Headers = { [header: string]: string };

export type RequestMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const REQUEST_METHODS: RequestMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
];

/** Lifecycle of a captured request. */
export type RequestState = 'pending' | 'done' | 'failed' | 'cancelled';

/**
 * Phase timings, in milliseconds.
 *
 * XMLHttpRequest exposes no transport-level instrumentation, so DNS,
 * TCP and TLS are **not measurable** from JS and are deliberately
 * absent rather than estimated. What we can measure precisely, from
 * the interceptor's own marks, is:
 *
 *   `queued`   open() → send()                  — time spent in JS
 *   `waiting`  send() → HEADERS_RECEIVED        — server think-time (TTFB)
 *   `download` HEADERS_RECEIVED → DONE          — body transfer
 *
 * The timing card renders whichever phases are present, so if a future
 * native module supplies DNS/TCP/TLS they slot in without a UI change.
 */
export type RequestTiming = {
  queued?: number;
  waiting?: number;
  download?: number;
  /**
   * The remaining phases cannot be measured from JS today and are never
   * populated by the built-in interceptor. They are part of the type so
   * a native provider can supply them without a UI change — the timing
   * card renders whichever phases are present.
   */
  dns?: number;
  tcp?: number;
  tls?: number;
  sent?: number;
};

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx' | 'failed';

export const STATUS_CLASSES: StatusClass[] = [
  '2xx',
  '3xx',
  '4xx',
  '5xx',
  'failed',
];

export type StartNetworkLoggingOptions = {
  /**
   * Max number of requests to keep before overwriting
   * @default 500
   */
  maxRequests?: number;
  /** List of hosts to ignore, e.g. `services.test.com` */
  ignoredHosts?: string[];
  /** List of urls to ignore, e.g. `https://services.test.com/test` */
  ignoredUrls?: string[];
  /**
   * List of url patterns to ignore, e.g. `/^GET https://test.com\/pages\/.*$/`
   *
   * Url to match with is in the format: `${method} ${url}`, e.g. `GET https://test.com/pages/123`
   */
  ignoredPatterns?: RegExp[];
  /**
   * Force the network logger to start even if another program is using the network interceptor
   * e.g. a dev/debuging program
   */
  forceEnable?: boolean;
  /**
   * Refresh rate of the logger in milliseconds
   * @default 50
   */
  refreshRate?: number;
  /**
   * Mask `Authorization`, `Cookie` and similar header values at capture
   * time, so exports and cURL commands never contain a live token.
   * @default true
   */
  redactAuthHeaders?: boolean;
  /** Extra header names to mask, on top of the built-in list. */
  redactedHeaders?: string[];
  /**
   * Response bodies larger than this are dropped from memory and the
   * entry is marked `truncated`.
   * @default 1048576
   */
  maxResponseBodySize?: number;
};

/**
 * The projection the list renders. Kept deliberately small — a new row
 * object is produced for every request on every refresh tick.
 */
export type NetworkRequestInfoRow = Pick<
  NetworkRequestInfo,
  | 'url'
  | 'gqlOperation'
  | 'id'
  | 'method'
  | 'status'
  | 'duration'
  | 'startTime'
  | 'endTime'
  | 'responseSize'
  | 'errorReason'
  | 'state'
> & { splitUrl: SplitUrl };

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type DetailTab = 'overview' | 'request' | 'response' | 'curl';

export type SearchScopes = {
  url: boolean;
  headers: boolean;
  body: boolean;
};

export type Filters = {
  methods: Set<RequestMethod>;
  statusClasses: Set<StatusClass>;
  slowerThanMs: number | null;
  hosts: Set<string>;
};
