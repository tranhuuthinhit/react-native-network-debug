import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../../theme';
import { formatBytes, pluralise } from '../../utils/format';
import Sheet from '../ui/Sheet';
import Txt, { SectionLabel } from '../ui/Text';
import { SolidButton, Toggle } from '../ui/Controls';
import Icon, { IconName } from '../Icon';

type Row = {
  key: string;
  label: string;
  sublabel?: string;
  icon: IconName;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  toggle?: { value: boolean; onChange: (next: boolean) => void };
};

const GroupedList = ({ rows }: { rows: Row[] }) => {
  const theme = useTheme();

  return (
    <View style={[styles.group, { backgroundColor: theme.colors.surfaceAlt }]}>
      {rows.map((row, index) => {
        const content = (
          <View style={styles.row}>
            <View style={styles.iconCol}>
              <Icon
                name={row.icon}
                size={16}
                color={
                  row.destructive
                    ? theme.colors.dangerText
                    : theme.colors.textSecondary
                }
              />
            </View>
            <View style={styles.rowText}>
              <Txt
                variant="sheetItem"
                color={
                  row.destructive ? theme.colors.dangerText : theme.colors.text
                }
              >
                {row.label}
              </Txt>
              {!!row.sublabel && (
                <Txt
                  variant="headerKey"
                  mono
                  color={theme.colors.textMuted}
                  style={styles.sublabel}
                >
                  {row.sublabel}
                </Txt>
              )}
            </View>
            {row.toggle ? (
              <Toggle
                value={row.toggle.value}
                onChange={row.toggle.onChange}
                accessibilityLabel={row.label}
              />
            ) : row.chevron ? (
              <Icon
                name="chevronRight"
                size={13}
                color={theme.colors.textMuted}
              />
            ) : null}
          </View>
        );

        return (
          <View key={row.key}>
            {index > 0 && (
              <View
                style={{
                  height: StyleSheet.hairlineWidth * 2,
                  backgroundColor: theme.colors.border,
                }}
              />
            )}
            {row.onPress ? (
              <Pressable
                onPress={row.onPress}
                accessibilityRole="button"
                accessibilityLabel={row.label}
                style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
              >
                {content}
              </Pressable>
            ) : (
              content
            )}
          </View>
        );
      })}
    </View>
  );
};

/**
 * Screen 09. `Clear logs` is destructive and always confirms first —
 * an in-memory buffer cannot be recovered once dropped.
 */
