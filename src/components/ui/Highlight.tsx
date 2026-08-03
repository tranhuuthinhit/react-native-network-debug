import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { splitOnMatches } from '../../utils/search';

/**
 * Wraps search hits in a solid accent chip with dark text, per screen 02.
 *
 * Returns plain children when there is no query, so the common case
 * costs nothing — the list re-renders at the logger refresh rate and
 * segmenting every URL on every tick would be wasteful.
 */
const Highlight = ({
  text,
  query,
  style,
  /** The active match in the response-body search is emphasised harder. */
  activeIndex,
}: {
  text: string;
  query?: string;
  style?: TextStyle | TextStyle[];
  activeIndex?: number;
}) => {
  const theme = useTheme();

  if (!query) return <>{text}</>;

  const segments = splitOnMatches(text, query);
  if (segments.length === 1 && !segments[0].match) return <>{text}</>;

  let matchIndex = -1;

  return (
    <>
      {segments.map((segment, i) => {
        if (!segment.match) {
          return (
            <Text key={i} style={style}>
              {segment.text}
            </Text>
          );
        }

        matchIndex += 1;
        const isActive =
          activeIndex !== undefined && matchIndex === activeIndex;

        return (
          <Text
            key={i}
            style={[
              style,
              {
                backgroundColor: theme.colors.accent,
                color: theme.colors.onAccent,
              },
              isActive && {
                backgroundColor: theme.colors.text,
                color: theme.colors.bg,
              },
            ]}
          >
            {segment.text}
          </Text>
        );
      })}
    </>
  );
};

export default Highlight;
