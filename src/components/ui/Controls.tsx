import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { hit, radius, Theme, useTheme } from '../../theme';
import Txt from './Text';
import Icon, { IconName } from '../Icon';

/* ─────────────────────────── Icon button ───────────────────────────
 * 36×36 surface tile with a soft border — back chevron, kebab, copy,
 * close. Used in both the list and detail headers.
 * ─────────────────────────────────────────────────────────────────── */

export const IconButton = ({
  name,
  onPress,
  accessibilityLabel,
  size = hit.icon,
  iconSize = 15,
  color,
  bare,
  style,
  testID,
}: {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  color?: string;
  /** No tile — just the glyph in its tap area (the back chevron). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          opacity: pressed ? 0.6 : 1,
        },
        !bare && {
          backgroundColor: theme.colors.surface,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.borderSoft,
        },
        style,
      ]}
    >
      <Icon
        name={name}
        size={iconSize}
        color={color ?? theme.colors.textSecondary}
      />
    </Pressable>
  );
};

/* ───────────────────────────── Chip ─────────────────────────────────
 * The one chip primitive behind quick filters, search scopes, query
 * param counts, code formats and the Filters sheet.
 * ─────────────────────────────────────────────────────────────────── */

export type ChipTone = 'neutral' | 'success' | 'danger' | 'warn' | 'accent';

const chipTone = (theme: Theme, tone: ChipTone) => {
  switch (tone) {
    case 'success':
      return {
        bg: theme.colors.successBg,
        border: theme.colors.successBorder,
        text: theme.colors.successText,
      };
    case 'danger':
      return {
        bg: theme.colors.dangerBg,
        border: theme.colors.dangerBorder,
        text: theme.colors.dangerText,
      };
    case 'warn':
      return {
        bg: theme.colors.warnBg,
        border: theme.colors.warnBorder,
        text: theme.colors.warn,
      };
    case 'accent':
      return {
        bg: theme.colors.accentBgSoft,
        border: 'transparent',
        text: theme.colors.accent,
      };
    default:
      return {
        bg: theme.colors.surfaceAlt,
        border: theme.colors.border,
        text: theme.colors.textMuted,
      };
  }
};

export const Chip = ({
  label,
  count,
  active,
  tone = 'neutral',
  onPress,
  size = 'sm',
  style,
  accessibilityLabel,
}: {
  label: string;
  /** Rendered after the label, e.g. `All 48`. */
  count?: number;
  active?: boolean;
  tone?: ChipTone;
  onPress?: () => void;
  /** `sm` for list/quick chips, `md` for the Filters sheet. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) => {
  const theme = useTheme();
  const tokens = chipTone(theme, tone);

  // An active chip inverts to a solid light fill with dark text, except
  // for the status tones which keep their tint and brighten their text.
  const isTinted = tone !== 'neutral';
  const background = active
    ? isTinted
      ? tokens.bg
      : theme.colors.text
    : isTinted
      ? tokens.bg
      : theme.colors.surfaceAlt;
  const borderColor = active
    ? isTinted
      ? tokens.border
      : theme.colors.text
    : isTinted
      ? tokens.border
      : theme.colors.border;
  const textColor = active
    ? isTinted
      ? tokens.text
      : theme.colors.onAccent
    : isTinted
      ? tokens.text
      : theme.colors.textMuted;

  const padding =
    size === 'md'
      ? { paddingVertical: 9, paddingHorizontal: 14 }
      : { paddingVertical: 4, paddingHorizontal: 8 };

  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      {...(onPress && {
        onPress,
        accessibilityRole: 'button',
        accessibilityState: { selected: !!active },
        accessibilityLabel: accessibilityLabel ?? label,
      })}
      style={[
        {
          ...padding,
          borderRadius: size === 'md' ? radius.chip : radius.chipSm,
          backgroundColor: background,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Txt
        variant="chip"
        mono
        color={textColor}
        weight={active ? '600' : '500'}
        style={size === 'md' ? { fontSize: 12 } : undefined}
      >
        {label}
        {count !== undefined ? `  ${count}` : ''}
      </Txt>
    </Wrapper>
  );
};

/* ──────────────────────────── Status pill ───────────────────────────
 * 11/600 mono in a 5-radius tinted capsule. `—` while pending.
 * ─────────────────────────────────────────────────────────────────── */

export const StatusPill = ({
  status,
  state,
}: {
  status: number;
  state?: 'pending' | 'done' | 'failed' | 'cancelled';
}) => {
  const theme = useTheme();

  const tone =
    state === 'failed' || state === 'cancelled' || status >= 400
      ? 'danger'
      : status > 0 && status < 400
        ? 'success'
        : 'neutral';

  const tokens = chipTone(theme, tone as ChipTone);
  const label =
    state === 'cancelled'
      ? 'CXL'
      : state === 'failed'
        ? 'ERR'
        : status > 0
          ? String(status)
          : '—';

  return (
    <View
      style={{
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: radius.pill,
        backgroundColor:
          tone === 'neutral' ? theme.colors.surfaceAlt : tokens.bg,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: tone === 'neutral' ? theme.colors.border : tokens.border,
      }}
      accessibilityLabel={`Response status ${label}`}
    >
      <Txt
        variant="statusPill"
        mono
        color={tone === 'neutral' ? theme.colors.textMuted : tokens.text}
      >
        {label}
      </Txt>
    </View>
  );
};

/* ───────────────────────────── Tabs ─────────────────────────────────
 * Four equal 38pt segments. Active segment is a light pill with dark
 * text; the cURL label is mono while the others are sans.
 * ─────────────────────────────────────────────────────────────────── */

export const Tabs = <T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; mono?: boolean }[];
  value: T;
  onChange: (key: T) => void;
}) => {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flex: 1,
              height: hit.control,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.chip,
              backgroundColor: active ? theme.colors.text : 'transparent',
              opacity: pressed && !active ? 0.6 : 1,
            })}
          >
            <Txt
              variant={active ? 'tabActive' : 'tab'}
              mono={tab.mono}
              color={active ? theme.colors.onAccent : theme.colors.textMuted}
            >
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ──────────────────────────── Toggle ──────────────────────────────── */