const OptionsSheet = ({
  visible,
  paused,
  requestCount,
  bufferBytes,
  redactAuthHeaders,
  bottomInset,
  onClose,
  onTogglePause,
  onExport,
  onOpenBufferSettings,
  onClear,
  onChangeRedaction,
}: {
  visible: boolean;
  paused: boolean;
  requestCount: number;
  bufferBytes: number;
  redactAuthHeaders: boolean;
  bottomInset?: number;
  onClose: () => void;
  onTogglePause: () => void;
  onExport: () => void;
  onOpenBufferSettings: () => void;
  onClear: () => void;
  onChangeRedaction: (next: boolean) => void;
}) => {
  const confirmClear = () => {
    Alert.alert(
      'Clear logs?',
      'All captured requests will be discarded. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            onClear();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Capture"
      subtitle={`${pluralise(requestCount, 'request')} · ${formatBytes(
        bufferBytes
      )} in buffer`}
      horizontalPadding={14}
      bottomInset={bottomInset}
    >
      <GroupedList
        rows={[
          {
            key: 'pause',
            label: paused ? 'Resume capture' : 'Pause capture',
            icon: 'pause',
            onPress: () => {
              onTogglePause();
              onClose();
            },
          },
          {
            key: 'export',
            label: 'Export all logs',
            sublabel: 'HAR · JSON · plain text',
            icon: 'share',
            chevron: true,
            onPress: onExport,
          },
          {
            key: 'redact',
            label: 'Redact auth headers',
            icon: 'clock',
            toggle: { value: redactAuthHeaders, onChange: onChangeRedaction },
          },
          {
            key: 'buffer',
            label: 'Buffer & redaction',
            icon: 'clock',
            chevron: true,
            onPress: onOpenBufferSettings,
          },
          {
            key: 'clear',
            label: 'Clear logs',
            icon: 'trash',
            destructive: true,
            onPress: confirmClear,
          },
        ]}
      />

      <SolidButton
        label="Cancel"
        tone="muted"
        onPress={onClose}
        style={styles.cancel}
      />
    </Sheet>
  );
};

/** Second sheet opened from `Export all logs`. */
export const ExportSheet = ({
  visible,
  bottomInset,
  onClose,
  onExport,
}: {
  visible: boolean;
  bottomInset?: number;
  onClose: () => void;
  onExport: (format: 'har' | 'json' | 'text') => void;
}) => (
  <Sheet
    visible={visible}
    onClose={onClose}
    title="Export"
    subtitle="Shared through the system share sheet"
    horizontalPadding={14}
    bottomInset={bottomInset}
  >
    <GroupedList
      rows={[
        {
          key: 'har',
          label: 'HAR archive',
          sublabel: 'Opens in Chrome DevTools, Charles, Proxyman',
          icon: 'share',
          onPress: () => {
            onExport('har');
            onClose();
          },
        },
        {
          key: 'json',
          label: 'JSON',
          sublabel: 'Full entries including timing',
          icon: 'share',
          onPress: () => {
            onExport('json');
            onClose();
          },
        },
        {
          key: 'text',
          label: 'Plain text',
          sublabel: 'One line per request',
          icon: 'share',
          onPress: () => {
            onExport('text');
            onClose();
          },
        },
      ]}
    />
    <SolidButton
      label="Cancel"
      tone="muted"
      onPress={onClose}
      style={styles.cancel}
    />
  </Sheet>
);

/** `Buffer & redaction` detail sheet. */
export const BufferSheet = ({
  visible,
  bufferLimit,
  redactAuthHeaders,
  bottomInset,
  onClose,
  onChangeLimit,
  onChangeRedaction,
}: {
  visible: boolean;
  bufferLimit: number;
  redactAuthHeaders: boolean;
  bottomInset?: number;
  onClose: () => void;
  onChangeLimit: (next: number) => void;
  onChangeRedaction: (next: boolean) => void;
}) => {
  const theme = useTheme();
  const limits = [100, 250, 500, 1000, 2000];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Buffer & redaction"
      horizontalPadding={14}
      bottomInset={bottomInset}
    >
      <SectionLabel style={styles.bufferLabel}>BUFFER LIMIT</SectionLabel>
      <GroupedList
        rows={limits.map((limit) => ({
          key: String(limit),
          label: `${limit} requests`,
          icon: (limit === bufferLimit ? 'check' : 'clock') as IconName,
          onPress: () => onChangeLimit(limit),
        }))}
      />

      <View style={styles.bufferNote}>
        <Txt variant="headerKey" mono color={theme.colors.textMuted}>
          Oldest entries are evicted first. Logs live in memory only and reset
          when the app restarts.
        </Txt>
      </View>

      <GroupedList
        rows={[
          {
            key: 'redact',
            label: 'Redact auth headers',
            sublabel: 'Applied at capture time, so exports are safe',
            icon: 'clock',
            toggle: { value: redactAuthHeaders, onChange: onChangeRedaction },
          },
        ]}
      />

      <SolidButton
        label="Done"
        tone="muted"
        onPress={onClose}
        style={styles.cancel}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  group: { borderRadius: radius.cardLg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 14,
  },
  iconCol: { width: 18, marginRight: 12, alignItems: 'center' },
  rowText: { flex: 1 },
  sublabel: { marginTop: 2 },
  cancel: { marginTop: 14 },
  bufferLabel: { marginBottom: 10 },
  bufferNote: { paddingVertical: 12, paddingHorizontal: 2 },
});

export default OptionsSheet;
