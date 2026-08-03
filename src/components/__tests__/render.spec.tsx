import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import NetworkLogger from '../NetworkLogger';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import logger from '../../loggerSingleton';
import ListScreen from '../list/ListScreen';
import DetailScreen from '../detail/DetailScreen';
import { AppContextProvider } from '../AppContext';
import { FontProvider } from '../ui/Text';
import { ToastProvider } from '../ui/Toast';
import { ContextMenuProvider } from '../ui/ContextMenu';
import FiltersSheet from '../sheets/FiltersSheet';
import OptionsSheet from '../sheets/OptionsSheet';
import { emptyFilters } from '../AppContext';

/** Wraps a screen in the providers `NetworkLogger` normally supplies. */
const Providers = ({ children }: { children: React.ReactNode }) => (
  <FontProvider>
    <AppContextProvider>
      <ToastProvider>
        <ContextMenuProvider>{children}</ContextMenuProvider>
      </ToastProvider>
    </AppContextProvider>
  </FontProvider>
);

const makeRequest = (overrides: Partial<NetworkRequestInfo> = {}) => {
  const request = new NetworkRequestInfo(
    '1',
    'XMLHttpRequest',
    'GET',
    'https://api.example.com/v1/pages/home/ribbons?locale=en&fresh=1'
  );
  request.openTime = 1_000;
  request.update({
    startTime: 1_030,
    headersReceivedTime: 4_098,
    endTime: 4_880,
    status: 200,
    responseSize: 248 * 1024,
    response: '{"items":[{"id":1,"title":"Hello"}]}',
    responseHeaders: { 'content-type': 'application/json' },
    requestHeaders: { Accept: 'application/json' },
    state: 'done',
    ...overrides,
  });
  return request;
};

const noop = () => {};

describe('<NetworkLogger />', () => {
  afterEach(() => {
    // Unmount first: clearing the buffer fires the logger callback, which
    // would set state on a still-mounted tree outside act().
    cleanup();
    act(() => {
      logger.clearRequests();
    });
  });

  it('mounts without throwing', () => {
    expect(() => render(<NetworkLogger />)).not.toThrow();
  });

  it('renders the header title and the recording status line', () => {
    render(<NetworkLogger />);

    expect(screen.getByText('Network Log')).toBeTruthy();
    expect(screen.getByText(/recording/)).toBeTruthy();
  });

  it('renders the quick filter chips with counts', () => {
    render(<NetworkLogger />);

    expect(screen.getByText(/^All/)).toBeTruthy();
    expect(screen.getByText(/^Errors/)).toBeTruthy();
    expect(screen.getByText(/^Slow/)).toBeTruthy();
    expect(screen.getByText(/^POST/)).toBeTruthy();
  });

  it('renders the search field', () => {
    render(<NetworkLogger />);
    expect(screen.getByLabelText('Search requests')).toBeTruthy();
  });

  it('renders the empty state when nothing has been captured', () => {
    render(<NetworkLogger />);
    expect(screen.getByText('No requests captured')).toBeTruthy();
  });

  it('accepts a light theme without throwing', () => {
    expect(() => render(<NetworkLogger theme="light" />)).not.toThrow();
  });

  it('accepts a partial theme override without throwing', () => {
    expect(() =>
      render(<NetworkLogger theme={{ colors: { accent: '#7c5cff' } }} />)
    ).not.toThrow();
  });

  it('shows the back chevron only when onClose is supplied', () => {
    const { rerender } = render(<NetworkLogger />);
    expect(screen.queryByLabelText('Back')).toBeNull();

    rerender(<NetworkLogger onClose={noop} />);
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });
});

