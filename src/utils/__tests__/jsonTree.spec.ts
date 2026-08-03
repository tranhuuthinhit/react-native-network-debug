import {
  collectContainerPaths,
  countNodes,
  flattenJson,
  safeParseJson,
} from '../jsonTree';

const text = (lines: ReturnType<typeof flattenJson>) =>
  lines.map((line) => line.tokens.map((t) => t.text).join(''));

describe('flattenJson', () => {
  const noneCollapsed = { collapsedPaths: new Set<string>() };

  it('renders a flat object', () => {
    const lines = flattenJson({ a: 1, b: 'two' }, noneCollapsed);

    expect(text(lines)).toEqual(['{', '"a": 1,', '"b": "two"', '}']);
    expect(lines[1].depth).toBe(1);
  });

  it('colours scalars by kind', () => {
    const lines = flattenJson(
      { s: 'x', n: 1, b: true, z: null },
      noneCollapsed
    );

    const kinds = lines
      .slice(1, 5)
      .map((line) => line.tokens[line.tokens.length - 1].kind);
    // Each line ends with a comma except the last, so read the value token.
    expect(lines[1].tokens[2].kind).toBe('string');
    expect(lines[2].tokens[2].kind).toBe('number');
    expect(lines[3].tokens[2].kind).toBe('literal');
    expect(lines[4].tokens[2].kind).toBe('literal');
    expect(kinds.length).toBe(4);
  });

  it('emits one line for a collapsed container with a child count', () => {
    const lines = flattenJson(
      { items: [1, 2, 3] },
      { collapsedPaths: new Set(['items']) }
    );

    expect(text(lines)).toEqual(['{', '"items": []', '}']);
    expect(lines[1].container).toEqual({
      kind: 'array',
      childCount: 3,
      collapsed: true,
    });
  });

  it('skips the subtree of a collapsed container entirely', () => {
    const big = { items: Array.from({ length: 200 }, (_, i) => i) };
    const lines = flattenJson(big, { collapsedPaths: new Set(['items']) });

    expect(lines).toHaveLength(3);
  });

  it('auto-collapses containers above the threshold', () => {
    const big = { items: Array.from({ length: 60 }, (_, i) => i) };
    const lines = flattenJson(big, { collapsedPaths: new Set() });

    expect(lines[1].container?.collapsed).toBe(true);
  });

  it('lets an explicit expand override auto-collapse', () => {
    const big = { items: Array.from({ length: 60 }, (_, i) => i) };
    const lines = flattenJson(big, {
      collapsedPaths: new Set(),
      expandedPaths: new Set(['items']),
    });

    expect(lines[1].container?.collapsed).toBe(false);
    expect(lines.length).toBeGreaterThan(60);
  });

  it('renders an empty container on one line', () => {
    expect(text(flattenJson({ a: {}, b: [] }, noneCollapsed))).toEqual([
      '{',
      '"a": {},',
      '"b": []',
      '}',
    ]);
  });

  it('builds dotted paths through arrays', () => {
    const lines = flattenJson({ data: [{ id: 7 }] }, noneCollapsed);
    const paths = lines.map((l) => l.path);

    expect(paths).toContain('data.0.id');
  });

  it('handles a top-level array', () => {
    expect(text(flattenJson([1, 2], noneCollapsed))).toEqual([
      '[',
      '1,',
      '2',
      ']',
    ]);
  });

  it('handles a top-level scalar', () => {
    expect(text(flattenJson('hi', noneCollapsed))).toEqual(['"hi"']);
  });

  it('exposes the raw value for copying', () => {
    const lines = flattenJson({ token: 'abc' }, noneCollapsed);
    expect(lines[1].rawValue).toBe('abc');
  });
});

describe('countNodes', () => {
  it('counts every node including containers', () => {
    expect(countNodes({ a: 1, b: [2, 3] })).toBe(5);
  });

  it('counts a scalar as one', () => {
    expect(countNodes(42)).toBe(1);
  });
});

describe('collectContainerPaths', () => {
  it('returns every container path, root first', () => {
    expect(collectContainerPaths({ a: { b: [1] } })).toEqual(['', 'a', 'a.b']);
  });
});

describe('safeParseJson', () => {
  it('parses valid json', () => {
    expect(safeParseJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  it('reports failure instead of throwing', () => {
    expect(safeParseJson('<html>')).toEqual({ ok: false });
  });
});
