import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { hit, space, useTheme } from '../../theme';
import { countMatchesIn } from '../../utils/search';
import { safeParseJson } from '../../utils/jsonTree';
import Txt, { useFonts } from '../ui/Text';
import { Card, SectionHeader } from '../ui/Layout';
import Icon from '../Icon';
import HeadersCard from './HeadersCard';
import JsonTree, { RawBlock } from './JsonTree';
import { useAppContext } from '../AppContext';

/** Search field + match counter + prev/next, plus the `Raw` toggle. */
const BodySearchRow = ({
  query,
  matchIndex,
  matchCount,
  raw,
  onChangeQuery,
  onStep,
  onToggleRaw,
}: {
  query: string;
  matchIndex: number;
  matchCount: number;
  raw: boolean;
  onChangeQuery: (next: string) => void;
  onStep: (delta: number) => void;
  onToggleRaw: () => void;
}) => {
  const theme = useTheme();
  const fonts = useFonts();
  const active = !!query;

  return (
    <View style={styles.searchRow}>
      <View
        style={[
          styles.searchField,
          {
            backgroundColor: theme.colors.surface,
            borderColor: active
              ? theme.colors.accentBorder
              : theme.colors.border,
          },
        ]}
      >
        <Icon
          name="search"
          size={13}
          color={active ? theme.colors.accent : theme.colors.textMuted}
        />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search response"
          placeholderTextColor={theme.colors.textMuted}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={theme.colors.accent}
          accessibilityLabel="Search response body"
          style={[
            styles.searchInput,
            { color: theme.colors.text, fontFamily: fonts.mono },
          ]}
        />
        {active && (
          <>
            <Txt variant="rowMeta" mono color={theme.colors.textMuted}>
              {matchCount ? `${matchIndex + 1}/${matchCount}` : '0/0'}
            </Txt>
            <Pressable
              onPress={() => onStep(-1)}
              disabled={!matchCount}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Previous match"
            >
              <Icon
                name="chevronUp"
                size={13}
                color={matchCount ? theme.colors.text : theme.colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => onStep(1)}
              disabled={!matchCount}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Next match"
            >
              <Icon
                name="chevronDown"
                size={13}
                color={matchCount ? theme.colors.text : theme.colors.textMuted}
              />
            </Pressable>
          </>
        )}
      </View>

      <Pressable
        onPress={onToggleRaw}
        accessibilityRole="button"
        accessibilityState={{ selected: raw }}
        accessibilityLabel="Toggle raw payload"
        style={[
          styles.rawToggle,
          {
            backgroundColor: raw ? theme.colors.text : theme.colors.surface,
            borderColor: raw ? theme.colors.text : theme.colors.border,
          },
        ]}
      >
        <Txt
          variant="chip"
          mono
          color={raw ? theme.colors.onAccent : theme.colors.textMuted}
        >
          Raw
        </Txt>
      </Pressable>
    </View>
  );
};

const ResponseTab = ({
  request,
  body,
  loading,
  onCopy,
  contentPaddingBottom,
}: {
  request: NetworkRequestInfo;
  body: string;
  loading: boolean;
  onCopy: (value: string, message: string) => void;
  contentPaddingBottom: number;
}) => {
  const theme = useTheme();
  const { bodySearch, rawResponse, collapsedPaths, expandedPaths, dispatch } =
    useAppContext();
  const [localQuery, setLocalQuery] = useState('');

  const parsed = useMemo(() => safeParseJson(body), [body]);
  const query = bodySearch.query;
  const matchCount = useMemo(
    () => (query ? countMatchesIn(body, query) : 0),
    [body, query]
  );

  const treeKey = `${request.id}:response`;
  const showTree = parsed.ok && !rawResponse;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      <BodySearchRow
        query={localQuery}
        matchIndex={bodySearch.matchIndex}
        matchCount={matchCount}
        raw={rawResponse}
        onChangeQuery={(next) => {
          setLocalQuery(next);
          dispatch({ type: 'SET_BODY_SEARCH', payload: next });
        }}
        onStep={(delta) =>
          dispatch({
            type: 'STEP_BODY_MATCH',
            payload: { delta, total: matchCount },
          })
        }
        onToggleRaw={() => dispatch({ type: 'TOGGLE_RAW_RESPONSE' })}
      />

      <View style={styles.section}>
        <SectionHeader label={showTree ? 'BODY' : 'RAW BODY'} />
        {loading ? (
          <Card code>
            <Txt variant="code" mono color={theme.colors.textMuted}>
              Loading response…
            </Txt>
          </Card>
        ) : !body ? (
          <Card code>
            <Txt variant="code" mono color={theme.colors.textMuted}>
              Empty response body.
            </Txt>
          </Card>
        ) : showTree ? (
          <JsonTree
            value={parsed.value}
            searchQuery={query || undefined}
            byteSize={request.responseSize || body.length}
            collapsedPaths={collapsedPaths[treeKey] ?? new Set()}
            expandedPaths={expandedPaths[treeKey] ?? new Set()}
            onToggle={(path, collapsed) =>
              dispatch({
                type: 'TOGGLE_JSON_PATH',
                payload: { id: treeKey, path, collapsed },
              })
            }
            onExpandAll={() =>
              dispatch({
                type: 'SET_JSON_PATHS',
                payload: { id: treeKey, collapsed: [], expanded: [] },
              })
            }
            onCopy={onCopy}
            onSearchValue={(value) =>
              dispatch({ type: 'SET_SEARCH', payload: value })
            }
          />
        ) : (
          <RawBlock
            text={body}
            searchQuery={query || undefined}
            activeMatchIndex={bodySearch.matchIndex}
          />
        )}
      </View>

      <HeadersCard
        label="RESPONSE HEADERS"
        headers={request.responseHeaders}
        redacted={request.redactedHeaders}
        defaultCollapsed
        onCopyAll={() =>
          onCopy(
            Object.entries(request.responseHeaders)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n'),
            'Headers copied to clipboard'
          )
        }
        onCopyValue={onCopy}
        onSearchValue={(value) =>
          dispatch({ type: 'SET_SEARCH', payload: value })
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  section: { paddingHorizontal: space.gutter, paddingBottom: space.sectionGap },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    gap: 8,
  },
  searchField: {
    flex: 1,
    height: hit.control,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500', padding: 0 },
  rawToggle: {
    height: hit.control,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ResponseTab;