describe('<ListScreen />', () => {
  const renderList = (requests: NetworkRequestInfo[], paused = false) =>
    render(
      <Providers>
        <ListScreen
          requests={requests}
          paused={paused}
          clearedAt={null}
          onSelect={noop}
          onResume={noop}
          onOpenOptions={noop}
          onOpenFilters={noop}
          onOpenBufferSettings={noop}
        />
      </Providers>
    );

  it('renders the full url split across host, path and query', () => {
    renderList([makeRequest()]);

    expect(screen.getByText('https://api.example.com')).toBeTruthy();
    expect(screen.getByText('/v1/pages/home/ribbons')).toBeTruthy();
    expect(screen.getByText('?locale=en&fresh=1')).toBeTruthy();
  });

  it('renders the status pill, method and duration', () => {
    renderList([makeRequest()]);

    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('GET')).toBeTruthy();
    expect(screen.getByText('3.85s')).toBeTruthy();
  });

  it('renders the error reason line on a failed request', () => {
    const request = makeRequest({
      status: 500,
      errorReason: 'internal_server_error',
    });
    renderList([request]);

    expect(screen.getByText('internal_server_error')).toBeTruthy();
  });

  it('renders a copy affordance on every row', () => {
    renderList([makeRequest()]);
    expect(screen.getByLabelText('Copy URL')).toBeTruthy();
  });

  it('renders the paused banner when capture is detached', () => {
    renderList([makeRequest()], true);

    expect(screen.getByText(/Capture is paused/)).toBeTruthy();
    expect(screen.getByLabelText('Resume capture')).toBeTruthy();
  });

  it('renders time-group headers when asked', () => {
    render(
      <Providers>
        <ListScreen
          requests={[makeRequest()]}
          paused={false}
          clearedAt={null}
          showTimeGroups
          onSelect={noop}
          onResume={noop}
          onOpenOptions={noop}
          onOpenFilters={noop}
          onOpenBufferSettings={noop}
        />
      </Providers>
    );

    // The group label is HH:MM of the request's start time.
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeTruthy();
  });
});

describe('<DetailScreen />', () => {
  /**
   * The response body is read asynchronously in an effect, so every test
   * flushes microtasks inside act() before asserting.
   */
  const renderDetail = async (request = makeRequest()) => {
    const result = render(
      <Providers>
        <DetailScreen request={request} onClose={noop} />
      </Providers>
    );
    await act(async () => {});
    return result;
  };

  it('renders all four tabs', async () => {
    await renderDetail();

    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Request')).toBeTruthy();
    expect(screen.getByText('Response')).toBeTruthy();
    expect(screen.getByText('cURL')).toBeTruthy();
  });

  it('renders the three stat cards on Overview', async () => {
    await renderDetail();

    expect(screen.getByText('DURATION')).toBeTruthy();
    expect(screen.getByText('SIZE')).toBeTruthy();
    expect(screen.getByText('STARTED')).toBeTruthy();
    expect(screen.getByText('248 KB')).toBeTruthy();
  });

  it('renders the full url card and the timing breakdown', async () => {
    await renderDetail();

    expect(screen.getByText('FULL URL')).toBeTruthy();
    expect(screen.getByText('TIMING BREAKDOWN')).toBeTruthy();
    expect(screen.getByText('Waiting')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
  });

  it('notes when one phase dominates the total', async () => {
    await renderDetail();
    expect(screen.getByText(/server think-time/)).toBeTruthy();
  });

  it('renders the sticky action bar', async () => {
    await renderDetail();

    // The bar buttons are labelled by their visible text; the header's
    // icon-only copy button carries the explicit label.
    expect(screen.getByText('Copy cURL')).toBeTruthy();
    expect(screen.getByLabelText('Copy URL')).toBeTruthy();
    expect(screen.getByLabelText('Share request')).toBeTruthy();
  });

  it('renders a query param count chip', async () => {
    await renderDetail();
    expect(screen.getByText('2 query params')).toBeTruthy();
  });
});

describe('sheets', () => {
  it('renders the Filters sheet with every section', () => {
    render(
      <Providers>
        <FiltersSheet
          visible
          filters={emptyFilters()}
          hosts={['api.example.com']}
          resultCount={12}
          onChange={noop}
          onClose={noop}
        />
      </Providers>
    );

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByText('METHOD')).toBeTruthy();
    expect(screen.getByText('STATUS')).toBeTruthy();
    expect(screen.getByText('SLOWER THAN')).toBeTruthy();
    expect(screen.getByText('HOST')).toBeTruthy();
    expect(screen.getByText('Show 12 requests')).toBeTruthy();
  });

  it('renders the Options sheet with a destructive clear action', () => {
    render(
      <Providers>
        <OptionsSheet
          visible
          paused={false}
          requestCount={48}
          bufferBytes={3_200_000}
          redactAuthHeaders
          onClose={noop}
          onTogglePause={noop}
          onExport={noop}
          onOpenBufferSettings={noop}
          onClear={noop}
          onChangeRedaction={noop}
        />
      </Providers>
    );

    expect(screen.getByText('Capture')).toBeTruthy();
    expect(screen.getByText('Pause capture')).toBeTruthy();
    expect(screen.getByText('Export all logs')).toBeTruthy();
    expect(screen.getByText('Clear logs')).toBeTruthy();
    expect(screen.getByText(/48 requests · 3\.1 MB in buffer/)).toBeTruthy();
  });
});
