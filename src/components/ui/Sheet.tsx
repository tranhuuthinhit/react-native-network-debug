import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { radius, space, useTheme } from '../../theme';
import { SHEET_ANIMATION_MS } from '../../constant';
import Txt from './Text';
import { LinkButton } from './Controls';

/**
 * Bottom sheet shell for the Filters, Options and Export sheets.
 *
 * Motion follows the handoff: a 240ms ease-out slide-up with the
 * backdrop fading 0 → 0.58 over the same interval. Dismissible by
 * backdrop tap, downward swipe, or the Android system back gesture.
 */
const Sheet = ({
  visible,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
  bottomInset = 0,
  horizontalPadding = 18,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  headerRight?: { label: string; onPress: () => void };
  children: React.ReactNode;
  bottomInset?: number;
  horizontalPadding?: number;
}) => {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const height = Dimensions.get('window').height;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: SHEET_ANIMATION_MS,
      useNativeDriver: true,
    }).start();
    if (visible) dragY.setValue(0);
  }, [visible, progress, dragY]);

  // Android hardware back closes the sheet before it reaches the screen
  // underneath, so the gesture matches the swipe-down and backdrop tap.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // Declared before the responder so its closure never reads an
  // uninitialised binding, and refreshed each render so a swipe always
  // calls the current `onClose`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) dragY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.6) {
          onCloseRef.current();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const translateY = Animated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [height * 0.5, 0],
    }),
    dragY
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.backdrop, opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.handle,
              paddingHorizontal: horizontalPadding,
              paddingBottom: 26 + bottomInset,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[styles.grabber, { backgroundColor: theme.colors.handle }]}
          />

          {(title || headerRight) && (
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                {!!title && (
                  <Txt variant="sheetTitle" accessibilityRole="header">
                    {title}
                  </Txt>
                )}
                {!!subtitle && (
                  <Txt
                    variant="headerValue"
                    mono
                    color={theme.colors.textMuted}
                    weight="400"
                    style={{ marginTop: 3, fontSize: 12 }}
                  >
                    {subtitle}
                  </Txt>
                )}
              </View>
              {!!headerRight && (
                <LinkButton
                  label={headerRight.label}
                  onPress={headerRight.onPress}
                  color={theme.colors.textMuted}
                />
              )}
            </View>
          )}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: 10,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.sectionGap,
  },
});

export default Sheet;
