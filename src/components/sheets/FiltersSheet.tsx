import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Filters,
  REQUEST_METHODS,
  RequestMethod,
  STATUS_CLASSES,
  StatusClass,
} from '../../types';
import { useTheme } from '../../theme';
import { pluralise } from '../../utils/format';
import Sheet from '../ui/Sheet';
import Txt, { SectionLabel } from '../ui/Text';
import { Chip, Slider, SolidButton } from '../ui/Controls';
import { emptyFilters } from '../AppContext';

const toggleInSet = <T,>(set: Set<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

const statusTone = (cls: StatusClass) => {
  if (cls === '2xx') return 'success' as const;
  if (cls === '5xx' || cls === 'failed') return 'danger' as const;
  if (cls === '4xx') return 'warn' as const;
  return 'neutral' as const;
};

/**
 * Screen 08. Filters apply live as they are toggled — the primary button
 * only reports the resulting count and closes the sheet.
 */
const FiltersSheet = ({
  visible,
  filters,
  hosts,
  resultCount,
  bottomInset,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: Filters;
  hosts: string[];
  resultCount: number;
  bottomInset?: number;
  onChange: (next: Filters) => void;
  onClose: () => void;
}) => {
  const theme = useTheme();

  const slowerThan = filters.slowerThanMs ?? 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      headerRight={{ label: 'Reset', onPress: () => onChange(emptyFilters()) }}
      bottomInset={bottomInset}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.group}>
          <SectionLabel>METHOD</SectionLabel>
          <View style={styles.chips}>
            {REQUEST_METHODS.map((method: RequestMethod) => (
              <Chip
                key={method}
                label={method}
                size="md"
                active={filters.methods.has(method)}
                onPress={() =>
                  onChange({
                    ...filters,
                    methods: toggleInSet(filters.methods, method),
                  })
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <SectionLabel>STATUS</SectionLabel>
          <View style={styles.chips}>
            {STATUS_CLASSES.map((cls) => (
              <Chip
                key={cls}
                label={cls === 'failed' ? 'Failed' : cls}
                size="md"
                tone={statusTone(cls)}
                active={filters.statusClasses.has(cls)}
                onPress={() =>
                  onChange({
                    ...filters,
                    statusClasses: toggleInSet(filters.statusClasses, cls),
                  })
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <View style={styles.labelRow}>
            <SectionLabel>SLOWER THAN</SectionLabel>
            <Txt
              variant="chip"
              mono
              color={theme.colors.text}
              style={styles.sliderValue}
            >
              {slowerThan === 0 ? 'off' : `${slowerThan} ms`}
            </Txt>
          </View>
          <Slider
            value={slowerThan}
            min={0}
            max={5000}
            step={50}
            onChange={(next) =>
              onChange({ ...filters, slowerThanMs: next === 0 ? null : next })
            }
            accessibilityLabel="Slower than, milliseconds"
          />
        </View>

        {!!hosts.length && (
          <View style={styles.group}>
            <SectionLabel>HOST</SectionLabel>
            <View style={styles.chips}>
              {hosts.map((host) => (
                <Chip
                  key={host}
                  label={host}
                  size="md"
                  active={filters.hosts.has(host)}
                  onPress={() =>
                    onChange({
                      ...filters,
                      hosts: toggleInSet(filters.hosts, host),
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <SolidButton
        label={`Show ${pluralise(resultCount, 'request')}`}
        onPress={onClose}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  scrollContent: { paddingBottom: 4 },
  group: { marginBottom: 18 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValue: { fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});

export default FiltersSheet;
