import React, { useRef, useEffect, useState } from 'react';
import { BackHandler, Alert, ActivityIndicator, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import WebViewErrorOverlay, { ErrorKind } from '../components/webview-error-overlay';

const START_URL = 'https://app.thennilavu.lk/';

export default function HomeScreen() {
  const webRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      Alert.alert('', 'Do you want to exit the app?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => BackHandler.exitApp && BackHandler.exitApp() },
      ]);
      return true;
    };

    // Register back handler safely — different RN versions/platforms expose
    // different APIs (addEventListener returns a subscription with `remove()`
    // in newer versions). Also on web BackHandler may be missing.
    let subscription: any = null;
    if (BackHandler && typeof BackHandler.addEventListener === 'function') {
      subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress as any);
    } else if (BackHandler && typeof (BackHandler as any).addListener === 'function') {
      subscription = (BackHandler as any).addListener('hardwareBackPress', onBackPress);
    }

    return () => {
      try {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
          return;
        }
        // defensive fallback: some environments (web/older RN) don't expose
        // removeEventListener; guard the call and swallow errors.
        const removeFn = (BackHandler as any)?.removeEventListener;
        if (typeof removeFn === 'function') {
          removeFn.call(BackHandler, 'hardwareBackPress', onBackPress as any);
        }
      } catch (_err) {
        // ignore cleanup errors
      }
    };
  }, [canGoBack]);

  // NetInfo listener to auto-retry when connectivity changes
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && errorKind) {
        // network returned: clear error and reload
        setErrorKind(null);
        try {
          webRef.current?.reload();
        } catch (_e) {}
      }
    });

    return () => unsub();
  }, [errorKind]);

  const onNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleWebError = (event: any) => {
    const native = event?.nativeEvent || {};
    const code = native.code;
    // Stop loading to avoid default error pages
    try {
      webRef.current?.stopLoading();
    } catch (_e) {}

    // Check network first
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        setErrorKind('no-internet');
        return;
      }

      // Map common WebView error codes to friendly types
      switch (code) {
        case -2: // ERROR_HOST_LOOKUP
          setErrorKind('dns');
          break;
        case -6: // ERROR_CONNECT
        case -7: // ERROR_IO
          setErrorKind('connection-refused');
          break;
        case -8: // ERROR_TIMEOUT
          setErrorKind('timeout');
          break;
        default:
          setErrorKind('unknown');
      }
    });
  };

  const onShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    if (!url) return true;
    // Open external links outside the domain in external browser
    if (url.startsWith('http') && !url.startsWith(START_URL)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // handle mailto:, tel: etc.
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    return true;
  };

  const handleHttpError = (event: any) => {
    const native = event?.nativeEvent || {};
    const status = native.statusCode;
    try {
      webRef.current?.stopLoading();
    } catch (_e) {}
    if (status >= 500) setErrorKind('server-down');
    else setErrorKind('server-error');
  };

  const handleRetry = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      setErrorKind('no-internet');
      return;
    }
    setErrorKind(null);
    try {
      webRef.current?.reload();
    } catch (_e) {}
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {loading && (
        <View style={[styles.loading, { pointerEvents: 'none' }]}>
          <ActivityIndicator size="large" color="#d63031" />
        </View>
      )}
      <WebView
        ref={webRef}
        source={{ uri: START_URL }}
        originWhitelist={["*"]}
        onLoadEnd={() => setLoading(false)}
        onLoadStart={() => setLoading(true)}
        onError={handleWebError}
        onHttpError={handleHttpError}
        onNavigationStateChange={onNavigationStateChange}
        startInLoadingState
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode={Platform.OS === 'android' ? 'always' : 'never'}
      />
      <WebViewErrorOverlay visible={!!errorKind} kind={errorKind ?? 'unknown'} onRetry={handleRetry} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
});
