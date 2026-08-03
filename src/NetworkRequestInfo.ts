import {
  Headers,
  NetworkRequestInfoRow,
  RequestMethod,
  RequestState,
  RequestTiming,
  StatusClass,
} from './types';
import fromEntries from './utils/fromEntries';
import splitUrl, { SplitUrl } from './utils/splitUrl';
import generateCode, { CodeFormat, CodegenOptions } from './utils/codegen';

/**
 * RN polyfills `FileReader` on the global object. Earlier versions of
 * this library deep-imported `react-native/Libraries/Blob/FileReader`,
 * which RN 0.80+ flags as a deprecated internal import and 0.83 blocks
 * outright via the package `exports` map. Reading it off the global
 * keeps the same behaviour with no reach into RN internals.
 */
const getFileReader = (): (new () => any) | undefined =>
  (globalThis as any)?.FileReader;

export default class NetworkRequestInfo {
  id = '';
  type = '';
  url = '';
  method: RequestMethod;
  status: number = -1;
  statusText = '';
  dataSent = '';
  responseContentType = '';
  responseSize = 0;
  requestHeaders: Headers = {};
  responseHeaders: Headers = {};
  response = '';
  responseURL = '';
  responseType = '';
  timeout = 0;
  closeReason = '';
  messages = '';
  serverClose = undefined;
  serverError = undefined;
  startTime: number = 0;
  endTime: number = 0;
  gqlOperation?: string;
  updatedAt: number = 0;

  /* ── Added by the redesign ──────────────────────────────── */

  /** Set when the request opened, before `send()`. */
  openTime: number = 0;
  /** Set at `HEADERS_RECEIVED` — the boundary between wait and download. */
  headersReceivedTime: number = 0;
  /** Lifecycle state, drives the row's opacity and the status pill. */
  state: RequestState = 'pending';
  /** e.g. `internal_server_error · retry 1/3`, shown on error rows. */
  errorReason?: string;
  /** Header names whose values were masked at capture time. */
  redactedHeaders: Set<string> = new Set();
  /** True when the body exceeded `maxResponseBodySize` and was dropped. */
  truncated = false;

  private cachedSplitUrl?: SplitUrl;

  constructor(id: string, type: string, method: RequestMethod, url: string) {
    this.id = id;
    this.type = type;
    this.method = method;
    this.url = url;
    this.openTime = Date.now();
    this.updatedAt = this.openTime;
  }

  get duration() {
    if (!this.startTime) return -1;
    if (!this.endTime) return -1;
    return this.endTime - this.startTime;
  }

  /** Host / path / query, computed once per URL and memoised. */
  get splitUrl(): SplitUrl {
    if (!this.cachedSplitUrl) {
      this.cachedSplitUrl = splitUrl(this.url);
    }
    return this.cachedSplitUrl;
  }

  get host() {
    return this.splitUrl.host.replace(/^[a-z]+:\/\//i, '');
  }

  get statusClass(): StatusClass {
    if (this.state === 'failed' || this.status < 0) return 'failed';
    if (this.status < 300) return '2xx';
    if (this.status < 400) return '3xx';
    if (this.status < 500) return '4xx';
    return '5xx';
  }

  get isError() {
    return this.state === 'failed' || this.status >= 400;
  }

  /**
   * Phase breakdown derived from the interceptor's marks. Only phases
   * that were actually observed are present — see `RequestTiming` for
   * why DNS/TCP/TLS are absent.
   */
  get timing(): RequestTiming {
    const timing: RequestTiming = {};

    if (this.openTime && this.startTime && this.startTime > this.openTime) {
      timing.queued = this.startTime - this.openTime;
    }

    if (this.startTime && this.headersReceivedTime) {
      timing.waiting = this.headersReceivedTime - this.startTime;
      if (this.endTime) {
        timing.download = this.endTime - this.headersReceivedTime;
      }
    } else if (this.startTime && this.endTime) {
      // Never saw HEADERS_RECEIVED (e.g. a network failure) — the whole
      // span is wait time; claiming a download phase would be a lie.
      timing.waiting = this.endTime - this.startTime;
    }

    return timing;
  }

  /** Kept for backwards compatibility with v3's public shape. */
  get curlRequest() {
    return this.getCode('curl');
  }

  getCode(format: CodeFormat = 'curl', options?: CodegenOptions) {
    return generateCode(
      format,
      {
        method: this.method,
        url: this.url,
        headers: this.requestHeaders,
        body: this.dataSent ? String(this.dataSent) : undefined,
      },
      options
    );
  }

  update(values: Partial<NetworkRequestInfo>) {
    Object.assign(this, values);
    if (values.url !== undefined) {
      this.cachedSplitUrl = undefined;
    }
    if (values.dataSent) {
      const data = this.parseData(values.dataSent);
      this.gqlOperation = data?.operationName;
    }
    this.updatedAt = Date.now();
  }

  private parseData(data: any) {
    try {
      if (data?._parts?.length) {
        return fromEntries(data?._parts);
      }
      return JSON.parse(data);
    } catch {
      return { data };
    }
  }

  private stringifyFormat(data: any) {
    return JSON.stringify(this.parseData(data), null, 2);
  }

  public toRow(): NetworkRequestInfoRow {
    return {
      url: this.url,
      splitUrl: this.splitUrl,
      gqlOperation: this.gqlOperation,
      id: this.id,
      method: this.method,
      status: this.status,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      responseSize: this.responseSize,
      errorReason: this.errorReason,
      state: this.state,
    };
  }

  getRequestBody(replaceEscaped = false) {
    const body = this.stringifyFormat(this.dataSent);

    if (replaceEscaped) {
      return body.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    return body;
  }

  private async parseResponseBlob() {
    if (this.response === null || this.response === undefined) {
      return '';
    }

    const FileReaderImpl = getFileReader();
    if (!FileReaderImpl) {
      return '[Blob responses require a FileReader polyfill]';
    }

    const blobReader = new FileReaderImpl();
    return await new Promise<string>((resolve, reject) => {
      const handleError = () => reject(blobReader.error);

      blobReader.addEventListener('load', () => {
        resolve(blobReader.result);
      });
      blobReader.addEventListener('error', handleError);
      blobReader.addEventListener('abort', handleError);

      try {
        blobReader.readAsText(this.response);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getResponseBody() {
    if (this.truncated) {
      return '[Response body exceeded the size limit and was not stored]';
    }

    if (this.endTime === 0 && this.status < 0) {
      return 'Pending response...';
    }

    try {
      const body = await (this.responseType !== 'blob'
        ? this.response
        : this.parseResponseBlob());

      if (body === '' || body === null || body === undefined) {
        return '';
      }

      return this.stringifyFormat(body);
    } catch {
      return '[Unable to load response body]';
    }
  }
}
