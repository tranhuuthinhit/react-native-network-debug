import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RequestTiming } from '../../types';
import { space, useTheme } from '../../theme';
import { formatMs } from '../../utils/format';
import Txt from '../ui/Text';
import { Card, SectionHeader } from '../ui/Layout';
import { PhaseBar } from '../ui/WaterfallBar';

/**
 * Phase order matches the order the phases actually occur in. Only
 * phases present on the entry are rendered — see `RequestTiming` for
 * why DNS/TCP/TLS are usually absent from an XHR-based capture.
 */
const PHASE_ORDER: { key: keyof RequestTiming; label: string }[] = [
  { key: 'dns', label: 'DNS' },
  { key: 'tcp', label: 'TCP' },
  { key: 'tls', label: 'TLS' },
  { key: 'queued', label: 'Queued' },
  { key: 'sent', label: 'Sent' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'download', label: 'Download' },
];

/** A phase taking more than this share of total earns the closing note. */
const DOMINANT_PHASE_RATIO = 0.6;

const TimingBreakdown = ({ timing }: { timing: RequestTiming }) => {
  const theme = useTheme();

  const phases = PHASE_ORDER.map(({ key, label }) => ({
    key,
    label,
    value: timing[key] ?? 0,
  })).filter((phase) => phase.value > 0);

  if (!phases.length) return null;

  const total = phases.reduce((sum, phase) => sum + phase.value, 0);

  const colourFor = (key: keyof RequestTiming) => {
    if (key === 'waiting') return theme.colors.warn;
    if (key === 'download') return theme.colors.success;
    return theme.colors.textSecondary;
  };

  const dominant = phases.reduce((max, phase) =>
    phase.value > max.value ? phase : max
  );
  const dominantShare = dominant.value / total;
  const note =
    dominantShare > DOMINANT_PHASE_RATIO
      ? dominant.key === 'waiting'
        ? `${Math.round(dominantShare * 100)}% of the time is server think-time.`
        : `${Math.round(dominantShare * 100)}% of the time is ${dominant.label.toLowerCase()}.`
      : null;

  let cumulative = 0;

  return (
    <View style={styles.section}>
      <SectionHeader
        label="TIMING BREAKDOWN"
        right={
          <Txt variant="rowMeta" mono color={theme.colors.textMuted}>
            {formatMs(total)} total
          </Txt>
        }
      />
      <Card>
        {phases.map((phase) => {
          const offset = (cumulative / total) * 100;
          const width = (phase.value / total) * 100;
          cumulative += phase.value;

          const emphasised =
            phase.key === 'waiting' && dominantShare > DOMINANT_PHASE_RATIO;

          return (
            <View key={phase.key} style={styles.phaseRow}>
              <Txt
                variant="rowMeta"
                mono
                color={emphasised ? theme.colors.warn : theme.colors.textMuted}
                weight={emphasised ? '600' : '500'}
                style={styles.phaseLabel}
              >
                {phase.label}
              </Txt>
              <PhaseBar
                offsetPercent={offset}
                widthPercent={width}
                color={colourFor(phase.key)}
              />
              <Txt
                variant="rowMeta"
                mono
                color={emphasised ? theme.colors.warn : theme.colors.text}
                align="right"
                style={styles.phaseValue}
              >
                {formatMs(phase.value)}
              </Txt>
            </View>
          );
        })}

        {!!note && (
          <View
            style={[styles.note, { borderTopColor: theme.colors.borderSoft }]}
          >
            <Txt
              variant="rowMeta"
              mono
              color={theme.colors.warnText}
              weight="400"
              style={styles.noteText}
            >
              {note}
            </Txt>
          </View>
        )}
      </Card>

      <Txt
        variant="headerKey"
        mono
        color={theme.colors.textFaintest}
        style={styles.disclaimer}
      >
        Phases are measured from the JS interceptor. XMLHttpRequest exposes no
        DNS, TCP or TLS timings, so those are omitted rather than estimated.
      </Txt>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.gutter, paddingBottom: space.sectionGap },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  phaseLabel: { width: 74 },
  phaseValue: { width: 56 },
  note: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    marginTop: 8,
    paddingTop: 9,
  },
  noteText: { lineHeight: 17 },
  disclaimer: { marginTop: 8, lineHeight: 16 },
});

export default TimingBreakdown;
