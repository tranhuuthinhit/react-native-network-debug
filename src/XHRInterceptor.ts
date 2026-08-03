// Type declarations for globals provided by the React Native runtime.
declare class URL {
  constructor(url: string, base?: string);
  toString(): string;
}

declare class XMLHttpRequest {
  static readonly UNSENT: number;
  static readonly OPENED: number;
  static readonly HEADERS_RECEIVED: number;
  static readonly LOADING: number;
  static readonly DONE: number;

  readonly readyState: number;
  readonly response: any;
  readonly responseText: string;
  responseType: string;
  readonly responseURL: string;
  readonly status: number;
  readonly statusText: string;
  timeout: number;

  onreadystatechange: ((this: XMLHttpRequest, ev: any) => any) | null;

  open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void;
  send(body?: any): void;
  abort(): void;
  setRequestHeader(header: string, value: string): void;
  getResponseHeader(name: string): string | null;
  getAllResponseHeaders(): string;
  addEventListener(
    type: string,
    listener: (this: XMLHttpRequest, ev: any) => any
  ): void;
}

// Callback types use 'any' to match React Native's XHRInterceptor API
// This allows Logger.ts to use its own types (RequestMethod, XHR, etc.)
type OpenCallback = (...args: any[]) => void;
type RequestHeaderCallback = (...args: any[]) => void;
type SendCallback = (...args: any[]) => void;
type HeaderReceivedCallback = (...args: any[]) => void;
type ResponseCallback = (...args: any[]) => void;
type ProgressCallback = (...args: any[]) => void;
type ErrorCallback = (...args: any[]) => void;

// Store original XMLHttpRequest methods
let originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
let originalXHRSetRequestHeader:
  typeof XMLHttpRequest.prototype.setRequestHeader | null = null;

// Callbacks
const noop = () => {};
let openCallback: OpenCallback = noop;
let requestHeaderCallback: RequestHeaderCallback = noop;
let sendCallback: SendCallback = noop;
let headerReceivedCallback: HeaderReceivedCallback = noop;
let responseCallback: ResponseCallback = noop;
let progressCallback: ProgressCallback = noop;
let errorCallback: ErrorCallback = noop;

let isInterceptorEnabled = false;

function parseResponseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headersString) return headers;

  const headerLines = headersString.trim().split('\r\n');
  for (const line of headerLines) {
    const index = line.indexOf(':');
    if (index > 0) {
      const key = line.substring(0, index).trim();
      const value = line.substring(index + 1).trim();
      headers[key] = value;
    }
  }
  return headers;
}

/** Interceptor callbacks must never break the request they observe. */
function guard(fn: () => void) {
  try {
    fn();
  } catch {
    // Swallowed on purpose.
  }
}

