import { useCallback } from 'react';

type WebViewPayload = Record<string, string | number | boolean | null>;

type WebViewMessage = {
  type: string;
  payload?: WebViewPayload;
};

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export function useWebViewBridge() {
  const postMessage = useCallback((message: WebViewMessage) => {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
  }, []);

  return {
    isWebView: Boolean(window.ReactNativeWebView),
    postMessage,
  };
}
