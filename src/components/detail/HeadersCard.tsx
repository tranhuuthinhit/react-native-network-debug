import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Headers } from '../../types';
import { radius, space, useTheme } from '../../theme';
import Txt from '../ui/Text';
import { Card, Divider, SectionHeader } from '../ui/Layout';
import { LinkButton } from '../ui/Controls';
import Icon from '../Icon';
import Highlight from '../ui/Highlight';
import { useContextMenu } from '../ui/ContextMenu';

/**
 * Collapsible header block. Redacted values keep a `redacted` badge so
 * an engineer can tell "masked" apart from "the server sent this".
 */
const HeadersCard = ({
  label,
  headers,
  redacted,
  searchQuery,
  defaultCollapsed,
  onCopyAll,
  onCopyValue,
  onFilterByHeader,
  onSearchValue,
}: {
  label: string;
  headers: Headers;
  redacted?: Set<string>;
  searchQuery?: string;
  defaultCollapsed?: boolean;
  onCopyAll: () => void;
  onCopyValue: (value: string, message: string) => void;
  onFilterByHeader?: (name: string, value: string) => void;
  onSearchValue?: (value: string) => void;
}) => {
  const theme = useTheme();
  const menu = useContextMenu();
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);

  const entries = Object.entries(headers ?? {});

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setCollapsed((prev) => !prev)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={`${label}, ${entries.length} items`}
          hitSlop={8}
          style={styles.caretRow}
        >
          <Icon
            name={collapsed ? 'chevronRight' : 'chevronDown'}
            size={11}
            color={theme.colors.textMuted}
          />
          <SectionHeader
            label={`${label} · ${entries.length}`}
            style={styles.inlineLabel}
          />
        </Pressable>
        {!collapsed && !!entries.length && (
          <LinkButton label="Copy all" onPress={onCopyAll} />
        )}
      </View>

      {!collapsed && !!entries.length && (
        <Card style={styles.card}>
          {entries.map(([name, value], index) => {
            const isRedacted = redacted?.has(name);
            const stringValue = String(value);

            return (
              <View key={name}>
                <Pressable
                  onLongPress={() =>
                    menu.open({
                      field: { key: name, value: stringValue },
                      items: [
                        {
                          label: 'Copy value',
                          icon: 'copy',
                          onPress: () =>
                            onCopyValue(
                              stringValue,
                              'Value copied to clipboard'
                            ),
                        },
                        {
                          label: 'Copy as key: value',
                          icon: 'copy',
                          onPress: () =>
                            onCopyValue(
                              `${name}: ${stringValue}`,
                              'Header copied to clipboard'
                            ),
                        },
                        ...(onFilterByHeader
                          ? [
                              {
                                label: 'Filter requests by this header',
                                icon: 'filter' as const,
                                onPress: () =>
                                  onFilterByHeader(name, stringValue),
                              },
                            ]
                          : []),
                        ...(onSearchValue
                          ? [
                              {
                                label: 'Search this value in all logs',
                                icon: 'search' as const,
                                onPress: () => onSearchValue(stringValue),
                              },
                            ]
                          : []),
                      ],
                    })
                  }
                  delayLongPress={350}
                  accessibilityLabel={`${name}: ${stringValue}`}
                  style={styles.headerBlock}
                >
                  <View style={styles.keyRow}>
                    <Txt
                      variant="headerKey"
                      mono
                      color={theme.colors.textMuted}
                    >
                      <Highlight text={name} query={searchQuery} />
                    </Txt>
                    {isRedacted && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: theme.colors.surfaceAlt },
                        ]}
                      >
                        <Txt
                          mono
                          color={theme.colors.textMuted}
                          style={styles.badgeText}
                        >
                          redacted
                        </Txt>
                      </View>
                    )}
                  </View>
                  <Txt variant="headerValue" mono style={styles.value}>
                    <Highlight text={stringValue} query={searchQuery} />
                  </Txt>
                </Pressable>
                {index < entries.length - 1 && <Divider />}
              </View>
            );
          })}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.gutter, paddingBottom: space.sectionGap },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caretRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  inlineLabel: { marginBottom: 0, flex: 1 },
  card: { paddingVertical: 2, marginTop: 8, borderRadius: radius.card },
  headerBlock: { paddingVertical: 10 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '500' },
  value: { marginTop: 3 },
});

export default HeadersCard;
