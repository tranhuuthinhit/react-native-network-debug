import React, { createContext, useContext, useMemo } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { type as typeScale, useTheme } from '../../theme';
import { defaultFonts, FontFamilies } from '../../fonts';

const FontContext = createContext<Required<FontFamilies>>(defaultFonts);

export const FontProvider = ({
  fontFamily,
  children,
}: {
  fontFamily?: FontFamilies;
  children: React.ReactNode;
}) => {
  const value = useMemo(
    () => ({
      sans: fontFamily?.sans ?? defaultFonts.sans,
      mono: fontFamily?.mono ?? defaultFonts.mono,
    }),
    [fontFamily?.sans, fontFamily?.mono]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

export const useFonts = () => useContext(FontContext);

export type TypeVariant = keyof typeof typeScale;

export type TxtProps = TextProps & {
  variant?: TypeVariant;
  /** Use the mono face — every URL, header, JSON, timing and status code. */
  mono?: boolean;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
};

/**
 * The single text primitive. Resolving the family here — rather than in
 * each `StyleSheet` — is what lets the host app swap in IBM Plex (or any
 * other pair) with one prop, and guarantees no screen accidentally
 * renders a URL in the sans face.
 */
const Txt = ({
  variant = 'headerValue',
  mono,
  color,
  weight,
  align,
  style,
  ...rest
}: TxtProps) => {
  const theme = useTheme();
  const fonts = useFonts();
  const token = typeScale[variant] as TextStyle;

  const resolved = useMemo<TextStyle>(
    () => ({
      ...token,
      fontFamily: mono ? fonts.mono : fonts.sans,
      color: color ?? theme.colors.text,
      ...(weight ? { fontWeight: weight } : null),
      ...(align ? { textAlign: align } : null),
    }),
    [
      token,
      mono,
      fonts.mono,
      fonts.sans,
      color,
      theme.colors.text,
      weight,
      align,
    ]
  );

  return <Text {...rest} style={[resolved, style]} />;
};

/**
 * All-caps 11/500 mono section label with 0.12em tracking — used above
 * every card in the detail tabs and between list time groups.
 */
export const SectionLabel = ({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) => {
  const theme = useTheme();
  return (
    <Txt
      variant="sectionLabel"
      mono
      color={color ?? theme.colors.textMuted}
      style={style}
    >
      {children}
    </Txt>
  );
};

export default Txt;
