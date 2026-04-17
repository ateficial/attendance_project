import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../lib/apiClient';

function toWebSocketUrl() {
  const base = getApiBaseUrl();
  if (base.startsWith('https://')) return `${base.replace('https://', 'wss://')}/api/realtime`;
  return `${base.replace('http://', 'ws://')}/api/realtime`;
}

export function useRealtimePulse(onPulse, options = {}) {
  const { enabled = true, interval, intervalMs } = options;
  const effectiveInterval = Number(intervalMs ?? interval ?? 30000);
  const callbackRef = useRef(onPulse);
  const [isLive, setIsLive] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const [lastPulse, setLastPulse] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('offline');

  callbackRef.current = onPulse;

  useEffect(() => {
    if (!enabled || typeof callbackRef.current !== 'function') {
      setIsLive(false);
      setIsPolling(false);
      setPulseCount(0);
      setLastPulse(null);
      setConnectionStatus('offline');
      return undefined;
    }

    let ws;
    let reconnectTimer = null;
    let pollingTimer = null;
    let active = true;
    let pollingFailureCount = 0;

    const triggerPulse = async () => {
      if (!active || typeof callbackRef.current !== 'function') return;

      try {
        await Promise.resolve(callbackRef.current());
        if (!active) return;
        pollingFailureCount = 0;
        setPulseCount((prev) => prev + 1);
        setLastPulse(new Date().toISOString());
      } catch (error) {
        pollingFailureCount += 1;
        if (pollingFailureCount >= 3) {
          setIsLive(false);
          setIsPolling(false);
          setConnectionStatus('offline');
        }
      }
    };

    const clearPolling = () => {
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const enablePollingFallback = () => {
      if (!active) return;
      setIsLive(false);
      setIsPolling(true);
      setConnectionStatus('polling');
      if (pollingTimer) return;
      pollingTimer = window.setInterval(() => {
        void triggerPulse();
      }, effectiveInterval);
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 5000);
    };

    const connect = () => {
      if (!active) return;

      try {
        ws = new WebSocket(toWebSocketUrl());
      } catch (error) {
        enablePollingFallback();
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        setIsLive(true);
        setIsPolling(false);
        setConnectionStatus('live');
        pollingFailureCount = 0;
        clearPolling();
      };

      ws.onmessage = () => {
        void triggerPulse();
      };

      ws.onerror = () => {
        enablePollingFallback();
      };

      ws.onclose = () => {
        enablePollingFallback();
        scheduleReconnect();
      };
    };

    void triggerPulse();
    connect();

    return () => {
      active = false;
      setIsLive(false);
      setIsPolling(false);
      setConnectionStatus('offline');
      clearPolling();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [enabled, effectiveInterval]);

  return { isLive, isPolling, lastPulse, pulseCount, connectionStatus };
}
