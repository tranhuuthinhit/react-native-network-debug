import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { MAX_CONTENT_WIDTH, space, useTheme } from '../../theme';
import { DEFAULT_SLOW_THRESHOLD_MS } from '../../constant';
import { pluralise, timeGroupKey } from '../../utils/format';
import useFilteredRequests from '../../hooks/useFilteredRequests';
import { useAppContext } from '../AppContext';
import Txt from '../ui/Text';
import { GroupHeader } from '../ui/Layout';
import ListHeader, { PausedBanner } from './ListHeader';
import SearchRow, { QuickChips, SearchResultBar } from './SearchRow';
import RequestRow from './RequestRow';
import EmptyState, { SettingsPreview } from './EmptyState';
import { useToast } from '../ui/Toast';
import { useContextMenu } from '../ui/ContextMenu';
import { copyToClipboard } from '../../utils/clipboard';

type Row =
  | { kind: 'group'; key: string; label: string }
  | { kind: 'request'; key: string; request: NetworkRequestInfo };

const ListScreen = ({
  requests,
  paused,
  clearedAt,
  title,
  maxRows,
  showTimeGroups,
  bottomInset = 0,
  onBack,
  onSelect,
  onResume,
  onOpenOptions,
  onOpenFilters,
  onOpenBufferSettings,
}: {
  requests: NetworkRequestInfo[];
  paused: boolean;
  clearedAt: number | null;
  title?: string;
  maxRows?: number;
  showTimeGroups?: boolean;
  bottomInset?: number;
  onBack?: () => void;
  onSelect: (id: string) => void;
  onResume: () => void;
  onOpenOptions: () => void;
  onOpenFilters: () => void;
  onOpenBufferSettings: () => void;
}) => {
  const theme = useTheme();
  const toast = useToast();
  const menu = useContextMenu();
  const {
    search,
    searchScopes,
    filters,
    filterActive,
    quickChip,
    settings,
    dispatch,
  } = useAppContext();

  const listRef = useRef<FlatList<Row>>(null);
  const [atTop, setAtTop] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const lastTopId = useRef<string | null>(null);

  const result = useFilteredRequests(requests, {
    search,
    scopes: searchScopes,
    filters,
    maxRows,
  });

  // New requests prepend to the top. When the user has scrolled away we
  // must not yank the list — count them and surface a "N new" pill.
  const topId = result.requests[0]?.id ?? null;
  useEffect(() => {
    const previous = lastTopId.current;
    lastTopId.current = topId;
    if (previous === null || topId === previous) return;
    if (!atTopRef.current) setNewCount((prev) => prev + 1);
  }, [topId]);

  // Read inside the effect above without making it depend on scroll state.
  const atTopRef = useRef(atTop);
  atTopRef.current = atTop;

  const rows = useMemo<Row[]>(() => {
    if (!showTimeGroups) {
      return result.requests.map((request) => ({
        kind: 'request' as const,
        key: request.id,
        request,
      }));
    }

    const out: Row[] = [];
    let lastGroup = '';
    result.requests.forEach((request) => {
      const group = timeGroupKey(request.startTime);
      if (group && group !== lastGroup) {
        lastGroup = group;
        out.push({ kind: 'group', key: `group-${group}`, label: group });
      }
      out.push({ kind: 'request', key: request.id, request });
    });
    return out;
  }, [result.requests, showTimeGroups]);

  const copyUrl = useCallback(
    async (request: NetworkRequestInfo) => {
      const copied = await copyToClipboard(request.url);
      if (copied) toast.show('URL copied to clipboard');
    },
    [toast]
  );

  const onLongPressRow = useCallback(
    (request: NetworkRequestInfo) => {
      menu.open({
        field: { key: request.method, value: request.url },
        items: [
          {
            label: 'Copy URL',
            icon: 'copy',
            onPress: () => void copyUrl(request),
          },
          {
            label: 'Copy cURL',
            icon: 'copy',
            onPress: async () => {
              const copied = await copyToClipboard(request.getCode('curl'));
              if (copied) toast.show('cURL copied to clipboard');
            },
          },
          {
            label: 'Share',
            icon: 'share',
            onPress: () => {
              void Share.share({ message: request.url });
            },
          },
          {
            label: `Filter by ${request.host || 'host'}`,
            icon: 'filter',
            onPress: () => {
              dispatch({
                type: 'SET_FILTERS',
                payload: { ...filters, hosts: new Set([request.host]) },
              });
            },
          },
        ],
      });
    },
    [menu, copyUrl, toast, dispatch, filters]
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
      if (item.kind === 'group') return <GroupHeader label={item.label} />;
      return (
        <RequestRow
          request={item.request}
          window={result.window}
          slowThreshold={filters.slowerThanMs ?? DEFAULT_SLOW_THRESHOLD_MS}
          searchQuery={search.trim() || undefined}
          hit={result.hits.get(item.request.id)}
          onPress={onSelect}
          onLongPress={onLongPressRow}
          onCopy={copyUrl}
        />
      );
    },
    [
      result.window,
      result.hits,
      filters.slowerThanMs,
      search,
      onSelect,
      onLongPressRow,
      copyUrl,
    ]
  );

  const searching = !!search.trim();
  const isEmpty = rows.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.content}>
        <ListHeader
          title={title}
          paused={paused}
          requestCount={result.counts.all}
          averageDuration={result.averageDuration}
          clearedAt={clearedAt}
          onBack={onBack}
          onOptions={onOpenOptions}
        />

        <SearchRow
          value={search}
          onChangeValue={(next) =>
            dispatch({ type: 'SET_SEARCH', payload: next })
          }
          filterActive={filterActive}
          onOpenFilters={onOpenFilters}
        />

        {searching ? (
          <SearchResultBar
            requestCount={result.requests.length}
            matchCount={result.totalMatches}
            scopes={searchScopes}
            onToggleScope={(scope) =>
              dispatch({ type: 'TOGGLE_SCOPE', payload: scope })
            }
          />
        ) : (
          <QuickChips
            value={quickChip}
            counts={result.counts}
            onChange={(next) =>
              dispatch({ type: 'SET_QUICK_CHIP', payload: next })
            }
          />
        )}

        {paused && <PausedBanner onResume={onResume} />}

        {isEmpty ? (
          <>
            <EmptyState
              paused={paused}
              title={
                searching || filterActive ? 'No matching requests' : undefined
              }
              body={
                searching || filterActive
                  ? 'Nothing matches the current search and filters. Clear them to see the full capture.'
                  : undefined
              }
            />
            {!searching && !filterActive && (
              <SettingsPreview
                bufferLimit={settings.bufferLimit}
                redactAuthHeaders={settings.redactAuthHeaders}
                onChangeRedaction={(next) =>
                  dispatch({
                    type: 'SET_SETTING',
                    payload: { redactAuthHeaders: next },
                  })
                }
                onPressBuffer={onOpenBufferSettings}
              />
            )}
          </>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={rows}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 24 + bottomInset },
              ]}
              ItemSeparatorComponent={ListSeparator}
              onScroll={(e) => {
                const top = e.nativeEvent.contentOffset.y <= 8;
                if (top !== atTop) setAtTop(top);
                if (top && newCount) setNewCount(0);
              }}
              scrollEventThrottle={64}
              // Row insertion is frequent; keeping windowing modest and
              // never animating layout height is what keeps it smooth.
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={11}
              removeClippedSubviews
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                result.hiddenBySearch > 0 ? (
                  <Txt
                    variant="headerKey"
                    mono
                    color={theme.colors.textMuted}
                    align="center"
                    style={styles.footer}
                  >
                    {pluralise(result.hiddenBySearch, 'request')} hidden by
                    search
                  </Txt>
                ) : null
              }
            />

            {newCount > 0 && (
              <Pressable
                onPress={() => {
                  listRef.current?.scrollToOffset({
                    offset: 0,
                    animated: true,
                  });
                  setNewCount(0);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${newCount} new requests, scroll to top`}
                style={[
                  styles.newPill,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Txt variant="chip" color={theme.colors.onAccent}>
                  ↑ {newCount} new
                </Txt>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const ListSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  listContent: { paddingHorizontal: space.gutter },
  separator: { height: 8 },
  footer: { paddingTop: 14 },
  newPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
});

export default ListScreen;
