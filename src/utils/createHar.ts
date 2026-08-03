import NetworkRequestInfo from '../NetworkRequestInfo';

/** HAR expects -1 for any timing it was not given. */
const harTiming = (value?: number) =>
  value === undefined || value <= 0 ? -1 : value;

const createHarEntry = async (request: NetworkRequestInfo) => {
  const body = request.getRequestBody();
  const timing = request.timing;

  return {
    request: {
      method: request.method,
      url: request.url.replace(/\s/g, '%20'),
      httpVersion: 'HTTP/1.1',
      headers: Object.entries(request.requestHeaders).map(([name, value]) => ({
        name,
        value,
      })),
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: body && body !== 'null' ? body.length : -1,
      ...(body && body !== 'null'
        ? {
            postData: {
              mimeType:
                Object.entries(request.requestHeaders).find(
                  ([name]) => name.toLowerCase() === 'content-type'
                )?.[1] ?? 'application/json',
              text: body,
            },
          }
        : {}),
    },
    response: {
      status: request.status,
      statusText: request.statusText || '',
      httpVersion: 'HTTP/1.1',
      headers: Object.entries(request.responseHeaders).map(([name, value]) => ({
        name,
        value,
      })),
      cookies: [],
      content: {
        size: request.responseSize || -1,
        mimeType: request.responseContentType || request.responseType || '',
        text: await request.getResponseBody(),
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: request.responseSize || -1,
    },

    cache: {},
    startedDateTime: new Date(request.startTime).toISOString(),
    time: request.duration >= 0 ? request.duration : -1,
    // Only the phases the interceptor can actually observe are filled in;
    // DNS, SSL and connect stay at -1 rather than being invented.
    timings: {
      blocked: harTiming(timing.queued),
      dns: harTiming(timing.dns),
      ssl: harTiming(timing.tls),
      connect: harTiming(timing.tcp),
      send: harTiming(timing.sent),
      wait: harTiming(timing.waiting),
      receive: harTiming(timing.download),
      _blocked_queueing: harTiming(timing.queued),
    },
  };
};

/**
 * Minimal HAR 1.2 archive — opens in Chrome DevTools, Charles and
 * Proxyman. Header values are already redacted at capture time, so an
 * exported archive contains no live credentials.
 */
const createHar = async (requests: NetworkRequestInfo[]) => {
  const har = {
    log: {
      version: '1.2',
      creator: {
        name: 'react-native-network-debug',
        version: '1.0.0',
      },
      pages: [],
      entries: await Promise.all(requests.map(createHarEntry)),
    },
  };

  return har;
};

export default createHar;
