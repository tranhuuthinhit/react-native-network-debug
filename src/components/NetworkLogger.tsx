import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Share, StyleSheet, View } from 'react-native';
import logger from '../loggerSingleton';
import NetworkRequestInfo from '../NetworkRequestInfo';
import { Theme, ThemeContext, ThemeName, useTheme } from '../theme';
import { setBackHandler } from '../backHandler';
import { DeepPartial } from '../types';
import { FontFamilies } from '../fonts';
import createHar from '../utils/createHar';
import { AppContextProvider, useAppContext } from './AppContext';
import { FontProvider } from './ui/Text';
import { ToastProvider, useToast } from './ui/Toast';
import { ContextMenuProvider } from './ui/ContextMenu';
import ListScreen from './list/ListScreen';
import DetailScreen from './detail/DetailScreen';
import FiltersSheet from './sheets/FiltersSheet';
import OptionsSheet, { BufferSheet, ExportSheet } from './sheets/OptionsSheet';
import Unmounted from './Unmounted';
import useFilteredRequests from '../hooks/useFilteredRequests';

export interface Props {
  /** `'dark'` (default), `'light'`, or a partial theme override. */
  theme?: ThemeName | DeepPartial<Theme>;
  sort?: 'asc' | 'desc';
  /** Kept for API compatibility; the redesigned row is a single density. */
  compact?: boolean;
  maxRows?: number;
  /** Screen title shown in the header. */
  title?: string;
  /** Insert time-group headers between clusters of requests. */
  showTimeGroups?: boolean;
  /** Safe-area inset to add below the action bar and sheets. */
  bottomInset?: number;
  /** Override the UI and mono font families, e.g. IBM Plex. */
  fontFamily?: FontFamilies;
  /** Called when the header back chevron is pressed. */
  onClose?: () => void;
}

const sortRequests = (requests: NetworkRequestInfo[], sort: 'asc' | 'desc') => {
  if (sort === 'asc') {
    return [...requests].reverse();
  }
  return requests;
};