export const Toggle = ({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{
        width: 38,
        height: 22,
        borderRadius: 11,
        padding: 2,
        backgroundColor: value ? theme.colors.success : theme.colors.surfaceAlt,
        borderWidth: value ? 0 : StyleSheet.hairlineWidth * 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: value
            ? theme.colors.onAccent
            : theme.colors.textMuted,
          alignSelf: value ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  );
};

/* ──────────────────────────── Slider ────────────────────────────────
 * Zero-dependency slider on PanResponder: a 4px track with a light fill
 * and a 20px knob. Used for the `SLOWER THAN` filter.
 * ─────────────────────────────────────────────────────────────────── */

const KNOB = 20;

export const Slider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  accessibilityLabel: string;
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startValue = useRef(value);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  }, []);

  const quantise = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      return Math.round(clamped / step) * step;
    },
    [min, max, step]
  );

  // The responder is created once. It reads the live value, bounds and
  // handler through refs, so a drag that starts after a re-render still
  // moves from the current value without rebuilding the gesture.
  const live = useRef({ value, min, max, onChange, quantise });
  live.current = { value, min, max, onChange, quantise };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValue.current = live.current.value;
      },
      onPanResponderMove: (_, gesture) => {
        const track = widthRef.current - KNOB;
        if (track <= 0) return;
        const {
          min: lo,
          max: hi,
          onChange: emit,
          quantise: snap,
        } = live.current;
        const delta = (gesture.dx / track) * (hi - lo);
        emit(snap(startValue.current + delta));
      },
    })
  ).current;

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const knobLeft = Math.max(0, Math.min(1, ratio)) * Math.max(0, width - KNOB);

  return (
    <View
      onLayout={onLayout}
      style={{ height: KNOB + 8, justifyContent: 'center' }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      {...responder.panHandlers}
    >
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.colors.surfaceAlt,
          marginHorizontal: KNOB / 2,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
            borderRadius: 2,
            backgroundColor: theme.colors.text,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: knobLeft,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: theme.colors.text,
        }}
      />
    </View>
  );
};

/* ─────────────────────────── Text link ─────────────────────────────
 * The accent `Copy` / `Copy all` / `Expand all` affordances.
 * ─────────────────────────────────────────────────────────────────── */

export const LinkButton = ({
  label,
  onPress,
  color,
  mono,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  mono?: boolean;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
    >
      <Txt variant="chip" mono={mono} color={color ?? theme.colors.accent}>
        {label}
      </Txt>
    </Pressable>
  );
};

/* ─────────────────────── Solid / secondary button ─────────────────── */

export const SolidButton = ({
  label,
  onPress,
  tone = 'accent',
  height = 50,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'light' | 'muted' | 'warn';
  height?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const theme = useTheme();

  const fill =
    tone === 'accent'
      ? theme.colors.accent
      : tone === 'light'
        ? theme.colors.text
        : tone === 'warn'
          ? theme.colors.warn
          : theme.colors.surfaceAlt;
  const textColor =
    tone === 'muted' ? theme.colors.textSecondary : theme.colors.onAccent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.card,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Txt variant="sheetItem" color={textColor} weight="600">
        {label}
      </Txt>
    </Pressable>
  );
};
