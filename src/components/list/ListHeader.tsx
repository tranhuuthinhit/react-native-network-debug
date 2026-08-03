import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { hit, space, useTheme } from '../../theme';
import { formatDuration, formatTime, pluralise } from '../../utils/format';
import Txt from '../ui/Text';
import Icon, { StatusIndicator } from '../Icon';
import { IconButton } from '../ui/Controls';

/**
 * Header row: back chevron · title block · overflow kebab.
 *
 * The status line under the title is the screen's only always-visible
 * state readout — whether capture is live, how much is buffered, and
 * how fast the app is going.
 */
const ListHeader = ({
  title = 'Network Log',
  paused,
  requestCount,
  averageDuration,
  clearedAt,
  onBack,
  onOptions,
}: {
  title?: string;
  paused: boolean;
  requestCount: number;
  averageDuration: number;
  clearedAt: number | null;
  onBack?: () => void;
  onOptions: () => void;
}) => {
  const theme = useTheme();

  const status = paused
    ? clearedAt
      ? `paused · cleared ${formatTime(clearedAt)}`
      : 'paused'
    : `recording · ${pluralise(requestCount, 'req')} · avg ${formatDuration(
        averageDuration
      )}`;

  return (
    <View style={styles.container}>
      {!!onBack && (
        <IconButton
          name="chevronLeft"
          onPress={onBack}
          accessibilityLabel="Back"
          bare
          iconSize={17}
          style={styles.back}
        />
      )}

      <View style={styles.titleBlock}>
        <Txt variant="screenTitle" accessibilityRole="header">
          {title}
        </Txt>
        <View style={styles.statusLine}>
          <StatusIndicator
            color={paused ? theme.colors.warn : theme.colors.success}
            square={paused}
          />
          <Txt
            variant="rowMeta"
            mono
            color={theme.colors.textMuted}
            style={styles.statusText}
          >
            {status}
          </Txt>
        </View>
      </View>

      <IconButton
        name="kebab"
        onPress={onOptions}
        accessibilityLabel="More options"
        testID="options-menu"
        iconSize={14}
      />
    </View>
  );
};

/** Amber banner shown while capture is detached. */
export const PausedBanner = ({ onResume }: { onResume: () => void }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.warnBg,
          borderColor: theme.colors.warnBorder,
        },
      ]}
    >
      <Icon name="pause" size={14} color={theme.colors.warn} />
      <Txt
        variant="tab"
        color={theme.colors.warnText}
        style={styles.bannerText}
      >
        Capture is paused — new requests are not recorded.
      </Txt>
      <Pressable
        onPress={onResume}
        accessibilityRole="button"
        accessibilityLabel="Resume capture"
        style={({ pressed }) => [
          styles.resume,
          { backgroundColor: theme.colors.warn, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Txt variant="tabActive" color={theme.colors.onAccent}>
          Resume
        </Txt>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    minHeight: hit.icon + 18,
  },
  back: { marginLeft: -8, marginRight: 2 },
  titleBlock: { flex: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusText: { marginLeft: 6 },
  banner: {
    marginHorizontal: space.gutter,
    marginBottom: space.sectionGap,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: { flex: 1, marginLeft: 10, marginRight: 10 },
  resume: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
});

export default ListHeader;