/** Inner shell — needs the app context, so it lives below the provider. */
const NetworkLoggerShell = ({
  requests,
  paused,
  mounted,
  sort,
  maxRows,
  title,
  showTimeGroups,
  bottomInset = 0,
  onTogglePause,
  onClose,
}: {
  requests: NetworkRequestInfo[];
  paused: boolean;
  mounted: boolean;
  sort: 'asc' | 'desc';
  maxRows?: number;
  title?: string;
  showTimeGroups?: boolean;
  bottomInset?: number;
  onTogglePause: () => void;
  onClose?: () => void;
}) => {
  const theme = useTheme();
  const toast = useToast();
  const { selectedId, sheet, filters, settings, dispatch } = useAppContext();

  const sorted = useMemo(() => sortRequests(requests, sort), [requests, sort]);
  const selected = useMemo(
    () => sorted.find((r) => r.id === selectedId),
    [sorted, selectedId]
  );

  // Filters sheet needs the host list and the live result count, which
  // are derived by the same hook the list uses.
  const derived = useFilteredRequests(sorted, {
    search: '',
    scopes: { url: true, headers: false, body: false },
    filters,
    maxRows,
  });

  const closeDetail = useCallback(() => {
    dispatch({ type: 'SELECT', payload: null });
    setBackHandler(undefined);
  }, [dispatch]);

  const openDetail = useCallback(
    (id: string) => {
      dispatch({ type: 'SELECT', payload: id });
      setBackHandler(closeDetail);
    },
    [dispatch, closeDetail]
  );

  // Android hardware back: pop the detail screen before leaving the
  // inspector entirely.
  useEffect(() => {
    const onBack = () => {
      if (selectedId) {
        closeDetail();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBack
    );
    return () => subscription.remove();
  }, [selectedId, closeDetail]);

  const exportLogs = useCallback(async (format: 'har' | 'json' | 'text') => {
    const all = logger.getRequests();

    let message: string;
    if (format === 'har') {
      message = JSON.stringify(await createHar(all));
    } else if (format === 'json') {
      message = JSON.stringify(
        all.map((r) => ({
          ...r.toRow(),
          timing: r.timing,
          requestHeaders: r.requestHeaders,
          responseHeaders: r.responseHeaders,
        })),
        null,
        2
      );
    } else {
      message = all
        .map(
          (r) =>
            `${r.status} ${r.method} ${r.url} ${
              r.duration >= 0 ? `${r.duration}ms` : 'pending'
            }`
        )
        .join('\n');
    }

    await Share.share({ message });
  }, []);

  if (mounted && !logger.enabled && !requests.length) {
    return <Unmounted />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      {selected ? (
        <DetailScreen
          request={selected}
          onClose={closeDetail}
          bottomInset={bottomInset}
        />
      ) : (
        <ListScreen
          requests={sorted}
          paused={paused}
          clearedAt={logger.getClearedAt()}
          title={title}
          maxRows={maxRows}
          showTimeGroups={showTimeGroups}
          bottomInset={bottomInset}
          onBack={onClose}
          onSelect={openDetail}
          onResume={onTogglePause}
          onOpenOptions={() =>
            dispatch({ type: 'SET_SHEET', payload: 'options' })
          }
          onOpenFilters={() =>
            dispatch({ type: 'SET_SHEET', payload: 'filters' })
          }
          onOpenBufferSettings={() =>
            dispatch({ type: 'SET_SHEET', payload: 'buffer' })
          }
        />
      )}

      <FiltersSheet
        visible={sheet === 'filters'}
        filters={filters}
        hosts={derived.hosts}
        resultCount={derived.requests.length}
        bottomInset={bottomInset}
        onChange={(next) => dispatch({ type: 'SET_FILTERS', payload: next })}
        onClose={() => dispatch({ type: 'SET_SHEET', payload: null })}
      />

      <OptionsSheet
        visible={sheet === 'options'}
        paused={paused}
        requestCount={requests.length}
        bufferBytes={logger.getBufferSize()}
        redactAuthHeaders={settings.redactAuthHeaders}
        bottomInset={bottomInset}
        onClose={() => dispatch({ type: 'SET_SHEET', payload: null })}
        onTogglePause={onTogglePause}
        onExport={() => dispatch({ type: 'SET_SHEET', payload: 'export' })}
        onOpenBufferSettings={() =>
          dispatch({ type: 'SET_SHEET', payload: 'buffer' })
        }
        onClear={() => {
          logger.clearRequests();
          toast.show('Logs cleared');
        }}
        onChangeRedaction={(next) => {
          logger.setRedactionEnabled(next);
          dispatch({
            type: 'SET_SETTING',
            payload: { redactAuthHeaders: next },
          });
        }}
      />

      <ExportSheet
        visible={sheet === 'export'}
        bottomInset={bottomInset}
        onClose={() => dispatch({ type: 'SET_SHEET', payload: null })}
        onExport={(format) => void exportLogs(format)}
      />

      <BufferSheet
        visible={sheet === 'buffer'}
        bufferLimit={settings.bufferLimit}
        redactAuthHeaders={settings.redactAuthHeaders}
        bottomInset={bottomInset}
        onClose={() => dispatch({ type: 'SET_SHEET', payload: null })}
        onChangeLimit={(next) => {
          logger.setMaxRequests(next);
          dispatch({ type: 'SET_SETTING', payload: { bufferLimit: next } });
        }}
        onChangeRedaction={(next) => {
          logger.setRedactionEnabled(next);
          dispatch({
            type: 'SET_SETTING',
            payload: { redactAuthHeaders: next },
          });
        }}
      />
    </View>
  );
};

const NetworkLogger: React.FC<Props> = ({
  theme = 'dark',
  sort = 'desc',
  maxRows,
  title,
  showTimeGroups,
  bottomInset,
  fontFamily,
  onClose,
}) => {
  const [requests, setRequests] = useState(logger.getRequests());
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState<boolean>(logger.isPaused);

  useEffect(() => {
    logger.setCallback((updatedRequests: NetworkRequestInfo[]) => {
      setRequests([...updatedRequests]);
    });

    logger.enableXHRInterception();
    setMounted(true);

    return () => {
      // no-op if component is unmounted
      logger.setCallback(() => {});
    };
  }, []);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      logger.onPausedChange(!prev);
      return !prev;
    });
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <FontProvider fontFamily={fontFamily}>
        <AppContextProvider
          initialSettings={{
            bufferLimit: logger.getMaxRequests(),
            redactAuthHeaders: logger.isRedactionEnabled(),
          }}
        >
          <ToastProvider>
            <ContextMenuProvider>
              <NetworkLoggerShell
                requests={requests}
                paused={paused}
                mounted={mounted}
                sort={sort}
                maxRows={maxRows}
                title={title}
                showTimeGroups={showTimeGroups}
                bottomInset={bottomInset}
                onTogglePause={togglePause}
                onClose={onClose}
              />
            </ContextMenuProvider>
          </ToastProvider>
        </AppContextProvider>
      </FontProvider>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export { NetworkLogger as default, Props as NetworkLoggerProps };
