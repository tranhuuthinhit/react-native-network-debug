import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { hit, radius, space, useTheme } from '../../theme';
import { SEARCH_DEBOUNCE_MS } from '../../constant';
import { pluralise } from '../../utils/format';
import Txt from '../ui/Text';
import Icon from '../Icon';
import { Chip } from '../ui/Controls';
import { useFonts } from '../ui/Text';
import { SearchScopes } from '../../types';

/**
 * Search field + filter button. Input is debounced 150ms and held in
 * local state so typing stays responsive while the list refilters.
 */
const SearchRow = ({
  value,
  onChangeValue,
  filterActive,
  onOpenFilters,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  filterActive: boolean;
  onOpenFilters: () => void;
}) => {
  const theme = useTheme();
  const fonts = useFonts();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the field in sync when the query is cleared from elsewhere
  // (Cancel button, quick chip reset).
  useEffect(() => {
    if (value !== draft) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onChange = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeValue(next), SEARCH_DEBOUNCE_MS);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    setDraft('');
    onChangeValue('');
  };

  const cancel = () => {
    clear();
    inputRef.current?.blur();
    setFocused(false);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const active = focused || !!draft;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.field,
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
          size={15}
          color={active ? theme.colors.accent : theme.colors.textMuted}
        />
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Filter URLs, headers, body…"
          placeholderTextColor={theme.colors.textMuted}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={theme.colors.accent}
          accessibilityLabel="Search requests"
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontFamily: fonts.mono,
              fontWeight: draft ? '500' : '400',
            },
          ]}
        />
        {!!draft && (
          <Pressable
            onPress={clear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={[styles.clear, { backgroundColor: theme.colors.handle }]}
          >
            <Icon
              name="close"
              size={10}
              color={theme.colors.text}
              weight={1.5}
            />
          </Pressable>
        )}
      </View>

      {active ? (
        <Pressable
          onPress={cancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel search"
          hitSlop={8}
          style={styles.cancel}
        >
          <Txt variant="sheetItem" color={theme.colors.accent}>
            Cancel
          </Txt>
        </Pressable>
      ) : (
        <Pressable
          onPress={onOpenFilters}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          style={[
            styles.filterButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Icon name="filter" size={17} color={theme.colors.textSecondary} />
          {filterActive && (
            <View
              style={[
                styles.filterDot,
                { backgroundColor: theme.colors.accent },
              ]}
            />
          )}
        </Pressable>
      )}
    </View>
  );
};

/**
 * `3 requests · 7 matches` plus the scope toggles. Scopes are
 * independent — URL, Headers and Body can all be on at once.
 */
export const SearchResultBar = ({
  requestCount,
  matchCount,
  scopes,
  onToggleScope,
}: {
  requestCount: number;
  matchCount: number;
  scopes: SearchScopes;
  onToggleScope: (scope: keyof SearchScopes) => void;
}) => {
  const theme = useTheme();

  return (
    <View style={styles.resultBar}>
      <Txt
        variant="rowMeta"
        mono
        color={theme.colors.textMuted}
        style={styles.resultText}
      >
        {pluralise(requestCount, 'request')} ·{' '}
        {pluralise(matchCount, 'match', 'matches')}
      </Txt>
      <View style={styles.scopes}>
        {(['url', 'headers', 'body'] as const).map((scope) => (
          <Chip
            key={scope}
            label={
              scope === 'url' ? 'URL' : scope === 'headers' ? 'Headers' : 'Body'
            }
            active={scopes[scope]}
            onPress={() => onToggleScope(scope)}
            style={styles.scopeChip}
            accessibilityLabel={`Search in ${scope}`}
          />
        ))}
      </View>
    </View>
  );
};

/** Single-select shortcuts writing into the shared filter state. */
export const QuickChips = ({
  value,
  counts,
  onChange,
}: {
  value: 'all' | 'errors' | 'slow' | 'post';
  counts: { all: number; errors: number; slow: number; post: number };
  onChange: (next: 'all' | 'errors' | 'slow' | 'post') => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipsContent}
    style={styles.chips}
  >
    <Chip
      label="All"
      count={counts.all}
      active={value === 'all'}
      onPress={() => onChange('all')}
    />
    <Chip
      label="Errors"
      count={counts.errors}
      tone="danger"
      active={value === 'errors'}
      onPress={() => onChange('errors')}
    />
    <Chip
      label="Slow"
      count={counts.slow}
      tone="warn"
      active={value === 'slow'}
      onPress={() => onChange('slow')}
    />
    <Chip
      label="POST"
      count={counts.post}
      active={value === 'post'}
      onPress={() => onChange('post')}
    />
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    gap: 10,
  },
  field: {
    flex: 1,
    height: hit.tap,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    // Android adds vertical padding that breaks the 44pt field height.
    paddingVertical: 0,
  },
  clear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { height: hit.tap, justifyContent: 'center' },
  filterButton: {
    width: hit.tap,
    height: hit.tap,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
  },
  resultText: { flex: 1 },
  scopes: { flexDirection: 'row', gap: 6 },
  scopeChip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  chips: { flexGrow: 0 },
  chipsContent: {
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
    gap: 7,
    alignItems: 'center',
  },
});

export default SearchRow;
