import React from 'react';
import { View } from 'react-native';
import { radius, useTheme } from '../../theme';

export type WaterfallWindow = {
  /** Earliest start across the currently filtered rows. */
  start: number;
  /** Latest end across the currently filtered rows. */
  end: number;
};

/**
 * The 3px bar under every list row: offset encodes when the request
 * started relative to the visible window, width encodes how long it
 * took, colour encodes the outcome. Together they answer "what order
 * did this happen in, and what was slow" at a glance — the second
 * problem the redesign set out to fix.
 *
 * Offsets are relative to the *filtered* window, so they recompute when
 * the filters change and always use the full width of the screen.
 */
const WaterfallBar = ({
  startTime,
  endTime,
  window: win,
  tone,
  errorRow,
  height = 3,
}: {
  startTime: number;
  endTime: number;
  window: WaterfallWindow;
  tone: 'success' | 'danger' | 'warn' | 'pending';
  errorRow?: boolean;
  height?: number;
}) => {
  const theme = useTheme();

  const span = Math.max(1, win.end - win.start);
  const rawOffset = ((startTime - win.start) / span) * 100;
  const rawWidth = ((Math.max(endTime, startTime) - startTime) / span) * 100;

  const offset = Math.max(0, Math.min(100, rawOffset));
  // A sub-millisecond request would otherwise be invisible; floor the
  // width so every row still shows where it sits in the timeline.
  const width = Math.max(1.5, Math.min(100 - offset, rawWidth));

  const fill =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'warn'
        ? theme.colors.warn
        : tone === 'pending'
          ? theme.colors.textMuted
          : theme.colors.success;

  return (
    <View
      style={{
        height,
        borderRadius: radius.bar,
        backgroundColor: errorRow
          ? theme.colors.dangerRowTrack
          : theme.colors.track,
        overflow: 'hidden',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {startTime > 0 && (
        <View
          style={{
            position: 'absolute',
            left: `${offset}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderRadius: radius.bar,
            backgroundColor: fill,
            opacity: tone === 'pending' ? 0.5 : 1,
          }}
        />
      )}
    </View>
  );
};

/**
 * The horizontal phase bar in the detail Overview's timing breakdown:
 * a 6px track with one absolutely positioned cumulative segment.
 */
export const PhaseBar = ({
  offsetPercent,
  widthPercent,
  color,
}: {
  offsetPercent: number;
  widthPercent: number;
  color: string;
}) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        height: 6,
        borderRadius: radius.track,
        backgroundColor: theme.colors.track,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: `${Math.max(0, Math.min(100, offsetPercent))}%`,
          width: `${Math.max(1, Math.min(100, widthPercent))}%`,
          top: 0,
          bottom: 0,
          borderRadius: radius.track,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export default WaterfallBar;
