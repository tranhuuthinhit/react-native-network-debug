import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

/**
 * Every glyph is composed from `View` borders and rotations — no SVG
 * library, no PNG assets, no font icons. That keeps the package at zero
 * dependencies and means nothing has to be resolved by the host app's
 * bundler or asset pipeline.
 *
 * If the app already ships Phosphor (the icon set the bound design
 * system specifies), pass replacements via the `icons` prop on
 * `<NetworkLogger />`.
 */
export type IconName =
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'chevronDown'
  | 'search'
  | 'filter'
  | 'kebab'
  | 'copy'
  | 'share'
  | 'close'
  | 'trash'
  | 'clock'
  | 'check'
  | 'pause';

export type IconProps = {
  name: IconName;
  /** Bounding box, in points. Defaults to 16. */
  size?: number;
  color?: string;
  /** Stroke weight. Defaults to a size-proportional value. */
  weight?: number;
  style?: StyleProp<ViewStyle>;
};

const chevronRotation: Record<string, string> = {
  chevronLeft: '45deg',
  chevronRight: '-135deg',
  chevronUp: '135deg',
  chevronDown: '-45deg',
};

const Icon = ({ name, size = 16, color, weight, style }: IconProps) => {
  const theme = useTheme();
  const stroke = color ?? theme.colors.textSecondary;
  const w = weight ?? Math.max(1.25, size * 0.095);

  const box: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const render = () => {
    switch (name) {
      case 'chevronLeft':
      case 'chevronRight':
      case 'chevronUp':
      case 'chevronDown': {
        const arm = size * 0.42;
        return (
          <View
            style={{
              width: arm,
              height: arm,
              borderLeftWidth: w,
              borderBottomWidth: w,
              borderColor: stroke,
              transform: [{ rotate: chevronRotation[name] }],
            }}
          />
        );
      }

      case 'check': {
        // Short arm + long arm, i.e. a tick rather than a chevron.
        return (
          <View
            style={{
              width: size * 0.3,
              height: size * 0.56,
              borderLeftWidth: w,
              borderBottomWidth: w,
              borderColor: stroke,
              transform: [{ rotate: '-45deg' }],
              marginTop: -size * 0.08,
            }}
          />
        );
      }

      case 'close': {
        const bar: ViewStyle = {
          position: 'absolute',
          width: size * 0.78,
          height: w,
          borderRadius: w,
          backgroundColor: stroke,
        };
        return (
          <>
            <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
          </>
        );
      }

      case 'search': {
        const lens = size * 0.62;
        return (
          <>
            <View
              style={{
                width: lens,
                height: lens,
                borderRadius: lens / 2,
                borderWidth: w,
                borderColor: stroke,
                marginTop: -size * 0.08,
                marginLeft: -size * 0.08,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: w,
                height: size * 0.3,
                borderRadius: w,
                backgroundColor: stroke,
                right: size * 0.14,
                bottom: size * 0.08,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </>
        );
      }

      case 'filter': {
        // Three rules of decreasing width — the "sliders" affordance.
        const widths = [0.86, 0.6, 0.34];
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {widths.map((ratio, i) => (
              <View
                key={ratio}
                style={{
                  width: size * ratio,
                  height: w,
                  borderRadius: w,
                  backgroundColor: stroke,
                  marginTop: i === 0 ? 0 : size * 0.16,
                }}
              />
            ))}
          </View>
        );
      }

      case 'kebab': {
        const dot = Math.max(2, size * 0.14);
        return (
          <View style={{ alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  backgroundColor: stroke,
                  marginTop: i === 0 ? 0 : size * 0.14,
                }}
              />
            ))}
          </View>
        );
      }

      case 'copy': {
        const sheet = size * 0.64;
        return (
          <>
            <View
              style={{
                position: 'absolute',
                width: sheet,
                height: sheet,
                borderWidth: w,
                borderColor: stroke,
                borderRadius: Math.max(2, size * 0.14),
                top: 0,
                right: 0,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: sheet,
                height: sheet,
                borderWidth: w,
                borderColor: stroke,
                borderRadius: Math.max(2, size * 0.14),
                bottom: 0,
                left: 0,
                // Punch out the overlap so the back sheet reads as behind.
                backgroundColor: 'transparent',
              }}
            />
          </>
        );
      }

      case 'share': {
        // Up arrow rising out of a tray.
        const arm = size * 0.34;
        return (
          <>
            <View
              style={{
                position: 'absolute',
                width: w,
                height: size * 0.52,
                borderRadius: w,
                backgroundColor: stroke,
                top: size * 0.06,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: arm,
                height: arm,
                borderLeftWidth: w,
                borderTopWidth: w,
                borderColor: stroke,
                transform: [{ rotate: '45deg' }],
                top: size * 0.1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.74,
                height: size * 0.3,
                borderLeftWidth: w,
                borderRightWidth: w,
                borderBottomWidth: w,
                borderColor: stroke,
                borderBottomLeftRadius: Math.max(2, size * 0.1),
                borderBottomRightRadius: Math.max(2, size * 0.1),
                bottom: size * 0.04,
              }}
            />
          </>
        );
      }

      case 'trash': {
        return (
          <>
            <View
              style={{
                position: 'absolute',
                width: size * 0.78,
                height: w,
                borderRadius: w,
                backgroundColor: stroke,
                top: size * 0.22,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.3,
                height: w,
                borderRadius: w,
                backgroundColor: stroke,
                top: size * 0.1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.58,
                height: size * 0.52,
                borderLeftWidth: w,
                borderRightWidth: w,
                borderBottomWidth: w,
                borderColor: stroke,
                borderBottomLeftRadius: Math.max(2, size * 0.12),
                borderBottomRightRadius: Math.max(2, size * 0.12),
                bottom: size * 0.08,
              }}
            />
          </>
        );
      }

      case 'clock': {
        const face = size * 0.82;
        return (
          <>
            <View
              style={{
                width: face,
                height: face,
                borderRadius: face / 2,
                borderWidth: w,
                borderColor: stroke,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: w,
                height: size * 0.24,
                backgroundColor: stroke,
                borderRadius: w,
                top: size * 0.24,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: size * 0.2,
                height: w,
                backgroundColor: stroke,
                borderRadius: w,
                left: size / 2,
                top: size / 2 - w / 2,
                transformOrigin: 'left center',
              }}
            />
          </>
        );
      }

      case 'pause': {
        // Two 3×12 rounded bars, per the paused banner spec.
        const barW = Math.max(2, size * 0.19);
        return (
          <View style={{ flexDirection: 'row' }}>
            <View
              style={{
                width: barW,
                height: size * 0.75,
                borderRadius: barW,
                backgroundColor: stroke,
                marginRight: size * 0.19,
              }}
            />
            <View
              style={{
                width: barW,
                height: size * 0.75,
                borderRadius: barW,
                backgroundColor: stroke,
              }}
            />
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <View style={[box, style]} pointerEvents="none">
      {render()}
    </View>
  );
};

/** A 6px status dot (recording) or square (paused). */
export const StatusIndicator = ({
  color,
  square,
  size = 6,
}: {
  color: string;
  square?: boolean;
  size?: number;
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: square ? 1 : size / 2,
      backgroundColor: color,
    }}
  />
);

export const iconStyles = StyleSheet.create({
  inline: { alignSelf: 'center' },
});

export default Icon;
