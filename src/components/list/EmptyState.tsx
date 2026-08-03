import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import Txt from '../ui/Text';
import { Toggle } from '../ui/Controls';

/** Dashed placeholder with three skeleton bars — the empty illustration. */
const Placeholder = () => {
  const theme = useTheme();
  return (
    <View style={[styles.placeholder, { borderColor: theme.colors.handle }]}>
      {[1, 0.7, 0.85].map((ratio, i) => (
        <View
          key={ratio}
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.track,
            width: `${ratio * 100}%`,
            marginTop: i === 0 ? 0 : 10,
          }}
        />
      ))}
    </View>
  );
};

const EmptyState = ({
  paused,
  title,
  body,
}: {
  paused: boolean;
  title?: string;
  body?: string;
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Placeholder />
      <Txt
        variant="emptyTitle"
        color={theme.colors.textSecondary}
        align="center"
      >
        {title ?? 'No requests captured'}
      </Txt>
      <Txt variant="emptyBody" color={theme.colors.textMuted} align="center">
        {body ??
          (paused
            ? 'Resume capture, then trigger a screen in the app. Logs are kept in memory only and reset when the app restarts.'
            : 'Trigger a screen in the app to capture traffic. Logs are kept in memory only and reset when the app restarts.')}
      </Txt>
    </View>
  );
};

/** The two settings rows pinned above the home indicator on screen 03. */
export const SettingsPreview = ({
  bufferLimit,
  redactAuthHeaders,
  onChangeRedaction,
  onPressBuffer,
}: {
  bufferLimit: number;
  redactAuthHeaders: boolean;
  onChangeRedaction: (next: boolean) => void;
  onPressBuffer: () => void;
}) => {
  const theme = useTheme();

  return (
    <View style={styles.settings}>
      <View style={styles.settingRow}>
        <Txt variant="tab" color={theme.colors.textSecondary}>
          Buffer limit
        </Txt>
        <Txt
          variant="rowMeta"
          mono
          color={theme.colors.textMuted}
          onPress={onPressBuffer}
          accessibilityRole="button"
          accessibilityLabel={`Buffer limit, ${bufferLimit} requests`}
        >
          {bufferLimit} requests
        </Txt>
      </View>
      <View style={styles.settingRow}>
        <Txt variant="tab" color={theme.colors.textSecondary}>
          Redact auth headers
        </Txt>
        <Toggle
          value={redactAuthHeaders}
          onChange={onChangeRedaction}
          accessibilityLabel="Redact auth headers"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
    gap: 20,
  },
  placeholder: {
    width: 120,
    height: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  settings: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default EmptyState;
