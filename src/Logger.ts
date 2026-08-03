import XHRInterceptor from './XHRInterceptor';
import NetworkRequestInfo from './NetworkRequestInfo';
import { Headers, RequestMethod, StartNetworkLoggingOptions } from './types';
import extractHost from './utils/extractHost';
import { warn } from './utils/logger';
import debounce from './utils/debounce';
import {
  LOGGER_MAX_REQUESTS,
  LOGGER_MAX_RESPONSE_BODY_SIZE,
  LOGGER_REFRESH_RATE,
} from './constant';
import { isRedactableHeader, maskValue } from './utils/redact';

let nextXHRId = 0;

type XHR = {
  _index: number;
  responseHeaders?: Headers;
};

export default class Logger {
  private requests: NetworkRequestInfo[] = [];
  private pausedRequests: NetworkRequestInfo[] = [];
  private xhrIdMap: Map<number, () => number> = new Map();
  private maxRequests: number = LOGGER_MAX_REQUESTS;
  private refreshRate: number = LOGGER_REFRESH_RATE;
  private maxResponseBodySize: number = LOGGER_MAX_RESPONSE_BODY_SIZE;
  private latestRequestUpdatedAt: number = 0;
  private ignoredHosts: Set<string> | undefined;
  private ignoredUrls: Set<string> | undefined;
  private ignoredPatterns: RegExp[] | undefined;
  private redactAuthHeaders = true;
  private redactedHeaderNames: string[] = [];
  private paused = false;
  private clearedAt: number | null = null;
  public enabled = false;

  callback = (_: NetworkRequestInfo[]) => null;

  setCallback = (callback: any) => {
    this.callback = callback;
  };

  debouncedCallback = debounce(() => {
    if (
      !this.latestRequestUpdatedAt ||
      this.requests.some((r) => r.updatedAt > this.latestRequestUpdatedAt)
    ) {
      this.latestRequestUpdatedAt = Date.now();
      // prevent mutation of requests for all subscribers
      this.callback([...this.requests]);
    }
  }, this.refreshRate);

  private getRequest = (xhrIndex?: number) => {
    if (xhrIndex === undefined) return undefined;
    if (!this.xhrIdMap.has(xhrIndex)) return undefined;
    const index = this.xhrIdMap.get(xhrIndex)!();
    return (this.paused ? this.pausedRequests : this.requests)[index];
  };

  private updateRequest = (
    index: number,
    update: Partial<NetworkRequestInfo>
  ) => {
    const networkInfo = this.getRequest(index);
    if (!networkInfo) return;
    networkInfo.update(update);
  };

  private openCallback = (method: RequestMethod, url: string, xhr: XHR) => {
    if (this.ignoredHosts) {
      const host = extractHost(url);
      if (host && this.ignoredHosts.has(host)) {
        return;
      }
    }

    if (this.ignoredUrls && this.ignoredUrls.has(url)) {
      return;
    }

    if (this.ignoredPatterns) {
      if (
        this.ignoredPatterns.some((pattern) => pattern.test(`${method} ${url}`))
      ) {
        return;
      }
    }

    xhr._index = nextXHRId++;
    this.xhrIdMap.set(xhr._index, () => {
      return (this.paused ? this.pausedRequests : this.requests).findIndex(
        (r) => r.id === `${xhr._index}`
      );
    });

    const newRequest = new NetworkRequestInfo(
      `${xhr._index}`,
      'XMLHttpRequest',
      method,
      url
    );

    if (this.paused) {
      const logsLength = this.pausedRequests.length + this.requests.length;
      if (logsLength > this.maxRequests) {
        if (this.requests.length > 0) this.requests.pop();
        else this.pausedRequests.pop();
      }
      this.pausedRequests.push(newRequest);
    } else {
      this.requests.unshift(newRequest);
      if (this.requests.length > this.maxRequests) {
        this.requests.pop();
      }
    }
  };

  private requestHeadersCallback = (
    header: string,
    value: string,
    xhr: XHR
  ) => {
    const networkInfo = this.getRequest(xhr._index);
    if (!networkInfo) return;

    // Redaction happens here, at capture time, rather than in the
    // renderer — so a HAR export or a shared cURL command can never
    // contain a live credential, whatever the UI is showing.
    if (
      this.redactAuthHeaders &&
      isRedactableHeader(header, this.redactedHeaderNames)
    ) {
      networkInfo.requestHeaders[header] = maskValue(String(value));
      networkInfo.redactedHeaders.add(header);
    } else {
      networkInfo.requestHeaders[header] = value;
    }
  };

  private redactResponseHeaders = (headers: Headers | undefined) => {
    if (!headers) return headers;
    if (!this.redactAuthHeaders) return headers;

    const out: Headers = {};
    Object.entries(headers).forEach(([name, value]) => {
      out[name] = isRedactableHeader(name, this.redactedHeaderNames)
        ? maskValue(String(value))
        : value;
    });
    return out;
  };

