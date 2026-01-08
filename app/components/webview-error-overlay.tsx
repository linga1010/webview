import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export type ErrorKind =
  | 'no-internet'
  | 'dns'
  | 'timeout'
  | 'connection-refused'
  | 'server-down'
  | 'server-error'
  | 'unknown';

const MESSAGES: Record<ErrorKind, { icon: string; text: string }> = {
  'no-internet': { icon: '✈️', text: "No internet connection" },
  dns: { icon: '🌐', text: "Can't resolve server (DNS failure)" },
  timeout: { icon: '⏱️', text: 'Connection timed out' },
  'connection-refused': { icon: '🔌', text: 'Connection refused' },
  'server-down': { icon: '💥', text: 'Server is unavailable' },
  'server-error': { icon: '⚠️', text: 'Server error' },
  unknown: { icon: '❗', text: 'Something went wrong' },
};

export default function WebViewErrorOverlay({
  visible,
  kind,
  onRetry,
}: {
  visible: boolean;
  kind: ErrorKind;
  onRetry: () => void;
}) {
  if (!visible) return null;

  const { icon, text } = MESSAGES[kind] || MESSAGES.unknown;

  return (
    <View style={styles.container} pointerEvents="auto">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{text}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#d63031',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
