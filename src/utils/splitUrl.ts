export type SplitUrl = {
  /** `https://api.example.com` — rendered in the faintest tier. */
  host: string;
  /** `/v1/pages/home/ribbons` — rendered in the brightest tier. */
  path: string;
  /** `?locale=en&fresh=1` including the leading `?`, or `''`. */
  query: string;
};

/**
 * Splits a URL into the three colour tiers the list rows use. Written
 * by hand rather than with `new URL()` because URLs captured from an
 * interceptor are frequently relative or malformed, and `URL` throws.
 */
const splitUrl = (url: string): SplitUrl => {
  if (!url) return { host: '', path: '', query: '' };

  const queryIndex = url.indexOf('?');
  const withoutQuery = queryIndex === -1 ? url : url.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : url.slice(queryIndex);

  const schemeEnd = withoutQuery.indexOf('//');
  if (schemeEnd === -1) {
    // Relative URL — there is no host to dim.
    return { host: '', path: withoutQuery, query };
  }

  const afterScheme = schemeEnd + 2;
  const pathStart = withoutQuery.indexOf('/', afterScheme);

  if (pathStart === -1) {
    return { host: withoutQuery, path: '', query };
  }

  return {
    host: withoutQuery.slice(0, pathStart),
    path: withoutQuery.slice(pathStart),
    query,
  };
};

/** `?a=1&b=2` → `[['a','1'], ['b','2']]`. Values stay percent-encoded. */
export const parseQueryParams = (query: string): [string, string][] => {
  const raw = query.startsWith('?') ? query.slice(1) : query;
  if (!raw) return [];

  return raw.split('&').flatMap((pair) => {
    if (!pair) return [];
    const eq = pair.indexOf('=');
    if (eq === -1) return [[pair, ''] as [string, string]];
    return [[pair.slice(0, eq), pair.slice(eq + 1)] as [string, string]];
  });
};

/** Percent-decodes a query string in place for the `Decode` chip. */
export const decodeQuery = (query: string) => {
  try {
    return decodeURIComponent(query.replace(/\+/g, ' '));
  } catch {
    // Malformed escape sequence — show the raw value rather than throw.
    return query;
  }
};

export default splitUrl;
