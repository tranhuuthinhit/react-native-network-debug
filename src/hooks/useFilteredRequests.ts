import { useMemo } from 'react';
import NetworkRequestInfo from '../NetworkRequestInfo';
import { Filters, SearchScopes, StatusClass } from '../types';
import { countMatchesIn, excerptAround } from '../utils/search';
import { DEFAULT_SLOW_THRESHOLD_MS } from '../constant';
import type { WaterfallWindow } from '../components/ui/WaterfallBar';

export type SearchHit = {
  /** Total matches across every enabled scope, for the result bar. */
  matches: number;
  /** One body excerpt per request, ±40 chars of context. */
  bodyExcerpt: string | null;
};

export type FilteredResult = {
  requests: NetworkRequestInfo[];
  /** Rows removed by search, shown in the filtered list's footer. */
  hiddenBySearch: number;
  /** Per-request search metadata, keyed by request id. */
  hits: Map<string, SearchHit>;
  totalMatches: number;
  /** Earliest start → latest end across the filtered set. */
  window: WaterfallWindow;
  /** Quick-chip counts, always read from the unfiltered set. */
  counts: { all: number; errors: number; slow: number; post: number };
  /** Every captured host, for the Filters sheet. */
  hosts: string[];
  /** Mean duration of completed requests, for the header status line. */
  averageDuration: number;
};

const matchesStatusClass = (
  request: NetworkRequestInfo,
  classes: Set<StatusClass>
) => classes.size === 0 || classes.has(request.statusClass);

/**
 * Body scope searches whatever payload is already in memory as a string.
 * Blob and truncated responses are skipped rather than force-read: the
 * handoff limits body search to payloads under the buffer limit, and
 * awaiting a FileReader per row would stall the list.
 */
const bodyText = (request: NetworkRequestInfo) => {
  if (request.truncated) return '';
  const response = typeof request.response === 'string' ? request.response : '';
  const sent = typeof request.dataSent === 'string' ? request.dataSent : '';
  return `${sent}\n${response}`;
};

const headerText = (request: NetworkRequestInfo) =>
  [
    ...Object.entries(request.requestHeaders ?? {}),
    ...Object.entries(request.responseHeaders ?? {}),
  ]
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

const useFilteredRequests = (
  requests: NetworkRequestInfo[],
  {
    search,
    scopes,
    filters,
    slowThreshold = DEFAULT_SLOW_THRESHOLD_MS,
    maxRows,
  }: {
    search: string;
    scopes: SearchScopes;
    filters: Filters;
    slowThreshold?: number;
    maxRows?: number;
  }
): FilteredResult =>
  useMemo(() => {
    const query = search.trim();

    const counts = { all: requests.length, errors: 0, slow: 0, post: 0 };
    const hostSet = new Set<string>();
    let durationSum = 0;
    let durationCount = 0;

    requests.forEach((request) => {
      if (request.isError) counts.errors += 1;
      if (request.duration > slowThreshold) counts.slow += 1;
      if (request.method === 'POST') counts.post += 1;
      if (request.host) hostSet.add(request.host);
      if (request.duration > 0) {
        durationSum += request.duration;
        durationCount += 1;
      }
    });

    // Filters first, then search — so the "N hidden by search" footer
    // counts only what the query removed, not what the chips removed.
    const filtered = requests.filter((request) => {
      if (filters.methods.size && !filters.methods.has(request.method)) {
        return false;
      }
      if (!matchesStatusClass(request, filters.statusClasses)) return false;
      if (
        filters.slowerThanMs !== null &&
        !(request.duration > filters.slowerThanMs)
      ) {
        return false;
      }
      if (filters.hosts.size && !filters.hosts.has(request.host)) return false;
      return true;
    });

    const hits = new Map<string, SearchHit>();
    let totalMatches = 0;

    const searched = !query
      ? filtered
      : filtered.filter((request) => {
          let matches = 0;
          let bodyExcerpt: string | null = null;

          if (scopes.url) {
            matches += countMatchesIn(request.url, query);
            if (request.gqlOperation) {
              matches += countMatchesIn(request.gqlOperation, query);
            }
          }
          if (scopes.headers) {
            matches += countMatchesIn(headerText(request), query);
          }
          if (scopes.body) {
            const body = bodyText(request);
            const bodyMatches = countMatchesIn(body, query);
            matches += bodyMatches;
            if (bodyMatches) bodyExcerpt = excerptAround(body, query);
          }

          if (!matches) return false;

          hits.set(request.id, { matches, bodyExcerpt });
          totalMatches += matches;
          return true;
        });

    const capped =
      maxRows !== undefined ? searched.slice(0, maxRows) : searched;

    // The waterfall window spans the rows actually on screen, so the
    // bars always use the full width available.
    let windowStart = Infinity;
    let windowEnd = -Infinity;
    capped.forEach((request) => {
      const start = request.startTime || request.openTime;
      const end = request.endTime || start;
      if (start && start < windowStart) windowStart = start;
      if (end > windowEnd) windowEnd = end;
    });

    const win: WaterfallWindow = Number.isFinite(windowStart)
      ? { start: windowStart, end: Math.max(windowEnd, windowStart + 1) }
      : { start: 0, end: 1 };

    return {
      requests: capped,
      hiddenBySearch: query ? filtered.length - searched.length : 0,
      hits,
      totalMatches,
      window: win,
      counts,
      hosts: Array.from(hostSet).sort(),
      averageDuration: durationCount ? durationSum / durationCount : 0,
    };
  }, [requests, search, scopes, filters, slowThreshold, maxRows]);

export default useFilteredRequests;
