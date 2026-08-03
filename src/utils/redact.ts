import { Headers } from '../types';

/**
 * Headers whose values are masked when `redactAuthHeaders` is on.
 * Matched case-insensitively against the whole header name.
 */
export const DEFAULT_REDACTED_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
  'api-key',
  'apikey',
];

const MASK = '••••••••••••••••';

/**
 * `Bearer eyJhbGciOi…3f9a` → `Bearer ••••••••••••••••3f9a`.
 *
 * The scheme prefix and last four characters survive so an engineer can
 * still tell two tokens apart in a screenshot without leaking either.
 */
export const maskValue = (value: string) => {
  if (!value) return value;

  const schemeMatch = /^(Bearer|Basic|Digest|Token|JWT)\s+/i.exec(value);
  const scheme = schemeMatch ? schemeMatch[0] : '';
  const secret = value.slice(scheme.length);

  if (secret.length <= 8) return `${scheme}${MASK}`;
  return `${scheme}${MASK}${secret.slice(-4)}`;
};

export const isRedactableHeader = (
  name: string,
  extra: string[] = []
): boolean => {
  const lower = name.toLowerCase();
  return (
    DEFAULT_REDACTED_HEADERS.includes(lower) ||
    extra.some((h) => h.toLowerCase() === lower)
  );
};

export type RedactionOptions = {
  enabled: boolean;
  /** Additional header names to mask, on top of the defaults. */
  headers?: string[];
};

/**
 * Applied at capture time, not render time, so exports and cURL
 * commands are safe by default — a redacted log can never leak a
 * token through a share sheet.
 */
export const redactHeaders = (
  headers: Headers,
  options: RedactionOptions
): { headers: Headers; redacted: Set<string> } => {
  const redacted = new Set<string>();
  if (!options.enabled) return { headers, redacted };

  const out: Headers = {};
  Object.entries(headers).forEach(([name, value]) => {
    if (isRedactableHeader(name, options.headers)) {
      out[name] = maskValue(String(value));
      redacted.add(name);
    } else {
      out[name] = value;
    }
  });

  return { headers: out, redacted };
};

/** Placeholder substitution for the cURL tab's `Redact` toggle. */
export const placeholderForHeader = (name: string) => {
  const lower = name.toLowerCase();
  if (lower === 'authorization' || lower === 'proxy-authorization') {
    return '$TOKEN';
  }
  if (lower === 'cookie' || lower === 'set-cookie') return '$COOKIE';
  return `$${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
};
