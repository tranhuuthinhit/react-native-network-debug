# react-native-network-debug

[![npm version](https://img.shields.io/npm/v/react-native-network-debug.svg)](https://www.npmjs.com/package/react-native-network-debug)
[![npm downloads](https://img.shields.io/npm/dm/react-native-network-debug.svg)](https://www.npmjs.com/package/react-native-network-debug)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-native-network-debug)](https://bundlephobia.com/package/react-native-network-debug)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/react-native-network-debug?activeTab=dependencies)
[![React Native](https://img.shields.io/badge/react--native-%E2%89%A5%200.81-61dafb.svg)](https://reactnative.dev)
[![license](https://img.shields.io/npm/l/react-native-network-debug.svg)](./LICENSE)
[![CI](https://github.com/tranhuuthinhit/react-native-network-debug/actions/workflows/ci.yml/badge.svg)](https://github.com/tranhuuthinhit/react-native-network-debug/actions/workflows/ci.yml)

An in-app HTTP traffic inspector for React Native. Zero dependencies, dark
developer-tool UI, built for React Native **0.81 and above**.

**[npm](https://www.npmjs.com/package/react-native-network-debug)** ·
**[GitHub](https://github.com/tranhuuthinhit/react-native-network-debug)** ·
**[Changelog](./CHANGELOG.md)** ·
**[Issues](https://github.com/tranhuuthinhit/react-native-network-debug/issues)**

A redesigned fork of
[`react-native-network-logger`](https://github.com/alexbrazier/react-native-network-logger)
by [@alexbrazier](https://github.com/alexbrazier) (MIT). The capture engine is
inherited; the interface is a ground-up rebuild against a formal design handoff.

---

## Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/01-list.png" width="240" alt="Request list with per-row waterfall bars and tri-tone URLs" />
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/02-search.png" width="240" alt="Search with URL, Headers and Body scopes and inline match highlighting" />
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/03-paused-empty.png" width="240" alt="Paused capture banner and empty state" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/04-detail-overview.png" width="240" alt="Detail Overview tab with stat cards and timing breakdown" />
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/05-detail-request.png" width="240" alt="Detail Request tab with redacted headers and JSON body" />
  <img src="https://raw.githubusercontent.com/tranhuuthinhit/react-native-network-debug/main/screenshots/06-detail-curl.png" width="240" alt="cURL tab with format chips, redaction and copy toast" />
</p>

<p align="center">
  <sub>
    List · Search · Paused &amp; empty &nbsp;|&nbsp;
    Detail Overview · Detail Request · cURL
  </sub>
</p>

Note the details these are meant to show: the URL is never truncated in the
list but split into three colour tiers, every row carries a waterfall bar
encoding start offset and duration, `Authorization` renders as
`Bearer ••••••••••••••••3f9a` with a `redacted` badge, and the cURL tab's
`Redact` toggle has swapped the token for `$TOKEN`.

## Why this fork

The original list view worked, but four things made it awkward to actually debug with:

| Problem | What this fork does |
| --- | --- |
| Long URLs were hard to scan | The full URL is still shown — never truncated — but split into three colour tiers: host (dim), path (bright), query (mid-dim) |
| No sense of order or latency | Every row carries a mini waterfall bar: offset = relative start, width = duration, colour = outcome |
| The detail screen scrolled forever | It is now four tabs — Overview / Request / Response / cURL |
| Copy and share were buried | A persistent action bar on every detail tab, a copy affordance on every row, "Copy all" per section, and a long-press menu on any field |

Plus, on the engineering side: no more deep imports into React Native internals
(which RN 0.80+ deprecates and 0.83 blocks), credentials redacted at capture
time rather than render time, and a hard ceiling on how much response body the
buffer will hold.

## Install

```sh
npm install react-native-network-debug
# or
yarn add react-native-network-debug
```

No native linking, no pods, no extra packages.

### Optional: real clipboard

The library has zero dependencies, so it resolves a clipboard at runtime from
whatever you already have. If you have neither of these installed, copy actions
fall back to the platform share sheet:

```sh
npm install @react-native-clipboard/clipboard   # or expo-clipboard
```

## Usage

Start capturing as early as possible — ideally at the top of your entry file,
before any request is made:

```js
import { startNetworkLogging } from 'react-native-network-debug';

startNetworkLogging();

AppRegistry.registerComponent('App', () => App);
```

Then render the inspector wherever your debug menu lives:

```jsx
import NetworkLogger from 'react-native-network-debug';

const DebugScreen = () => <NetworkLogger />;
```

Only start it in development:

```js
if (__DEV__) {
  startNetworkLogging();
}
```

## Screens

| # | Screen | What it's for |
| --- | --- | --- |
| 1 | **List** | Scan everything the app just did. Status pill, method, duration, full tri-tone URL, waterfall bar. Error rows get a red wash and a reason line. |
| 2 | **Search** | Independent URL / Headers / Body scopes, inline accent highlighting, body excerpts with ±40 chars of context, `N requests hidden by search` footer. |
| 3 | **Paused & empty** | Amber banner while the interceptor is detached, `cleared HH:MM:SS` in the status line, buffer and redaction settings pinned to the bottom. |
| 4 | **Detail → Overview** | Duration / size / started stat cards, full URL with `Decode`, timing breakdown, quick facts. |
| 5 | **Detail → Request** | Collapsible headers with `redacted` badges, JSON body, collapsed query params and cookies. |
| 6 | **Detail → Response** | Collapsible JSON tree with child-count badges, in-body search with prev/next, `Raw` toggle. |
| 7 | **Detail → cURL** | cURL / HTTPie / `fetch()` output, `Redact` toggle for `$TOKEN` placeholders, one-tap copy with toast. |
| 8 | **Filters sheet** | Method, status class, slower-than slider, host. Applies live. |
| 9 | **Options sheet** | Pause, export (HAR / JSON / text), buffer & redaction, clear. |
| 10 | **Long-press menu** | Lifts the pressed field and offers copy / filter / search — on a row, a header, or a JSON node. |

## Props

```jsx
<NetworkLogger
  theme="dark"
  title="Network Log"
  sort="desc"
  maxRows={200}
  showTimeGroups
  bottomInset={insets.bottom}
  fontFamily={{ sans: 'IBMPlexSans', mono: 'IBMPlexMono' }}
  onClose={() => navigation.goBack()}
/>
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `theme` | `'dark' \| 'light' \| DeepPartial<Theme>` | `'dark'` | Pass an object to override individual tokens |
| `title` | `string` | `'Network Log'` | Header title |
| `sort` | `'asc' \| 'desc'` | `'desc'` | Newest first by default |
| `maxRows` | `number` | all | Cap rendered rows on low-end devices |
| `showTimeGroups` | `boolean` | `false` | Insert `13:30` group headers between clusters |
| `bottomInset` | `number` | `0` | Safe-area padding under the action bar and sheets |
| `fontFamily` | `{ sans?, mono? }` | system | The design specifies IBM Plex; ship it and pass it here |
| `onClose` | `() => void` | — | Shows the back chevron in the header |

## API

```ts
import {
  startNetworkLogging,
  stopNetworkLogging,
  getRequests,
  clearRequests,
  pauseNetworkLogging,
  resumeNetworkLogging,
  isNetworkLoggingPaused,
  getBackHandler,
} from 'react-native-network-debug';
```

### `startNetworkLogging(options?)`

| Option | Type | Default | |
| --- | --- | --- | --- |
| `maxRequests` | `number` | `500` | Ring buffer size; oldest evicted first |
| `ignoredHosts` | `string[]` | — | e.g. `['analytics.example.com']` |
| `ignoredUrls` | `string[]` | — | Exact URL matches |
| `ignoredPatterns` | `RegExp[]` | — | Matched against `` `${method} ${url}` `` |
| `forceEnable` | `boolean` | `false` | Take over from another interceptor |
| `refreshRate` | `number` | `50` | Debounce for UI updates, ms |
| `redactAuthHeaders` | `boolean` | `true` | Mask `Authorization`, `Cookie`, `x-api-key`, … |
| `redactedHeaders` | `string[]` | — | Extra header names to mask |
| `maxResponseBodySize` | `number` | `1048576` | Bodies above this are dropped and marked truncated |

### Android back button

Reuse your existing back navigation inside the inspector:

```jsx
const navigation = useNavigation();
const onBack = getBackHandler(navigation.goBack);

<Button onPress={onBack} title="Go back" />
```

## Redaction

`Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`,
`X-Auth-Token`, `X-Access-Token`, and the CSRF/XSRF headers are masked by
default.

The important detail: **masking happens at capture time, not render time.** The
raw value never enters the entry, so a HAR export, a shared cURL command, or a
screenshot of the detail screen cannot leak a live token. The scheme prefix and
last four characters survive (`Bearer ••••••••••••••••3f9a`) so you can still
tell two tokens apart.

Turn it off if you need the real values:

```js
startNetworkLogging({ redactAuthHeaders: false });
```

## A note on timings

The Overview tab shows a phase breakdown, but only for phases that can actually
be measured. `XMLHttpRequest` exposes no transport-level instrumentation to JS,
so **DNS, TCP and TLS are not available** and are omitted rather than estimated.
What the interceptor can measure precisely:

| Phase | Measured from |
| --- | --- |
| `Queued` | `open()` → `send()` — time spent in JS |
| `Waiting` | `send()` → `HEADERS_RECEIVED` — server think-time (TTFB) |
| `Download` | `HEADERS_RECEIVED` → `DONE` — body transfer |

The timing card renders whatever phases are present, so if you later supply
DNS/TCP/TLS from a native module they slot in without a UI change. HAR exports
write `-1` for the phases we don't have, which is what the HAR spec asks for.

> The DNS/TCP/TLS rows visible in the Overview screenshot come from the design
> mock's sample data. A real capture shows Queued / Waiting / Download only.

## Theming

The full token set is exported as `ThemeColors` — surfaces, the six-step text
ramp, semantic status colours, and JSON syntax tokens. Override any subset:

```jsx
<NetworkLogger
  theme={{
    colors: {
      bg: '#000000',
      accent: '#7c5cff',
    },
  }}
/>
```

`theme="light"` is supported for anyone upgrading from
`react-native-network-logger`. The neutral ramp inverts; status colours stay
literal — greens must read as green and reds as red in a debug tool.

## Migrating from `react-native-network-logger`

The public API is unchanged, so this is a drop-in replacement:

```diff
-import NetworkLogger, { startNetworkLogging } from 'react-native-network-logger';
+import NetworkLogger, { startNetworkLogging } from 'react-native-network-debug';
```

Two behavioural differences worth knowing:

- **The default theme is now `dark`.** Pass `theme="light"` to keep the old look.
- **Auth headers are redacted by default.** Pass `redactAuthHeaders: false` to
  restore the previous behaviour.

The `compact` prop is accepted but no longer has an effect — the redesigned row
is a single density.

## Requirements

- React Native **0.81+**
- React **18+**

Works on the New Architecture and the legacy one; there is no native code.

## Contributing

```sh
npm ci                # not `npm install` — the dev toolchain is pinned exactly
npm run verify        # typecheck + lint + format check + tests + build
```

The formatter, linter and compiler are pinned to exact versions on purpose: they
decide whether CI passes, so a caret would let an upstream patch release break
the build on code nobody touched.

## Credits

Capture engine forked from
[`react-native-network-logger`](https://github.com/alexbrazier/react-native-network-logger)
by Alex Brazier, MIT licensed. Interface rebuilt from a design handoff.

## License

[MIT](./LICENSE) © 2020 Alex Brazier, © 2026 Tran Huu Thinh

This project is a fork; the original copyright notice is retained in
[`LICENSE`](./LICENSE) as the MIT License requires.
