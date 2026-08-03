import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space, useTheme } from '../theme';
import Txt from './ui/Text';

const Unmounted = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Txt variant="sheetTitle" accessibilityRole="header">
        Interceptor not enabled
      </Txt>
      <Txt
        variant="emptyBody"
        color={theme.colors.textMuted}
        style={styles.body}
      >
        The network logger has not been enabled. This is usually because another
        debugging tool is already intercepting requests.
      </Txt>
      <Txt
        variant="emptyBody"
        color={theme.colors.textMuted}
        style={styles.body}
      >
        Either disable that tool, or start the logger with{' '}
        <Txt variant="emptyBody" mono color={theme.colors.accent}>
          forceEnable: true
        </Txt>
        .
      </Txt>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: space.gutter + 6,
    justifyContent: 'center',
  },
  body: { marginTop: 10 },
});

export default Unmounted;
