# Changelog

## 1.0.0

First release. Forked from
[`react-native-network-logger`](https://github.com/alexbrazier/react-native-network-logger)
v3.0.0 (MIT, © Alex Brazier) with the capture engine kept and the interface
rebuilt from a design handoff.

### Redesigned interface

- **List** — tri-tone URL (host dim / path bright / query mid-dim), always shown
  in full and never truncated. Per-row waterfall bar encoding start offset,
  duration and outcome. Error rows get a red wash, a red-tinted text set and a
  reason line. Cancelled and in-flight rows render de-emphasised.
- **Header status line** — live `recording · N req · avg Xms`, switching to
  amber `paused · cleared HH:MM:SS`.
- **Quick chips** — `All` / `Errors` / `Slow` / `POST` with live counts, writing
  into the same filter state as the Filters sheet.
- **Search** — independent URL / Headers / Body scopes, 150ms debounce, inline
  accent highlighting, body excerpts with ±40 chars of context, and an
  `N requests hidden by search` footer.
- **Detail split into four tabs** — Overview / Request / Response / cURL,
  replacing the single endlessly-scrolling screen.
- **Overview** — duration / size / started stat cards, full URL card with a
  `Decode` toggle for percent-encoded queries, timing breakdown, quick facts.
- **Request** — collapsible header sections with `redacted` badges, JSON body,
  collapsed query params and cookies.
- **Response** — collapsible JSON tree with child-count badges and syntax
  colouring, in-body search with match counter and prev/next, `Raw` toggle.
  Containers over 50 children auto-collapse.
- **cURL** — cURL / HTTPie / `fetch()` output with a `Redact` toggle that swaps
  secrets for `$TOKEN`-style placeholders.
- **Sticky action bar** on every detail tab, plus a copy affordance on every
  list row, `Copy all` per section, and a long-press context menu on rows,
  header fields and JSON nodes.
- **Bottom sheets** for Filters (method, status class, slower-than slider, host)
  and Options (pause, export, buffer & redaction, clear), dismissible by
  backdrop tap, swipe down, or Android back.
- **Toast confirmation** on every copy action.
- **Time-group headers** between clusters of requests, via `showTimeGroups`.
- **`↑ N new` pill** instead of auto-scrolling when new requests arrive while
  the list is scrolled away from the top.

### React Native 0.81+ compatibility

- Removed the deep import of `react-native/Libraries/Blob/FileReader`. RN 0.80
  deprecates internal deep imports and 0.83 blocks them through the package
  `exports` map; `FileReader` is now read off the global, where RN polyfills it.
- Removed the five bundled PNG icons in favour of glyphs composed from `View`
  borders and rotations, so nothing needs resolving by the host bundler.
- Removed the dependency on `react-native`'s deprecated `Clipboard` export as a
  hard requirement. The clipboard is resolved at runtime from
  `@react-native-clipboard/clipboard`, `expo-clipboard`, or RN core, in that
  order, falling back to the share sheet.
- `peerDependencies` now declare `react-native >= 0.81` and `react >= 18`.
- All animations use `useNativeDriver: true` on transform and opacity only.

### Capture engine

- **Timing phases** — `queued`, `waiting` (TTFB) and `download`, derived from
  interceptor marks at `open()`, `send()`, `HEADERS_RECEIVED` and `DONE`.
  DNS/TCP/TLS are deliberately absent: `XMLHttpRequest` cannot measure them, and
  estimating them would be worse than omitting them. HAR exports write `-1` for
  the phases we don't have.
- **Redaction at capture time**, not render time — `Authorization`,
  `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `X-Auth-Token`,
  `X-Access-Token` and the CSRF/XSRF headers are masked before the value enters
  the entry, so exports and shared cURL commands can never leak a live token.
  On by default; `redactAuthHeaders: false` restores the old behaviour.
- **Request state** — `pending` / `done` / `failed` / `cancelled`, from new
  `error`, `timeout` and `abort` listeners. A transport failure is now
  distinguishable from a 4xx, and an app-initiated abort from either.
- **Body size ceiling** — `maxResponseBodySize` (1 MB default). Larger bodies
  are dropped from memory and the entry is marked `truncated`, rather than
  holding a multi-megabyte string per entry.
- **Real response sizes** from `progress` events, so chunked responses with no
  `content-length` still report a size.
- **Status reason phrases** — a 500 surfaces as `internal_server_error` on the
  error row.
- New API: `pauseNetworkLogging()`, `resumeNetworkLogging()`,
  `isNetworkLoggingPaused()`, and `NetworkRequestInfo.getCode(format)`.

### Breaking changes from `react-native-network-logger` v3

- The default theme is `dark` (was `light`). Pass `theme="light"` to keep the
  old appearance.
- Auth headers are redacted by default. Pass `redactAuthHeaders: false` to opt
  out.
- The `compact` prop is accepted but has no effect; the redesigned row is a
  single density.
- The `Theme` type gained a much larger `colors` object. The nine v3 colour keys
  are still present as aliases, so existing partial theme overrides keep
  working.
