import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { space, useTheme } from '../../theme';
import { formatBytes, pluralise } from '../../utils/format';
import { parseQueryParams } from '../../utils/splitUrl';
import { safeParseJson } from '../../utils/jsonTree';
import Txt from '../ui/Text';
import { Card, SectionHeader } from '../ui/Layout';
import { LinkButton } from '../ui/Controls';
import HeadersCard from './HeadersCard';
import JsonTree, { RawBlock } from './JsonTree';
import { useAppContext } from '../AppContext';

const RequestTab = ({
  request,
  onCopy,
  contentPaddingBottom,
}: {
  request: NetworkRequestInfo;
  onCopy: (value: string, message: string) => void;
  contentPaddingBottom: number;
}) => {
  const theme = useTheme();
  const { collapsedPaths, expandedPaths, dispatch } = useAppContext();

  const body = useMemo(
    () => request.getRequestBody(!!request.gqlOperation),
    [request]
  );
  const parsed = useMemo(() => safeParseJson(body), [body]);
  const params = useMemo(
    () => parseQueryParams(request.splitUrl.query),
    [request.splitUrl.query]
  );

  const cookies = useMemo(() => {
    const raw = Object.entries(request.requestHeaders ?? {}).find(
      ([key]) => key.toLowerCase() === 'cookie'
    )?.[1];
    if (!raw) return {};
    return raw.split(';').reduce<Record<string, string>>((acc, pair) => {
      const eq = pair.indexOf('=');
      if (eq > 0) acc[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
      return acc;
    }, {});
  }, [request.requestHeaders]);

  const bodySize = request.dataSent ? String(request.dataSent).length : 0;
  const treeKey = `${request.id}:request`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      <HeadersCard
        label="HEADERS"
        headers={request.requestHeaders}
        redacted={request.redactedHeaders}
        onCopyAll={() =>
          onCopy(
            Object.entries(request.requestHeaders)
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

      {bodySize > 0 && (
        <View style={styles.section}>
          <SectionHeader
            label={`BODY · ${formatBytes(bodySize)}`}
            right={
              <LinkButton
                label="Copy"
                onPress={() => onCopy(body, 'Body copied to clipboard')}
              />
            }
          />
          {parsed.ok ? (
            <JsonTree
              value={parsed.value}
              byteSize={bodySize}
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
            <RawBlock text={body} />
          )}
        </View>
      )}

      {!!params.length && (
        <HeadersCard
          label="QUERY PARAMS"
          headers={Object.fromEntries(params)}
          defaultCollapsed
          onCopyAll={() =>
            onCopy(
              params.map(([k, v]) => `${k}=${v}`).join('\n'),
              'Query params copied to clipboard'
            )
          }
          onCopyValue={onCopy}
        />
      )}

      {!!Object.keys(cookies).length && (
        <HeadersCard
          label="COOKIES"
          headers={cookies}
          defaultCollapsed
          onCopyAll={() =>
            onCopy(
              Object.entries(cookies)
                .map(([k, v]) => `${k}=${v}`)
                .join('; '),
              'Cookies copied to clipboard'
            )
          }
          onCopyValue={onCopy}
        />
      )}

      {bodySize === 0 && (
        <View style={styles.section}>
          <Card>
            <Txt variant="headerValue" mono color={theme.colors.textMuted}>
              No request body — {pluralise(params.length, 'query param')} only.
            </Txt>
          </Card>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  section: { paddingHorizontal: space.gutter, paddingBottom: space.sectionGap },
});

export default RequestTab;
