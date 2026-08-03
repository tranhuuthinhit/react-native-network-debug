import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radius, space, useTheme } from '../../theme';
import Txt, { SectionLabel } from './Text';

/** `surface` + 1px `borderSoft`, 13 radius — the standard content card. */
export const Card = ({
  children,
  style,
  padded = true,
  code,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Use `surfaceCode`, one step darker — for JSON and cURL blocks. */
  code?: boolean;
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: code
            ? theme.colors.surfaceCode
            : theme.colors.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.borderSoft,
          borderRadius: radius.card,
        },
        padded && {
          paddingVertical: space.cardPadV,
          paddingHorizontal: space.cardPadH,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * `FULL URL` on the left, an optional accent action on the right. The
 * section label row that precedes almost every card in the detail tabs.
 */
export const SectionHeader = ({
  label,
  right,
  style,
}: {
  label: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      style,
    ]}
  >
    <SectionLabel>{label}</SectionLabel>
    {right}
  </View>
);

/** 1px divider between rows inside a card — never after the last row. */
export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: theme.colors.divider,
        },
        style,
      ]}
    />
  );
};

/**
 * Time-group header: a mono label followed by a rule that fills the
 * remaining width.
 */
export const GroupHeader = ({ label }: { label: string }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
      }}
    >
      <SectionLabel>{label}</SectionLabel>
      <View
        style={{
          flex: 1,
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: theme.colors.borderSoft,
        }}
      />
    </View>
  );
};

/**
 * Sticky bottom action bar: `bgRaised` with a `dividerDark` top rule.
 * Present on every detail tab so copy/share is never more than one tap
 * away — the fourth problem the redesign set out to fix.
 */
export const ActionBar = ({
  children,
  bottomInset = 0,
}: {
  children: React.ReactNode;
  bottomInset?: number;
}) => {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.bgRaised,
        borderTopWidth: StyleSheet.hairlineWidth * 2,
        borderTopColor: theme.colors.dividerDark,
        paddingTop: 12,
        paddingHorizontal: space.gutter,
        paddingBottom: 14 + bottomInset,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {children}
    </View>
  );
};

/** Key/value row used by the Quick facts card and the headers list. */
export const FactRow = ({
  label,
  value,
  last,
  onLongPress,
}: {
  label: string;
  value: string;
  last?: boolean;
  onLongPress?: () => void;
}) => {
  const theme = useTheme();

  return (
    <View>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityLabel={`${label}: ${value}`}
        style={styles.factRow}
      >
        <Txt variant="headerKey" mono color={theme.colors.textMuted}>
          {label}
        </Txt>
        <Txt variant="headerValue" mono style={styles.factValue}>
          {value}
        </Txt>
      </Pressable>
      {!last && <Divider />}
    </View>
  );
};

const styles = StyleSheet.create({
  factRow: { paddingVertical: 9 },
  factValue: { marginTop: 2 },
});
