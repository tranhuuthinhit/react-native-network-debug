import {
  countMatchesIn,
  excerptAround,
  findMatches,
  splitOnMatches,
} from '../search';

describe('findMatches', () => {
  it('finds every non-overlapping hit, case-insensitively', () => {
    expect(findMatches('aXaXa', 'x')).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
    ]);
  });

  it('does not overlap repeated patterns', () => {
    expect(findMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it('returns nothing for an empty query or text', () => {
    expect(findMatches('abc', '')).toEqual([]);
    expect(findMatches('', 'a')).toEqual([]);
  });
});

describe('splitOnMatches', () => {
  it('alternates plain and matched segments', () => {
    expect(splitOnMatches('foo bar foo', 'bar')).toEqual([
      { text: 'foo ', match: false },
      { text: 'bar', match: true },
      { text: ' foo', match: false },
    ]);
  });

  it('handles a match at the start and end', () => {
    expect(splitOnMatches('ab', 'ab')).toEqual([{ text: 'ab', match: true }]);
  });

  it('returns one plain segment when there is no hit', () => {
    expect(splitOnMatches('abc', 'z')).toEqual([{ text: 'abc', match: false }]);
  });
});

describe('excerptAround', () => {
  it('returns null when the query is absent', () => {
    expect(excerptAround('hello', 'zzz')).toBeNull();
  });

  it('adds ellipses when the text is clipped', () => {
    const long = `${'a'.repeat(100)}NEEDLE${'b'.repeat(100)}`;
    const excerpt = excerptAround(long, 'needle');

    expect(excerpt).toContain('NEEDLE');
    expect(excerpt?.startsWith('…')).toBe(true);
    expect(excerpt?.endsWith('…')).toBe(true);
  });

  it('does not add ellipses when the whole text fits', () => {
    expect(excerptAround('find me', 'find')).toBe('find me');
  });

  it('collapses whitespace so the excerpt stays on one line', () => {
    expect(excerptAround('a\n\n  b needle', 'needle')).toBe('a b needle');
  });
});

describe('countMatchesIn', () => {
  it('counts hits', () => {
    expect(countMatchesIn('a.a.a', 'a')).toBe(3);
  });
});