function enableInterception(): void {
  if (isInterceptorEnabled) return;

  // Store original methods
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;
  originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // Override open
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ): void {
    const xhr = this as any;
    xhr._interception = {
      method,
      url: url.toString(),
    };

    guard(() => openCallback(method, url.toString(), this));

    return originalXHROpen!.call(
      this,
      method,
      url,
      async,
      username ?? null,
      password ?? null
    );
  };

  // Override setRequestHeader
  XMLHttpRequest.prototype.setRequestHeader = function (
    header: string,
    value: string
  ): void {
    guard(() => requestHeaderCallback(header, value, this));
    return originalXHRSetRequestHeader!.call(this, header, value);
  };

  // Override send
  XMLHttpRequest.prototype.send = function (body?: any): void {
    const xhr = this as any;

    const dataString = body === null || body === undefined ? '' : String(body);
    guard(() => sendCallback(dataString, xhr));

    // addEventListener is more reliable than overriding onreadystatechange:
    // it still fires when the app assigns handlers after send() is called.
    if (typeof this.addEventListener === 'function') {
      this.addEventListener(
        'readystatechange',
        function (this: XMLHttpRequest) {
          if (this.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
            if (!xhr._interception?.hasCalledHeaderReceived) {
              if (xhr._interception) {
                xhr._interception.hasCalledHeaderReceived = true;
              }
              const contentType = this.getResponseHeader('content-type') || '';
              const contentLength = this.getResponseHeader('content-length');
              const responseSize = contentLength
                ? parseInt(contentLength, 10)
                : 0;
              const responseHeaders = parseResponseHeaders(
                this.getAllResponseHeaders()
              );

              // Set responseHeaders on xhr for compatibility with Logger.ts
              xhr.responseHeaders = responseHeaders;

              guard(() =>
                headerReceivedCallback(
                  contentType,
                  responseSize,
                  responseHeaders,
                  xhr
                )
              );
            }
          }

          if (this.readyState === XMLHttpRequest.DONE) {
            if (!xhr._interception?.hasCalledResponse) {
              if (xhr._interception) {
                xhr._interception.hasCalledResponse = true;
              }
              let responseData: any = this.response;
              if (this.responseType === '' || this.responseType === 'text') {
                responseData = this.responseText || '';
              } else if (this.responseType === 'json' && this.response) {
                try {
                  responseData = JSON.stringify(this.response);
                } catch {
                  responseData = '[Unable to stringify response]';
                }
              }

              guard(() =>
                responseCallback(
                  this.status,
                  this.timeout,
                  responseData,
                  this.responseURL,
                  this.responseType,
                  xhr,
                  this.statusText
                )
              );
            }
          }
        }
      );

      // `content-length` is absent on chunked responses; the progress
      // event is the only way to learn the real transferred size.
      this.addEventListener('progress', function (ev: any) {
        if (typeof ev?.loaded === 'number') {
          guard(() => progressCallback(ev.loaded, ev.total ?? 0, xhr));
        }
      });

      // Distinguish a transport failure from a 4xx/5xx, and an
      // app-initiated abort from either — the list renders all three
      // differently.
      const failure = (reason: string) => () => {
        if (xhr._interception?.hasCalledFailure) return;
        if (xhr._interception) xhr._interception.hasCalledFailure = true;
        guard(() => errorCallback(reason, xhr));
      };

      this.addEventListener('error', failure('network_error'));
      this.addEventListener('timeout', failure('timeout'));
      this.addEventListener('abort', failure('cancelled'));
    }

    return originalXHRSend!.call(this, body);
  };

  isInterceptorEnabled = true;
}

function disableInterception(): void {
  if (!isInterceptorEnabled) return;

  // Restore original methods
  if (originalXHROpen) {
    XMLHttpRequest.prototype.open = originalXHROpen;
    originalXHROpen = null;
  }
  if (originalXHRSend) {
    XMLHttpRequest.prototype.send = originalXHRSend;
    originalXHRSend = null;
  }
  if (originalXHRSetRequestHeader) {
    XMLHttpRequest.prototype.setRequestHeader = originalXHRSetRequestHeader;
    originalXHRSetRequestHeader = null;
  }

  // Reset callbacks
  openCallback = noop;
  requestHeaderCallback = noop;
  sendCallback = noop;
  headerReceivedCallback = noop;
  responseCallback = noop;
  progressCallback = noop;
  errorCallback = noop;

  isInterceptorEnabled = false;
}

const XHRInterceptor = {
  isInterceptorEnabled: () => isInterceptorEnabled,
  setOpenCallback: (callback: OpenCallback) => {
    openCallback = callback;
  },
  setRequestHeaderCallback: (callback: RequestHeaderCallback) => {
    requestHeaderCallback = callback;
  },
  setSendCallback: (callback: SendCallback) => {
    sendCallback = callback;
  },
  setHeaderReceivedCallback: (callback: HeaderReceivedCallback) => {
    headerReceivedCallback = callback;
  },
  setResponseCallback: (callback: ResponseCallback) => {
    responseCallback = callback;
  },
  setProgressCallback: (callback: ProgressCallback) => {
    progressCallback = callback;
  },
  setErrorCallback: (callback: ErrorCallback) => {
    errorCallback = callback;
  },
  enableInterception,
  disableInterception,
};

export default XHRInterceptor;
