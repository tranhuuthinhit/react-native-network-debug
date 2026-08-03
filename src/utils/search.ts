export type MatchRange = { start: number; end: number };

/** Case-insensitive substring scan. Returns every non-overlapping hit. */
export const findMatches = (text: string, query: string): MatchRange[] => {
  if (!text || !query) return [];

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const ranges: MatchRange[] = [];

  let index = haystack.indexOf(needle);
  while (index !== -1) {
    ranges.push({ start: index, end: index + needle.length });
    index = haystack.indexOf(needle, index + needle.length);
  }

  return ranges;
};

export type Segment = { text: string; match: boolean };

/**
 * Splits text into alternating plain / matched segments so the renderer
 * can wrap only the hits in an accent chip.
 */
export const splitOnMatches = (text: string, query: string): Segment[] => {
  const ranges = findMatches(text, query);
  if (!ranges.length) return [{ text, match: false }];

  const segments: Segment[] = [];
  let cursor = 0;

  ranges.forEach(({ start, end }) => {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return segments;
};

/** ±40 chars of context around the first hit, per the handoff. */
export const CONTEXT_CHARS = 40;

/**
 * One excerpt per request for body matches. Returns `null` when the
 * query does not appear, so the caller can skip the excerpt block.
 */
export const excerptAround = (
  text: string,
  query: string,
  context = CONTEXT_CHARS
): string | null => {
  const [first] = findMatches(text, query);
  if (!first) return null;

  const start = Math.max(0, first.start - context);
  const end = Math.min(text.length, first.end + context);

  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';

  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ')}${suffix}`;
};

export const countMatchesIn = (text: string, query: string) =>
  findMatches(text, query).length;
