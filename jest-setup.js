/* eslint-disable no-undef */

// The library reads FileReader off the global rather than deep-importing
// React Native internals. Node provides one, but the RN jest preset runs
// in a bare `node` environment, so supply a minimal stand-in.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    constructor() {
      this.result = '';
      this.error = null;
      this.listeners = {};
    }

    addEventListener(name, callback) {
      this.listeners[name] = callback;
    }

    readAsText(blob) {
      this.result = typeof blob === 'string' ? blob : String(blob);
      this.listeners.load?.();
    }
  };
}

// The interceptor patches `XMLHttpRequest.prototype`, which the RN jest
// environment does not define. A stub with the constants and methods the
// interceptor touches is enough for the components to mount; the
// interceptor's own behaviour is covered by Logger.spec with a fake xhr.
if (typeof globalThis.XMLHttpRequest === 'undefined') {
  class StubXMLHttpRequest {
    open() {}
    send() {}
    abort() {}
    setRequestHeader() {}
    getResponseHeader() {
      return null;
    }
    getAllResponseHeaders() {
      return '';
    }
    addEventListener() {}
  }

  StubXMLHttpRequest.UNSENT = 0;
  StubXMLHttpRequest.OPENED = 1;
  StubXMLHttpRequest.HEADERS_RECEIVED = 2;
  StubXMLHttpRequest.LOADING = 3;
  StubXMLHttpRequest.DONE = 4;

  globalThis.XMLHttpRequest = StubXMLHttpRequest;
}
