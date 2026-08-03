import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import NetworkRequestInfo from '../../NetworkRequestInfo';
import { DetailTab } from '../../types';
import { MAX_CONTENT_WIDTH, hit, radius, space, useTheme } from '../../theme';
import { copyToClipboard } from '../../utils/clipboard';
import Txt from '../ui/Text';
import { ActionBar } from '../ui/Layout';
import { Tabs } from '../ui/Controls';
import Icon from '../Icon';
import { useToast } from '../ui/Toast';
import { useAppContext } from '../AppContext';
import DetailHeader, { StatCards } from './DetailHeader';
import OverviewTab from './OverviewTab';
import RequestTab from './RequestTab';
import ResponseTab from './ResponseTab';
import CurlTab from './CurlTab';

const TABS: { key: DetailTab; label: string; mono?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'request', label: 'Request' },
  { key: 'response', label: 'Response' },
  { key: 'curl', label: 'cURL', mono: true },
];

/** Flex-1 action-bar button on `surfaceAlt`. */
const BarButton = ({
  label,
  onPress,
  tone = 'muted',
}: {
  label: string;
  onPress: () => void;
  tone?: 'muted' | 'light';
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // No explicit label: the visible text is the label, which avoids
      // colliding with the header's icon-only "Copy URL" button.
      style={({ pressed }) => [
        styles.barButton,
        {
          backgroundColor:
            tone === 'light' ? theme.colors.text : theme.colors.surfaceAlt,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Txt
        variant="actionButton"
        color={tone === 'light' ? theme.colors.onAccent : theme.colors.text}
      >
        {label}
      </Txt>
    </Pressable>
  );
};

const DetailScreen = ({
  request,
  onClose,
  bottomInset = 0,
}: {
  request: NetworkRequestInfo;
  onClose: () => void;
  bottomInset?: number;
}) => {
  const theme = useTheme();
  const toast = useToast();
  const { activeTab, redactCode, dispatch } = useAppContext();

  const [responseBody, setResponseBody] = useState('');
  const [loadingBody, setLoadingBody] = useState(true);
  const [visibleCode, setVisibleCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingBody(true);
    (async () => {
      const body = await request.getResponseBody();
      if (!cancelled) {
        setResponseBody(body);
        setLoadingBody(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request, request.updatedAt]);

  const copy = useCallback(
    async (value: string, message: string) => {
      const copied = await copyToClipboard(value);
      if (copied) toast.show(message);
    },
    [toast]
  );

  const share = useCallback(() => {
    const payload = [
      `${request.method} ${request.url}`,
      '',
      '--- Request headers ---',
      Object.entries(request.requestHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      '',
      '--- Response ---',
      `${request.status} ${request.statusText}`,
      Object.entries(request.responseHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      '',
      responseBody,
    ].join('\n');

    void Share.share({ message: payload });
  }, [request, responseBody]);

  const contentPaddingBottom = 24;

  const actionBar = useMemo(() => {
    switch (activeTab) {
      case 'curl':
        // The cURL tab's bar differs: one full-width primary action.
        return (
          <ActionBar bottomInset={bottomInset}>
            <BarButton
              label="Copy command"
              tone="light"
              onPress={() =>
                copy(
                  visibleCode ||
                    request.getCode('curl', { redact: redactCode }),
                  'cURL copied to clipboard'
                )
              }
            />
            <ShareButton onPress={share} tone="muted" />
          </ActionBar>
        );

      case 'response':
        return (
          <ActionBar bottomInset={bottomInset}>
            <BarButton
              label="Copy JSON"
              onPress={() => copy(responseBody, 'Response copied to clipboard')}
            />
            <BarButton
              label="Save file"
              onPress={() => {
                // No filesystem access without a native dependency, so
                // hand the payload to the platform share sheet, which
                // offers "Save to Files" / "Save to Drive".
                void Share.share({
                  message: responseBody,
                  title: `${request.method} ${request.host}`,
                });
              }}
            />
            <ShareButton onPress={share} />
          </ActionBar>
        );

      default:
        return (
          <ActionBar bottomInset={bottomInset}>
            <BarButton
              label="Copy URL"
              onPress={() => copy(request.url, 'URL copied to clipboard')}
            />
            <BarButton
              label="Copy cURL"
              onPress={() =>
                copy(request.getCode('curl'), 'cURL copied to clipboard')
              }
            />
            <ShareButton onPress={share} />
          </ActionBar>
        );
    }
  }, [
    activeTab,
    bottomInset,
    copy,
    request,
    responseBody,
    share,
    visibleCode,
    redactCode,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.content}>
        <DetailHeader
          request={request}
          onBack={onClose}
          onCopy={() => copy(request.url, 'URL copied to clipboard')}
          onClose={onClose}
        />

        {activeTab === 'overview' && <StatCards request={request} />}

        <View style={styles.tabs}>
          <Tabs
            tabs={TABS}
            value={activeTab}
            onChange={(key) => dispatch({ type: 'SET_TAB', payload: key })}
          />
        </View>

        {activeTab === 'overview' && (
          <OverviewTab
            request={request}
            onCopy={copy}
            contentPaddingBottom={contentPaddingBottom}
          />
        )}
        {activeTab === 'request' && (
          <RequestTab
            request={request}
            onCopy={copy}
            contentPaddingBottom={contentPaddingBottom}
          />
        )}
        {activeTab === 'response' && (
          <ResponseTab
            request={request}
            body={responseBody}
            loading={loadingBody}
            onCopy={copy}
            contentPaddingBottom={contentPaddingBottom}
          />
        )}
        {activeTab === 'curl' && (
          <CurlTab
            request={request}
            contentPaddingBottom={contentPaddingBottom}
            onFormatChange={setVisibleCode}
          />
        )}

        {actionBar}
      </View>
    </View>
  );
};

/** 52×44 accent tile with a dark share glyph. */
const ShareButton = ({
  onPress,
  tone = 'accent',
}: {
  onPress: () => void;
  tone?: 'accent' | 'muted';
}) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Share request"
      style={({ pressed }) => [
        styles.share,
        {
          backgroundColor:
            tone === 'accent' ? theme.colors.accent : theme.colors.surfaceAlt,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Icon
        name="share"
        size={17}
        color={tone === 'accent' ? theme.colors.onAccent : theme.colors.text}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  tabs: { paddingHorizontal: space.gutter, paddingBottom: 12 },
  barButton: {
    flex: 1,
    height: hit.tap,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    width: 52,
    height: hit.tap,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DetailScreen;
