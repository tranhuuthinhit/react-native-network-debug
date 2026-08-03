import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, type as typeScale, useTheme } from '../../theme';
import {
  countNodes,
  EXPAND_ALL_CONFIRM_THRESHOLD,
  flattenJson,
  JsonLine,
  Token,
  TokenKind,
} from '../../utils/jsonTree';
import { formatBytes } from '../../utils/format';
import Txt from '../ui/Text';
import { LinkButton } from '../ui/Controls';
import { Divider } from '../ui/Layout';
import Highlight from '../ui/Highlight';
import { useContextMenu } from '../ui/ContextMenu';

/** 14px indent per level, per the handoff. */
const INDENT = 14;

const JsonLineRow = ({
  line,
  searchQuery,
  onToggle,
  onLongPress,
}: {
  line: JsonLine;
  searchQuery?: string;
  onToggle: (path: string, collapsed: boolean) => void;
  onLongPress: (line: JsonLine) => void;
}) => {
  const theme = useTheme();

  const colourFor = (kind: TokenKind) => {
    switch (kind) {
      case 'key':
        return theme.colors.jsonKey;
      case 'string':
        return theme.colors.jsonString;
      case 'number':
        return theme.colors.jsonNumber;
      case 'literal':
        return theme.colors.jsonLiteral;
      default:
        return theme.colors.jsonPunctuation;
    }
  };

  const container = line.container;

  const content = (
    <Txt variant="code" mono style={{ marginLeft: line.depth * INDENT }}>
      {!!container && (
        <Txt variant="code" mono color={theme.colors.textMuted}>
          {container.collapsed ? '▸ ' : '▾ '}
        </Txt>
      )}
      {line.tokens.map((token: Token, index) => (
        <Txt key={index} variant="code" mono color={colourFor(token.kind)}>
          <Highlight text={token.text} query={searchQuery} />
        </Txt>
      ))}
      {!!container?.collapsed && (
        <Txt variant="code" mono color={theme.colors.textMuted}>
          {'  '}
          <Txt
            mono
            color={theme.colors.textMuted}
            style={[styles.badge, { backgroundColor: theme.colors.surfaceAlt }]}
          >
            {' '}
            {container.childCount}{' '}
            {container.kind === 'array' ? 'items' : 'keys'}{' '}
          </Txt>
        </Txt>
      )}
    </Txt>
  );

  if (!container) {
    return (
      <Pressable
        onLongPress={() => onLongPress(line)}
        delayLongPress={350}
        accessibilityLabel={line.tokens.map((t) => t.text).join('')}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onToggle(line.path, !container.collapsed)}
      onLongPress={() => onLongPress(line)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityState={{ expanded: !container.collapsed }}
      accessibilityLabel={`${container.kind} with ${container.childCount} entries`}
    >
      {content}
    </Pressable>
  );
};

/**
 * Collapsible JSON viewer. Nodes are addressed by dotted path so the
 * collapse state survives re-renders and lives in app state per request.
 */
const JsonTree = ({
  value,
  searchQuery,
  byteSize,
  collapsedPaths,
  expandedPaths,
  onToggle,
  onExpandAll,
  onCopy,
  onSearchValue,
}: {
  value: unknown;
  searchQuery?: string;
  byteSize: number;
  collapsedPaths: Set<string>;
  expandedPaths: Set<string>;
  onToggle: (path: string, collapsed: boolean) => void;
  onExpandAll: (confirmNeeded: boolean) => void;
  onCopy: (value: string, message: string) => void;
  onSearchValue: (value: string) => void;
}) => {
  const theme = useTheme();
  const menu = useContextMenu();

  const lines = useMemo(
    () => flattenJson(value, { collapsedPaths, expandedPaths }),
    [value, collapsedPaths, expandedPaths]
  );

  const collapsedCount = useMemo(
    () => lines.filter((line) => line.container?.collapsed).length,
    [lines]
  );

  const nodeCount = useMemo(() => countNodes(value), [value]);

  const onLongPress = useCallback(
    (line: JsonLine) => {
      const text = line.tokens.map((t) => t.text).join('');
      menu.open({
        field: { key: line.path || 'root', value: line.rawValue ?? text },
        items: [
          {
            label: 'Copy node',
            icon: 'copy',
            onPress: () =>
              onCopy(line.rawValue ?? text, 'Node copied to clipboard'),
          },
          {
            label: 'Copy path',
            icon: 'copy',
            onPress: () =>
              onCopy(line.path || 'root', 'Path copied to clipboard'),
          },
          ...(line.rawValue
            ? [
                {
                  label: 'Search this value',
                  icon: 'search' as const,
                  onPress: () => onSearchValue(line.rawValue as string),
                },
              ]
            : []),
        ],
      });
    },
    [menu, onCopy, onSearchValue]
  );

  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: theme.colors.surfaceCode,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      {lines.map((line, index) => (
        <JsonLineRow
          key={`${line.path}-${index}`}
          line={line}
          searchQuery={searchQuery}
          onToggle={onToggle}
          onLongPress={onLongPress}
        />
      ))}

      <Divider
        style={{ marginTop: 10, backgroundColor: theme.colors.dividerDark }}
      />
      <View style={styles.footer}>
        <Txt
          variant="rowMeta"
          mono
          color={theme.colors.textMuted}
          style={styles.footerText}
        >
          {formatBytes(byteSize)}
          {collapsedCount > 0 ? ` · ${collapsedCount} levels collapsed` : ''}
        </Txt>
        {collapsedCount > 0 && (
          <LinkButton
            label="Expand all"
            onPress={() =>
              onExpandAll(nodeCount > EXPAND_ALL_CONFIRM_THRESHOLD)
            }
          />
        )}
      </View>
    </View>
  );
};

/** Raw payload view for the `Raw` toggle and non-JSON bodies. */
export const RawBlock = ({
  text,
  searchQuery,
  activeMatchIndex,
}: {
  text: string;
  searchQuery?: string;
  activeMatchIndex?: number;
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: theme.colors.surfaceCode,
          borderColor: theme.colors.borderSoft,
        },
      ]}
    >
      <Txt variant="code" mono selectable>
        <Highlight
          text={text}
          query={searchQuery}
          activeIndex={activeMatchIndex}
          style={typeScale.code as never}
        />
      </Txt>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 12,
  },
  badge: { fontSize: 11, borderRadius: 4, overflow: 'hidden' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 9,
  },
  footerText: { flex: 1 },
});

export default JsonTree;
