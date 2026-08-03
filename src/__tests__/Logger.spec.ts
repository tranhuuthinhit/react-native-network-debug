import Logger from '../Logger';
import XHRInterceptor from '../XHRInterceptor';

/** Minimal stand-in for the xhr object the interceptor passes through. */
type FakeXhr = { _index: number; responseHeaders?: Record<string, string> };

const callbacks: Record<string, (...args: any[]) => void> = {};

jest.mock('../XHRInterceptor', () => ({
  __esModule: true,
  default: {
    isInterceptorEnabled: () => false,
    enableInterception: jest.fn(),
    disableInterception: jest.fn(),
    setOpenCallback: (cb: any) => (callbacks.open = cb),
    setRequestHeaderCallback: (cb: any) => (callbacks.header = cb),
    setHeaderReceivedCallback: (cb: any) => (callbacks.received = cb),
    setSendCallback: (cb: any) => (callbacks.send = cb),
    setResponseCallback: (cb: any) => (callbacks.response = cb),
    setProgressCallback: (cb: any) => (callbacks.progress = cb),
    setErrorCallback: (cb: any) => (callbacks.error = cb),
  },
}));

describe('Logger', () => {
  let logger: Logger;

  const open = (url = 'https://api.example.com/v1/pages') => {
    const xhr: FakeXhr = { _index: 0 };
    callbacks.open('GET', url, xhr);
    return xhr;
  };

  beforeEach(() => {
    logger = new Logger();
    logger.enableXHRInterception({ forceEnable: true });
  });

  it('captures an opened request', () => {
    open();
    expect(logger.getRequests()).toHaveLength(1);
    expect(logger.getRequests()[0].url).toBe(
      'https://api.example.com/v1/pages'
    );
  });

  it('prepends new requests so newest is first', () => {
    open('https://a.example.com/1');
    open('https://b.example.com/2');

    expect(logger.getRequests()[0].url).toBe('https://b.example.com/2');
  });

  it('evicts the oldest entry once the buffer is full', () => {
    const small = new Logger();
    small.enableXHRInterception({ forceEnable: true, maxRequests: 2 });

    for (let i = 0; i < 4; i += 1) {
      const xhr: FakeXhr = { _index: i };
      callbacks.open('GET', `https://e.com/${i}`, xhr);
    }

    expect(small.getRequests()).toHaveLength(2);
    expect(small.getRequests()[0].url).toBe('https://e.com/3');
  });

  it('respects ignoredHosts', () => {
    const filtered = new Logger();
    filtered.enableXHRInterception({
      forceEnable: true,
      ignoredHosts: ['analytics.example.com'],
    });

    callbacks.open('GET', 'https://analytics.example.com/t', { _index: 9 });
    expect(filtered.getRequests()).toHaveLength(0);
  });

  it('respects ignoredPatterns against `method url`', () => {
    const filtered = new Logger();
    filtered.enableXHRInterception({
      forceEnable: true,
      ignoredPatterns: [/^POST .*\/metrics$/],
    });

    callbacks.open('POST', 'https://e.com/metrics', { _index: 9 });
    expect(filtered.getRequests()).toHaveLength(0);
  });

  describe('redaction', () => {
    it('masks an auth header at capture time', () => {
      const xhr = open();
      callbacks.header('Authorization', 'Bearer abcdefghijklmnop3f9a', xhr);

      const request = logger.getRequests()[0];
      expect(request.requestHeaders.Authorization).toBe(
        'Bearer ••••••••••••••••3f9a'
      );
      expect(request.redactedHeaders.has('Authorization')).toBe(true);
    });

    it('leaves ordinary headers alone', () => {
      const xhr = open();
      callbacks.header('Accept', 'application/json', xhr);

      expect(logger.getRequests()[0].requestHeaders.Accept).toBe(
        'application/json'
      );
    });

    it('stores the real value when redaction is off', () => {
      const plain = new Logger();
      plain.enableXHRInterception({
        forceEnable: true,
        redactAuthHeaders: false,
      });

      const xhr: FakeXhr = { _index: 5 };
      callbacks.open('GET', 'https://e.com/x', xhr);
      callbacks.header('Authorization', 'Bearer secret-token-value', xhr);

      expect(plain.getRequests()[0].requestHeaders.Authorization).toBe(
        'Bearer secret-token-value'
      );
    });
  });

  it('records the headers-received mark so timing can be derived', () => {
    const xhr = open();
    callbacks.send('', xhr);
    xhr.responseHeaders = { 'content-type': 'application/json' };
    callbacks.received('application/json', 120, xhr.responseHeaders, xhr);

    expect(logger.getRequests()[0].headersReceivedTime).toBeGreaterThan(0);
  });

  it('marks a transport failure as failed with a reason', () => {
    const xhr = open();
    callbacks.send('', xhr);
    callbacks.error('network_error', xhr);

    const request = logger.getRequests()[0];
    expect(request.state).toBe('failed');
    expect(request.errorReason).toBe('network_error');
  });

  it('marks an abort as cancelled, not failed', () => {
    const xhr = open();
    callbacks.send('', xhr);
    callbacks.error('cancelled', xhr);

    expect(logger.getRequests()[0].state).toBe('cancelled');
  });

  it('derives a reason phrase for a 5xx', () => {
    const xhr = open();
    callbacks.send('', xhr);
    callbacks.response(500, 0, 'boom', '', 'text', xhr);

    expect(logger.getRequests()[0].errorReason).toBe('internal_server_error');
  });

  it('does not overwrite a recorded failure with a bogus 0 status', () => {
    const xhr = open();
    callbacks.send('', xhr);
    callbacks.error('timeout', xhr);
    callbacks.response(0, 0, '', '', '', xhr);

    expect(logger.getRequests()[0].errorReason).toBe('timeout');
  });

  it('drops an oversized body and marks it truncated', () => {
    const capped = new Logger();
    capped.enableXHRInterception({
      forceEnable: true,
      maxResponseBodySize: 10,
    });

    const xhr: FakeXhr = { _index: 7 };
    callbacks.open('GET', 'https://e.com/big', xhr);
    callbacks.send('', xhr);
    callbacks.response(200, 0, 'x'.repeat(50), '', 'text', xhr);

    const request = capped.getRequests()[0];
    expect(request.truncated).toBe(true);
    expect(request.response).toBe('');
  });

  it('learns the real size from progress events', () => {
    const xhr = open();
    callbacks.send('', xhr);
    callbacks.progress(2048, 4096, xhr);

    expect(logger.getRequests()[0].responseSize).toBe(4096);
  });

  describe('pause', () => {
    it('holds requests aside while paused and releases them on resume', () => {
      logger.onPausedChange(true);

      const xhr: FakeXhr = { _index: 3 };
      callbacks.open('GET', 'https://e.com/paused', xhr);
      expect(logger.getRequests()).toHaveLength(0);

      logger.onPausedChange(false);
      expect(logger.getRequests()).toHaveLength(1);
    });

    it('reports its paused state', () => {
      expect(logger.isPaused).toBe(false);
      logger.onPausedChange(true);
      expect(logger.isPaused).toBe(true);
    });
  });

  it('records when logs were cleared', () => {
    open();
    logger.clearRequests();

    expect(logger.getRequests()).toHaveLength(0);
    expect(logger.getClearedAt()).toBeGreaterThan(0);
  });

  it('trims the buffer when the limit is lowered', () => {
    for (let i = 0; i < 5; i += 1) {
      callbacks.open('GET', `https://e.com/${i}`, { _index: i });
    }
    logger.setMaxRequests(2);

    expect(logger.getRequests()).toHaveLength(2);
  });

  it('enables the underlying interceptor', () => {
    expect(XHRInterceptor.enableInterception).toHaveBeenCalled();
  });
});
