import React from 'react';
import { StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { radius, space, useTheme } from '../../theme';
import { DEFAULT_SLOW_THRESHOLD_MS } from '../../constant';
import { formatBytes, formatDuration, formatTime } from '../../utils/format';
import Txt from '../ui/Text';
import { IconButton, StatusPill } from '../ui/Controls';

/**
 * Detail header. The URL here is the one place it *is* truncated to a
 * single line — the list guarantees you can read the whole thing, and
 * the Full URL card below repeats it in full.
 */
const DetailHeader = ({
  request,
  onBack,
  onCopy,
  onClose,
}: {
  request: NetworkRequestInfo;
  onBack: () => void;
  onCopy: () => void;
  onClose: () => void;
}) => {
  const { path, query } = request.splitUrl;

  return (
    <View style={styles.header}>
      <IconButton
        name="chevronLeft"
        onPress={onBack}
        accessibilityLabel="Back"
        bare
        iconSize={17}
        style={styles.back}
      />
      <StatusPill status={request.status} state={request.state} />
      <Txt
        variant="detailUrl"
        mono
        numberOfLines={1}
        ellipsizeMode="tail"
        style={styles.url}
      >
        {request.method} {path || request.url}
        {query}
      </Txt>
      <IconButton
        name="copy"
        onPress={onCopy}
        accessibilityLabel="Copy URL"
        iconSize={15}
      />
      <IconButton
        name="close"
        onPress={onClose}
        accessibilityLabel="Close"
        iconSize={13}
        style={styles.close}
      />
    </View>
  );
};

/** Three equal cards: DURATION · SIZE · STARTED. Amber when slow. */
export const StatCards = ({
  request,
  slowThreshold = DEFAULT_SLOW_THRESHOLD_MS,
}: {
  request: NetworkRequestInfo;
  slowThreshold?: number;
}) => {
  const theme = useTheme();
  const slow = request.duration > slowThreshold;

  const cards = [
    {
      caption: 'DURATION',
      value:
        request.duration >= 0 ? formatDuration(request.duration) : 'pending',
      color: slow ? theme.colors.warn : theme.colors.text,
    },
    {
      caption: 'SIZE',
      value: formatBytes(request.responseSize),
      color: theme.colors.text,
    },
    {
      caption: 'STARTED',
      value: formatTime(request.startTime) || '—',
      color: theme.colors.text,
    },
  ];

  return (
    <View style={styles.stats}>
      {cards.map((card) => (
        <View
          key={card.caption}
          style={[
            styles.statCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <Txt variant="statCaption" mono color={theme.colors.textMuted}>
            {card.caption}
          </Txt>
          <Txt
            variant="statValue"
            mono
            color={card.color}
            style={styles.statValue}
          >
            {card.value}
          </Txt>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: space.gutter,
    paddingBottom: 10,
    gap: 8,
  },
  back: { marginLeft: -8 },
  url: { flex: 1 },
  close: { marginRight: -2 },
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: space.gutter,
    paddingBottom: space.sectionGap,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.stat,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  statValue: { marginTop: 4 },
});

export default DetailHeader;