  private headerReceivedCallback = (
    responseContentType: string,
    responseSize: number,
    _responseHeaders: Headers,
    xhr: XHR
  ) => {
    const networkInfo = this.getRequest(xhr._index);

    this.updateRequest(xhr._index, {
      responseContentType,
      // Keep a non-zero size we may already have learnt from `progress`.
      responseSize: responseSize || networkInfo?.responseSize || 0,
      responseHeaders: this.redactResponseHeaders(xhr.responseHeaders),
      // The wait/download boundary. Recorded here because this is the
      // only point at which JS learns the server has started replying.
      headersReceivedTime: Date.now(),
    });

    if (networkInfo) {
      const redacted = Object.keys(xhr.responseHeaders ?? {}).filter((name) =>
        isRedactableHeader(name, this.redactedHeaderNames)
      );
      if (this.redactAuthHeaders) {
        redacted.forEach((name) => networkInfo.redactedHeaders.add(name));
      }
    }
  };

  private sendCallback = (data: string, xhr: XHR) => {
    this.updateRequest(xhr._index, {
      startTime: Date.now(),
      dataSent: data,
      state: 'pending',
    });
    this.debouncedCallback();
  };

  private progressCallback = (loaded: number, total: number, xhr: XHR) => {
    const networkInfo = this.getRequest(xhr._index);
    if (!networkInfo) return;
    const size = total || loaded;
    if (size > networkInfo.responseSize) {
      networkInfo.responseSize = size;
    }
  };

  private errorCallback = (reason: string, xhr: XHR) => {
    const networkInfo = this.getRequest(xhr._index);
    if (!networkInfo) return;

    this.updateRequest(xhr._index, {
      endTime: Date.now(),
      state: reason === 'cancelled' ? 'cancelled' : 'failed',
      errorReason: reason,
    });
    this.debouncedCallback();
  };

  private responseCallback = (
    status: number,
    timeout: number,
    response: string,
    responseURL: string,
    responseType: string,
    xhr: XHR,
    statusText?: string
  ) => {
    const networkInfo = this.getRequest(xhr._index);

    // A DONE readyState with status 0 means the transport failed; the
    // `error`/`timeout`/`abort` listener has usually already recorded
    // the reason, so don't overwrite it with a bogus 0 status.
    if (status === 0 && networkInfo?.state && networkInfo.state !== 'pending') {
      this.debouncedCallback();
      return;
    }

    const size = typeof response === 'string' ? response.length : 0;
    const tooLarge = size > this.maxResponseBodySize;

    this.updateRequest(xhr._index, {
      endTime: Date.now(),
      status,
      statusText: statusText ?? '',
      timeout,
      // Large bodies are dropped rather than retained: holding a
      // multi-megabyte string per entry is what makes an in-app
      // inspector run the app out of memory.
      response: tooLarge ? '' : response,
      truncated: tooLarge,
      responseSize: networkInfo?.responseSize || size,
      responseURL,
      responseType,
      state: status === 0 ? 'failed' : 'done',
      errorReason:
        status === 0
          ? (networkInfo?.errorReason ?? 'network_error')
          : status >= 400
            ? statusText || this.reasonForStatus(status)
            : undefined,
    });
    this.debouncedCallback();
  };

  private reasonForStatus = (status: number) => {
    const reasons: Record<number, string> = {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      408: 'request_timeout',
      409: 'conflict',
      422: 'unprocessable_entity',
      429: 'too_many_requests',
      500: 'internal_server_error',
      502: 'bad_gateway',
      503: 'service_unavailable',
      504: 'gateway_timeout',
    };
    return reasons[status] ?? `http_${status}`;
  };

