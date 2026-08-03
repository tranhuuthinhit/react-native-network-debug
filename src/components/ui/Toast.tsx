import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, StyleSheet, Vibration, View } from 'react-native';
import { radius, useTheme } from '../../theme';
import { TOAST_DURATION_MS } from '../../constant';
import Txt from './Text';
import Icon from '../Icon';

type ToastContextValue = {
  /** Shows the confirmation pill and fires a light haptic. */
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

/**
 * Centred pill 120px above the bottom edge, 140ms fade + 8px rise in,
 * auto-dismissing after 1.8s. Every copy action fires one — the design's
 * answer to "did that actually copy?".
 */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(8)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);

      // A short buzz on Android; iOS has no haptic API in core RN, and
      // pulling in a haptics package would break zero-dependency.
      if (Platform.OS === 'android') {
        try {
          Vibration.vibrate(10);
        } catch {
          // Vibration permission not granted — the toast is enough.
        }
      }

      opacity.setValue(0);
      rise.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, TOAST_DURATION_MS);
    },
    [opacity, rise]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {!!message && (
        <View style={styles.host} pointerEvents="none">
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: theme.colors.text,
                opacity,
                transform: [{ translateY: rise }],
              },
            ]}
            accessibilityLiveRegion="polite"
          >
            <Icon name="check" size={14} color={theme.colors.bg} weight={2} />
            <Txt
              variant="actionButton"
              color={theme.colors.bg}
              style={{ marginLeft: 8 }}
            >
              {message}
            </Txt>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 120,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.input,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
});

export default ToastProvider;
