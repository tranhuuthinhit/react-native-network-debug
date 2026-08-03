import splitUrl, { decodeQuery, parseQueryParams } from '../splitUrl';

describe('splitUrl', () => {
  it('splits an absolute url into host, path and query', () => {
    expect(splitUrl('https://api.example.com/v1/pages?locale=en')).toEqual({
      host: 'https://api.example.com',
      path: '/v1/pages',
      query: '?locale=en',
    });
  });

  it('keeps the port on the host segment', () => {
    expect(splitUrl('http://localhost:8081/status').host).toBe(
      'http://localhost:8081'
    );
  });

  it('handles a url with no path', () => {
    expect(splitUrl('https://example.com')).toEqual({
      host: 'https://example.com',
      path: '',
      query: '',
    });
  });

  it('handles a url with no path but a query', () => {
    expect(splitUrl('https://example.com?a=1')).toEqual({
      host: 'https://example.com',
      path: '',
      query: '?a=1',
    });
  });

  it('treats a relative url as all path', () => {
    expect(splitUrl('/v1/me')).toEqual({
      host: '',
      path: '/v1/me',
      query: '',
    });
  });

  it('does not throw on an empty or malformed url', () => {
    expect(splitUrl('')).toEqual({ host: '', path: '', query: '' });
    expect(() => splitUrl('http://')).not.toThrow();
  });

  it('keeps a question mark inside the query intact', () => {
    expect(splitUrl('https://e.com/a?q=what?').query).toBe('?q=what?');
  });
});

describe('parseQueryParams', () => {
  it('parses key/value pairs', () => {
    expect(parseQueryParams('?a=1&b=two')).toEqual([
      ['a', '1'],
      ['b', 'two'],
    ]);
  });

  it('handles a flag with no value', () => {
    expect(parseQueryParams('?fresh')).toEqual([['fresh', '']]);
  });

  it('keeps everything after the first equals sign', () => {
    expect(parseQueryParams('?redirect=https://x.com/?a=1')).toEqual([
      ['redirect', 'https://x.com/?a=1'],
    ]);
  });

  it('returns an empty array for an empty query', () => {
    expect(parseQueryParams('')).toEqual([]);
    expect(parseQueryParams('?')).toEqual([]);
  });
});

describe('decodeQuery', () => {
  it('percent-decodes and converts plus to space', () => {
    expect(decodeQuery('?q=hello+world%21')).toBe('?q=hello world!');
  });

  it('returns the raw value on a malformed escape rather than throwing', () => {
    expect(decodeQuery('?q=%E0%A4%A')).toBe('?q=%E0%A4%A');
  });
});
