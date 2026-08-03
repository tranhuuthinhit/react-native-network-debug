# Changelog

## 1.2.0

Documentation only. No change to any shipped code — `lib/` is identical to
1.1.0.

- Add six screenshots of the redesigned interface (list, search, paused &
  empty, detail Overview, detail Request, cURL) under `screenshots/`.
  Referenced by absolute `raw.githubusercontent.com` URLs rather than
  relative paths, because npm does not resolve relative image paths in a
  README — relative links would render on GitHub but break on the npm
  package page.
- Add npm version, downloads, bundle size, zero-dependency, React Native
  version, license and CI badges.
- Add direct links to npm, GitHub, the changelog and the issue tracker.
- Add a License section naming both copyright holders, and a Contributing
  section explaining why the dev toolchain is pinned and why `npm ci` is
  required rather than `npm install`.
- Note in the timings section that the DNS/TCP/TLS rows visible in the
  Overview screenshot are the design mock's sample data; a real capture
  shows Queued / Waiting / Download only, since XHR cannot measure the
  transport phases.

## 1.1.0

First published release. Functionally identical to the 1.0.0 tag — the
compiled `lib/**/*.js` and `lib/**/*.d.ts` are byte-for-byte the same —
but 1.0.0 was never published to npm and its tag pointed at a commit
that did not pass CI, so the release was cut again from a green tree.

### Repository and CI

- Commit `package-lock.json`. `actions/setup-node` with `cache: npm`
  requires a lockfile and was aborting the job before any step ran.
- Move `actions/checkout` and `actions/setup-node` to v5. v4 targets
  Node 20, which GitHub deprecated on its runners in September 2025.
- Pin the dev toolchain to exact versions. `prettier` was declared as
  `^3.5.3`, so CI resolved 3.9.6 while the code had been formatted with
  3.5.3, and 3.6 changed union-type layout — the formatting check failed
  on two files nobody had edited. Prettier, ESLint and tsc decide whether
  CI passes, so they are no longer on carets.
- Install with `npm ci --ignore-scripts` so the `prepare` hook doesn't
  build during install; the build is its own step, where a failure is
  attributed correctly.
- Add CI steps for formatting, `npm pack --dry-run`, and a toolchain
  version dump so future drift is visible in the log.

### Library

- `LIB_VERSION` in `src/constant.ts` now supplies the `creator.version`
  field of HAR exports, replacing a hardcoded string, with a test
  asserting it matches `package.json`.

## 1.0.0 (tagged, never published)

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
