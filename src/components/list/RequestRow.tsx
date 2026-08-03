import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { radius, space, useTheme } from '../../theme';
import { formatDuration, formatTime } from '../../utils/format';
import Txt from '../ui/Text';
import { StatusPill } from '../ui/Controls';
import Icon from '../Icon';
import Highlight from '../ui/Highlight';
import WaterfallBar, { WaterfallWindow } from '../ui/WaterfallBar';
import type { SearchHit } from '../../hooks/useFilteredRequests';

export type RequestRowProps = {
  request: NetworkRequestInfo;
  window: WaterfallWindow;
  slowThreshold: number;
  searchQuery?: string;
  hit?: SearchHit;
  onPress: (id: string) => void;
  onLongPress: (request: NetworkRequestInfo) => void;
  onCopy: (request: NetworkRequestInfo) => void;
};

/**
 * One list row. The full URL is always shown — never truncated, per the
 * explicit requirement — but split into three colour tiers so the part
 * that matters (the path) is the part that reads brightest.
 */
const RequestRow = ({
  request,
  window: win,
  slowThreshold,
  searchQuery,
  hit,
  onPress,
  onLongPress,
  onCopy,
}: RequestRowProps) => {
  const theme = useTheme();

  const isError = request.isError;
  const isSlow = request.duration > slowThreshold;
  const isPending = request.state === 'pending';
  const isCancelled = request.state === 'cancelled';

  const { host, path, query } = request.splitUrl;

  const tone = isError
    ? 'danger'
    : isPending
      ? 'pending'
      : isSlow
        ? 'warn'
        : 'success';

  const handlePress = useCallback(
    () => onPress(request.id),
    [onPress, request.id]
  );
  const handleLongPress = useCallback(
    () => onLongPress(request),
    [onLongPress, request]
  );
  const handleCopy = useCallback(() => onCopy(request), [onCopy, request]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${request.method} ${request.url}, status ${
        request.status > 0 ? request.status : 'pending'
      }`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isError
            ? theme.colors.dangerRowBg
            : theme.colors.surface,
          borderColor: isError
            ? theme.colors.dangerRowBorder
            : theme.colors.borderSoft,
        },
        // Cancelled and in-flight rows are de-emphasised rather than
        // hidden — you still want to see that the call was made.
        (isCancelled || isPending) && { opacity: 0.55 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Meta line */}
      <View style={styles.metaLine}>
        <StatusPill status={request.status} state={request.state} />
        <Txt
          variant="method"
          color={
            isError ? theme.colors.dangerMethod : theme.colors.textSecondary
          }
          style={styles.method}
        >
          {request.method}
        </Txt>

        <View style={styles.spacer} />

        {isSlow ? (
          <View
            style={[
              styles.slowChip,
              { backgroundColor: theme.colors.warnChipBg },
            ]}
          >
            <Txt variant="rowMeta" mono color={theme.colors.warn}>
              {formatDuration(request.duration)}
            </Txt>
          </View>
        ) : (
          <Txt variant="rowMeta" mono color={theme.colors.textMuted}>
            {request.duration >= 0
              ? formatDuration(request.duration)
              : isPending
                ? 'pending'
                : '—'}
          </Txt>
        )}

        <Txt
          variant="rowMeta"
          mono
          color={theme.colors.textMuted}
          style={styles.time}
        >
          {formatTime(request.startTime)}
        </Txt>

        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy URL"
          hitSlop={10}
          style={({ pressed }) => [styles.copy, pressed && { opacity: 0.5 }]}
        >
          <Icon name="copy" size={14} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {/* URL block — wraps freely, never truncates */}
      <Txt variant="rowUrl" mono style={styles.url}>
        {!!host && (
          <Txt
            variant="rowUrl"
            mono
            color={
              isError ? theme.colors.dangerHost : theme.colors.textFaintest
            }
          >
            <Highlight text={host} query={searchQuery} />
          </Txt>
        )}
        <Txt
          variant="rowUrl"
          mono
          color={isError ? theme.colors.dangerPath : theme.colors.text}
        >
          <Highlight text={path} query={searchQuery} />
        </Txt>
        {!!query && (
          <Txt variant="rowUrl" mono color={theme.colors.textFaint}>
            <Highlight text={query} query={searchQuery} />
          </Txt>
        )}
      </Txt>

      {!!request.gqlOperation && (
        <Txt variant="rowMeta" mono color={theme.colors.accent}>
          gql: {request.gqlOperation}
        </Txt>
      )}

      {/* Error reason line */}
      {isError && !!request.errorReason && (
        <Txt
          variant="headerKey"
          mono
          color={theme.colors.dangerText}
          style={styles.reason}
        >
          {request.errorReason}
        </Txt>
      )}

      {/* Body-match excerpt (search screen) */}
      {!!hit?.bodyExcerpt && (
        <View
          style={[
            styles.excerpt,
            {
              backgroundColor: theme.colors.surfaceCode,
              borderLeftColor: theme.colors.accent,
            },
          ]}
        >
          <Txt mono color={theme.colors.textMuted} style={styles.excerptLabel}>
            BODY
          </Txt>
          <Txt variant="headerKey" mono style={styles.excerptText}>
            <Highlight text={hit.bodyExcerpt} query={searchQuery} />
          </Txt>
        </View>
      )}

      <WaterfallBar
        startTime={request.startTime}
        endTime={request.endTime || Date.now()}
        window={win}
        tone={tone}
        errorRow={isError}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: space.cardPadV,
    paddingHorizontal: space.cardPadH,
    gap: space.rowGap,
  },
  metaLine: { flexDirection: 'row', alignItems: 'center' },
  method: { marginLeft: 8 },
  spacer: { flex: 1 },
  slowChip: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  time: { marginLeft: 8 },
  copy: { marginLeft: 10 },
  url: { flexShrink: 1 },
  reason: { marginTop: -2 },
  excerpt: {
    borderLeftWidth: 2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  excerptLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  excerptText: { lineHeight: 17 },
});

/**
 * The list re-renders on every logger tick. Comparing `updatedAt` means
 * a row only re-renders when its own request actually changed, or when
 * the search query / waterfall window moved.
 */
export default memo(RequestRow, (prev, next) => {
  return (
    prev.request.id === next.request.id &&
    prev.request.updatedAt === next.request.updatedAt &&
    prev.searchQuery === next.searchQuery &&
    prev.hit === next.hit &&
    prev.slowThreshold === next.slowThreshold &&
    prev.window.start === next.window.start &&
    prev.window.end === next.window.end
  );
});
