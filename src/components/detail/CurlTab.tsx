import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { radius, space, useTheme } from '../../theme';
import { CODE_FORMAT_LABELS, CodeFormat } from '../../utils/codegen';
import Txt from '../ui/Text';
import { Chip } from '../ui/Controls';
import { useAppContext } from '../AppContext';

type Segment = { text: string; color: string };

/**
 * Lightweight tokeniser for the generated command. Colours the command
 * name green, quoted strings blue, the method amber and everything else
 * in the primary ramp — enough to make a long cURL scannable without
 * pulling in a syntax-highlighting dependency.
 */
const useHighlightedCode = (code: string, format: CodeFormat) => {
  const theme = useTheme();

  return useMemo<Segment[]>(() => {
    const segments: Segment[] = [];
    const commandName =
      format === 'fetch' ? 'fetch' : format === 'httpie' ? 'http' : 'curl';

    // Split on single-quoted strings, double-quoted strings, and the
    // leading command word, keeping the delimiters.
    const pattern = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const pushPlain = (text: string) => {
      if (!text) return;

      // Pull out the command word and HTTP method for their own colours.
      const parts = text.split(
        /\b(curl|http|fetch|await|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/
      );
      parts.forEach((part) => {
        if (!part) return;
        if (part === commandName || part === 'await') {
          segments.push({ text: part, color: theme.colors.jsonString });
        } else if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(part)) {
          segments.push({ text: part, color: theme.colors.jsonNumber });
        } else {
          segments.push({ text: part, color: theme.colors.text });
        }
      });
    };

    while ((match = pattern.exec(code)) !== null) {
      pushPlain(code.slice(lastIndex, match.index));
      segments.push({ text: match[0], color: theme.colors.jsonKey });
      lastIndex = match.index + match[0].length;
    }
    pushPlain(code.slice(lastIndex));

    return segments;
  }, [code, format, theme.colors]);
};

const CurlTab = ({
  request,
  contentPaddingBottom,
  onFormatChange,
}: {
  request: NetworkRequestInfo;
  contentPaddingBottom: number;
  /** Lets the action bar copy exactly what is on screen. */
  onFormatChange: (code: string) => void;
}) => {
  const theme = useTheme();
  const { redactCode, dispatch } = useAppContext();
  const [format, setFormat] = useState<CodeFormat>('curl');

  const code = useMemo(
    () => request.getCode(format, { redact: redactCode }),
    [request, format, redactCode]
  );

  // Keep the parent's copy target in sync with the visible command.
  React.useEffect(() => onFormatChange(code), [code, onFormatChange]);

  const segments = useHighlightedCode(code, format);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
    >
      <View style={styles.chips}>
        {(Object.keys(CODE_FORMAT_LABELS) as CodeFormat[]).map((key) => (
          <Chip
            key={key}
            label={CODE_FORMAT_LABELS[key]}
            active={format === key}
            onPress={() => setFormat(key)}
          />
        ))}
        <View style={styles.spacer} />
        <Chip
          label="Redact"
          active={redactCode}
          onPress={() => dispatch({ type: 'TOGGLE_REDACT_CODE' })}
          accessibilityLabel="Replace secrets with placeholders"
        />
      </View>

      <View style={styles.section}>
        <View
          style={[
            styles.block,
            {
              backgroundColor: theme.colors.surfaceCode,
              borderColor: theme.colors.borderSoft,
            },
          ]}
        >
          <Txt variant="codeLoose" mono selectable style={styles.code}>
            {segments.map((segment, index) => (
              <Txt key={index} variant="codeLoose" mono color={segment.color}>
                {segment.text}
              </Txt>
            ))}
          </Txt>
        </View>

        {redactCode && (
          <Txt
            variant="headerKey"
            mono
            color={theme.colors.textFaintest}
            style={styles.note}
          >
            Secrets are shown as shell variables. Set them in your environment
            before running the command.
          </Txt>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingBottom: 12,
    gap: 7,
  },
  spacer: { flex: 1 },
  section: { paddingHorizontal: space.gutter, paddingBottom: space.sectionGap },
  block: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 14,
    paddingHorizontal: 13,
  },
  code: { lineHeight: 24 },
  note: { marginTop: 8, lineHeight: 16 },
});

export default CurlTab;
