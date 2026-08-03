import React, { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetworkLogger, {
  startNetworkLogging,
} from 'react-native-network-debug';

startNetworkLogging({
  // Exercise the redaction path in the example.
  redactedHeaders: ['x-example-secret'],
});

const REQUESTS: { label: string; run: () => Promise<unknown> }[] = [
  {
    label: 'GET 200 — small JSON',
    run: () =>
      fetch('https://jsonplaceholder.typicode.com/todos/1').then((r) =>
        r.json()
      ),
  },
  {
    label: 'GET 200 — 200-item array (auto-collapses)',
    run: () =>
      fetch('https://jsonplaceholder.typicode.com/comments').then((r) =>
        r.json()
      ),
  },
  {
    label: 'POST 201 — with a body',
    run: () =>
      fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer example-token-value-3f9a',
          'x-example-secret': 'should-be-masked',
        },
        body: JSON.stringify({ title: 'hello', body: 'world', userId: 1 }),
      }).then((r) => r.json()),
  },
  {
    label: 'GET 404 — error row treatment',
    run: () => fetch('https://jsonplaceholder.typicode.com/nope-404'),
  },
  {
    label: 'GET 500 — server error',
    run: () => fetch('https://httpbin.org/status/500'),
  },
  {
    label: 'GET slow — 3s delay (amber)',
    run: () => fetch('https://httpbin.org/delay/3'),
  },
  {
    label: 'GET — non-JSON (HTML)',
    run: () => fetch('https://example.com').then((r) => r.text()),
  },
  {
    label: 'GET — DNS failure',
    run: () => fetch('https://this-host-does-not-exist.invalid/x'),
  },
];

const App = () => {
  const [showLogger, setShowLogger] = useState(false);
  const [status, setStatus] = useState('Fire some requests, then open the log.');

  const fire = useCallback(async (label: string, run: () => Promise<unknown>) => {
    setStatus(`Running: ${label}`);
    try {
      await run();
      setStatus(`Done: ${label}`);
    } catch (error) {
      setStatus(`Failed (expected for some): ${label}`);
    }
  }, []);

  const fireAll = useCallback(async () => {
    setStatus('Running all…');
    await Promise.allSettled(REQUESTS.map((r) => r.run()));
    setStatus('All requests settled — open the log.');
  }, []);

  if (showLogger) {
    return (
      <SafeAreaView style={styles.loggerRoot}>
        <StatusBar barStyle="light-content" />
        <NetworkLogger
          showTimeGroups
          onClose={() => setShowLogger(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>react-native-network-debug</Text>
        <Text style={styles.status}>{status}</Text>

        <Pressable style={[styles.button, styles.primary]} onPress={fireAll}>
          <Text style={styles.primaryText}>Fire all requests</Text>
        </Pressable>

        <View style={styles.divider} />

        {REQUESTS.map(({ label, run }) => (
          <Pressable
            key={label}
            style={styles.button}
            onPress={() => fire(label, run)}
          >
            <Text style={styles.buttonText}>{label}</Text>
          </Pressable>
        ))}

        <Pressable
          style={[styles.button, styles.open]}
          onPress={() => setShowLogger(true)}
        >
          <Text style={styles.primaryText}>Open network log</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0b0c' },
  loggerRoot: { flex: 1, backgroundColor: '#0a0b0c' },
  content: { padding: 16, gap: 8 },
  title: { color: '#eceef0', fontSize: 18, fontWeight: '600' },
  status: { color: '#8b9298', fontSize: 12, marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#1e2226', marginVertical: 8 },
  button: {
    backgroundColor: '#141618',
    borderWidth: 1,
    borderColor: '#1e2226',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  buttonText: { color: '#c8ced3', fontSize: 13 },
  primary: { backgroundColor: '#5aa7ff', borderColor: '#5aa7ff' },
  open: { backgroundColor: '#eceef0', borderColor: '#eceef0', marginTop: 16 },
  primaryText: { color: '#0a0b0c', fontSize: 14, fontWeight: '600' },
});

export default App;