  enableXHRInterception = (options?: StartNetworkLoggingOptions) => {
    if (
      this.enabled ||
      (XHRInterceptor.isInterceptorEnabled() && !options?.forceEnable)
    ) {
      if (!this.enabled) {
        warn(
          'network interceptor has not been enabled as another interceptor is already running (e.g. another debugging program). Use option `forceEnable: true` to override this behaviour.'
        );
      }
      return;
    }

    if (options?.maxRequests !== undefined) {
      if (typeof options.maxRequests !== 'number' || options.maxRequests < 1) {
        warn(
          'maxRequests must be a number greater than 0. The logger has not been started.'
        );
        return;
      }
      this.maxRequests = options.maxRequests;
    }

    if (options?.ignoredHosts) {
      if (
        !Array.isArray(options.ignoredHosts) ||
        typeof options.ignoredHosts[0] !== 'string'
      ) {
        warn(
          'ignoredHosts must be an array of strings. The logger has not been started.'
        );
        return;
      }
      this.ignoredHosts = new Set(options.ignoredHosts);
    }

    if (options?.refreshRate) {
      if (typeof options.refreshRate !== 'number' || options.refreshRate < 1) {
        warn(
          'refreshRate must be a number greater than 0. The logger has not been started.'
        );
        return;
      }
      this.refreshRate = options.refreshRate;
    }

    if (options?.ignoredPatterns) {
      this.ignoredPatterns = options.ignoredPatterns;
    }

    if (options?.ignoredUrls) {
      if (
        !Array.isArray(options.ignoredUrls) ||
        typeof options.ignoredUrls[0] !== 'string'
      ) {
        warn(
          'ignoredUrls must be an array of strings. The logger has not been started.'
        );
        return;
      }
      this.ignoredUrls = new Set(options.ignoredUrls);
    }

    if (options?.redactAuthHeaders !== undefined) {
      this.redactAuthHeaders = !!options.redactAuthHeaders;
    }

    if (options?.redactedHeaders) {
      if (!Array.isArray(options.redactedHeaders)) {
        warn('redactedHeaders must be an array of strings. Ignoring it.');
      } else {
        this.redactedHeaderNames = options.redactedHeaders;
      }
    }

    if (options?.maxResponseBodySize !== undefined) {
      if (
        typeof options.maxResponseBodySize !== 'number' ||
        options.maxResponseBodySize < 0
      ) {
        warn('maxResponseBodySize must be a non-negative number. Ignoring it.');
      } else {
        this.maxResponseBodySize = options.maxResponseBodySize;
      }
    }

    XHRInterceptor.setOpenCallback(this.openCallback);
    XHRInterceptor.setRequestHeaderCallback(this.requestHeadersCallback);
    XHRInterceptor.setHeaderReceivedCallback(this.headerReceivedCallback);
    XHRInterceptor.setSendCallback(this.sendCallback);
    XHRInterceptor.setResponseCallback(this.responseCallback);
    XHRInterceptor.setProgressCallback(this.progressCallback);
    XHRInterceptor.setErrorCallback(this.errorCallback);

    XHRInterceptor.enableInterception();
    this.enabled = true;
  };

  getRequests = () => {
    return this.requests;
  };

  /** Bytes currently held in the ring buffer — shown in the Options sheet. */
  getBufferSize = () =>
    this.requests.reduce(
      (sum, r) => sum + (r.responseSize || 0) + (r.dataSent?.length || 0),
      0
    );

  getMaxRequests = () => this.maxRequests;

  setMaxRequests = (max: number) => {
    if (typeof max !== 'number' || max < 1) return;
    this.maxRequests = max;
    while (this.requests.length > max) this.requests.pop();
    this.debouncedCallback();
  };

  isRedactionEnabled = () => this.redactAuthHeaders;

  setRedactionEnabled = (enabled: boolean) => {
    this.redactAuthHeaders = enabled;
  };

  get isPaused() {
    return this.paused;
  }

  getClearedAt = () => this.clearedAt;

  clearRequests = () => {
    this.requests = [];
    this.pausedRequests = [];
    this.latestRequestUpdatedAt = 0;
    this.clearedAt = Date.now();
    this.callback([]);
  };

  onPausedChange = (paused: boolean) => {
    if (!paused) {
      this.pausedRequests.forEach((request) => {
        this.requests.unshift(request);
        if (this.requests.length > this.maxRequests) {
          this.requests.pop();
        }
      });
      this.pausedRequests = [];
      this.debouncedCallback();
    }
    this.paused = paused;
  };

  disableXHRInterception = () => {
    if (!this.enabled) return;

    this.clearRequests();

    nextXHRId = 0;
    this.enabled = false;
    this.paused = false;
    this.clearedAt = null;
    this.xhrIdMap.clear();
    this.maxRequests = LOGGER_MAX_REQUESTS;
    this.refreshRate = LOGGER_REFRESH_RATE;
    this.maxResponseBodySize = LOGGER_MAX_RESPONSE_BODY_SIZE;
    this.ignoredHosts = undefined;
    this.ignoredUrls = undefined;
    this.ignoredPatterns = undefined;
    this.redactAuthHeaders = true;
    this.redactedHeaderNames = [];

    const reset = () => null;
    // manually reset callbacks even if the XHRInterceptor lib does it for us with 'disableInterception'
    XHRInterceptor.setOpenCallback(reset);
    XHRInterceptor.setRequestHeaderCallback(reset);
    XHRInterceptor.setHeaderReceivedCallback(reset);
    XHRInterceptor.setSendCallback(reset);
    XHRInterceptor.setResponseCallback(reset);
    XHRInterceptor.setProgressCallback(reset);
    XHRInterceptor.setErrorCallback(reset);

    XHRInterceptor.disableInterception();
  };
}
