import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { space, useTheme } from '../../theme';
import { parseQueryParams, decodeQuery as decode } from '../../utils/splitUrl';
import { pluralise } from '../../utils/format';
import Txt from '../ui/Text';
import { Card, FactRow, SectionHeader } from '../ui/Layout';
import { Chip, LinkButton } from '../ui/Controls';
import TimingBreakdown from './TimingBreakdown';
import { useAppContext } from '../AppContext';
import { useContextMenu } from '../ui/ContextMenu';

const OverviewTab = ({
  request,
  onCopy,
  contentPaddingBottom,
}: {
  request: NetworkRequestInfo;
  onCopy: (value: string, label: string) => void;
  contentPaddingBottom: number;
}) => {
  const theme = useTheme();
  const menu = useContextMenu();
  const { decodeQuery, dispatch } = useAppContext();
  const { host, path, query } = request.splitUrl;

  const shownQuery = decodeQuery && query ? decode(query) : query;
  const params = useMemo(() => parseQueryParams(query), [query]);

  const facts = useMemo(() => {
    const pick = (name: string) => {
      const entry = Object.entries(request.responseHeaders ?? {}).find(
        ([key]) => key.toLowerCase() === name
      );
      return entry?.[1];
    };

    return [
      {
        label: 'Content-Type',
        value: pick('content-type') ?? request.responseContentType,
      },
      { label: 'Cache', value: pick('cache-control') },
      {
        label: 'x-request-id',
        value: pick('x-request-id') ?? pick('x-correlation-id'),
      },
      { label: 'Server', value: pick('server') },
    ].filter((fact) => !!fact.value) as { label: string; value: string }[];
  }, [request.responseHeaders, request.responseContentType]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Full URL */}
      <View style={styles.section}>
        <SectionHeader
          label="FULL URL"
          right={
            <LinkButton
              label="Copy"
              onPress={() => onCopy(request.url, 'URL copied to clipboard')}
            />
          }
        />
        <Card>
          <Txt
            variant="rowUrl"
            mono
            style={styles.url}
            onLongPress={() =>
              menu.open({
                field: { key: 'url', value: request.url },
                items: [
                  {
                    label: 'Copy value',
                    icon: 'copy',
                    onPress: () =>
                      onCopy(request.url, 'URL copied to clipboard'),
                  },
                  {
                    label: 'Filter requests by this host',
                    icon: 'filter',
                    onPress: () =>
                      dispatch({
                        type: 'SET_FILTERS',
                        payload: {
                          methods: new Set(),
                          statusClasses: new Set(),
                          slowerThanMs: null,
                          hosts: new Set([request.host]),
                        },
                      }),
                  },
                ],
              })
            }
          >
            {!!host && (
              <Txt variant="rowUrl" mono color={theme.colors.textFaintest}>
                {host}
              </Txt>
            )}
            <Txt variant="rowUrl" mono>
              {path}
            </Txt>
            {!!shownQuery && (
              <Txt variant="rowUrl" mono color={theme.colors.textFaint}>
                {shownQuery}
              </Txt>
            )}
          </Txt>

          {!!params.length && (
            <View style={styles.chips}>
              <Chip label={pluralise(params.length, 'query param')} />
              <Chip
                label={decodeQuery ? 'Raw' : 'Decode'}
                tone="accent"
                onPress={() => dispatch({ type: 'TOGGLE_DECODE_QUERY' })}
              />
            </View>
          )}
        </Card>
      </View>

      <TimingBreakdown timing={request.timing} />

      {/* Quick facts */}
      {!!facts.length && (
        <View style={styles.section}>
          <SectionHeader label="QUICK FACTS" />
          <Card style={styles.tightCard}>
            {facts.map((fact, index) => (
              <FactRow
                key={fact.label}
                label={fact.label}
                value={fact.value}
                last={index === facts.length - 1}
                onLongPress={() =>
                  menu.open({
                    field: { key: fact.label, value: fact.value },
                    items: [
                      {
                        label: 'Copy value',
                        icon: 'copy',
                        onPress: () =>
                          onCopy(fact.value, 'Value copied to clipboard'),
                      },
                      {
                        label: 'Copy as key: value',
                        icon: 'copy',
                        onPress: () =>
                          onCopy(
                            `${fact.label}: ${fact.value}`,
                            'Header copied to clipboard'
                          ),
                      },
                    ],
                  })
                }
              />
            ))}
          </Card>
        </View>
      )}

      {/* Error detail */}
      {request.isError && !!request.errorReason && (
        <View style={styles.section}>
          <SectionHeader label="FAILURE" />
          <Card
            style={{
              backgroundColor: theme.colors.dangerRowBg,
              borderColor: theme.colors.dangerRowBorder,
            }}
          >
            <Txt variant="headerValue" mono color={theme.colors.dangerText}>
              {request.errorReason}
              {request.statusText ? ` · ${request.statusText}` : ''}
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
  tightCard: { paddingVertical: 3 },
  url: { lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 7, marginTop: 11 },
});

export default OverviewTab;
