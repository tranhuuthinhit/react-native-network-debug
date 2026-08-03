import NetworkRequestInfo from '../NetworkRequestInfo';

const make = (url = 'https://api.example.com/v1/pages?locale=en') =>
  new NetworkRequestInfo('1', 'XMLHttpRequest', 'GET', url);

describe('NetworkRequestInfo', () => {
  it('splits the url and memoises the result', () => {
    const request = make();

    expect(request.splitUrl).toEqual({
      host: 'https://api.example.com',
      path: '/v1/pages',
      query: '?locale=en',
    });
    expect(request.splitUrl).toBe(request.splitUrl);
  });

  it('recomputes the split when the url changes', () => {
    const request = make();
    const before = request.splitUrl;

    request.update({ url: 'https://other.example.com/x' });

    expect(request.splitUrl).not.toBe(before);
    expect(request.host).toBe('other.example.com');
  });

  it('strips the scheme from host', () => {
    expect(make().host).toBe('api.example.com');
  });

  it('reports -1 duration until both timestamps exist', () => {
    const request = make();
    expect(request.duration).toBe(-1);

    request.update({ startTime: 1000 });
    expect(request.duration).toBe(-1);

    request.update({ endTime: 1640 });
    expect(request.duration).toBe(640);
  });

  describe('statusClass', () => {
    it.each([
      [200, '2xx'],
      [204, '2xx'],
      [301, '3xx'],
      [404, '4xx'],
      [500, '5xx'],
    ])('maps %i to %s', (status, expected) => {
      const request = make();
      request.update({ status, state: 'done' });
      expect(request.statusClass).toBe(expected);
    });

    it('maps a failed request to `failed` regardless of status', () => {
      const request = make();
      request.update({ status: 0, state: 'failed' });
      expect(request.statusClass).toBe('failed');
    });
  });

  it('treats 4xx and above as an error', () => {
    const request = make();
    request.update({ status: 404, state: 'done' });
    expect(request.isError).toBe(true);

    request.update({ status: 200 });
    expect(request.isError).toBe(false);
  });

  describe('timing', () => {
    it('derives queued, waiting and download from the interceptor marks', () => {
      const request = make();
      request.openTime = 1000;
      request.update({
        startTime: 1030,
        headersReceivedTime: 4098,
        endTime: 4880,
      });

      expect(request.timing).toEqual({
        queued: 30,
        waiting: 3068,
        download: 782,
      });
    });

    it('omits DNS, TCP and TLS because XHR cannot measure them', () => {
      const request = make();
      request.openTime = 1000;
      request.update({
        startTime: 1030,
        headersReceivedTime: 1100,
        endTime: 1200,
      });

      expect(request.timing.dns).toBeUndefined();
      expect(request.timing.tcp).toBeUndefined();
      expect(request.timing.tls).toBeUndefined();
    });

    it('attributes the whole span to waiting when headers never arrived', () => {
      const request = make();
      request.openTime = 1000;
      request.update({ startTime: 1000, endTime: 1500, state: 'failed' });

      expect(request.timing).toEqual({ waiting: 500 });
    });

    it('returns an empty object for a request that never sent', () => {
      expect(make().timing).toEqual({});
    });
  });

  it('exposes a curl command through the legacy getter', () => {
    const request = make();
    request.requestHeaders = { Accept: 'application/json' };

    expect(request.curlRequest).toContain('curl');
    expect(request.curlRequest).toContain("-H 'Accept: application/json'");
  });

  it('reports a truncated body instead of returning a stale payload', async () => {
    const request = make();
    request.update({ truncated: true, status: 200, endTime: 1 });

    await expect(request.getResponseBody()).resolves.toContain(
      'exceeded the size limit'
    );
  });

  it('says pending before a response arrives', async () => {
    await expect(make().getResponseBody()).resolves.toBe('Pending response...');
  });

  it('projects a row that carries the split url and state', () => {
    const request = make();
    request.update({ status: 200, startTime: 1, endTime: 2, state: 'done' });

    const row = request.toRow();
    expect(row.splitUrl.path).toBe('/v1/pages');
    expect(row.state).toBe('done');
    expect(row.duration).toBe(1);
  });
});
