'use client';

import { useCallback, useEffect, useState } from 'react';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export type GeolocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'error';

interface Options {
  autoStart?: boolean;
  watch?: boolean;
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}

export function useGeolocation(options: Options = {}): {
  coords: GeolocationCoords | null;
  status: GeolocationStatus;
  error: string | null;
  loading: boolean;
  refresh: () => void;
} {
  const {
    autoStart = true,
    watch = false,
    timeout = 15_000,
    maximumAge = 5_000,
    enableHighAccuracy = true,
  } = options;

  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setStatus('unsupported');
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setError('Geolocalização não suportada neste dispositivo.');
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;

    const onSuccess: PositionCallback = (pos) => {
      if (cancelled) return;
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy,
      });
      setStatus('granted');
      setError(null);
    };

    const onError: PositionErrorCallback = (err) => {
      if (cancelled) return;
      if (err.code === err.PERMISSION_DENIED) {
        setStatus('denied');
        setError('Permissão de localização negada.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setStatus('error');
        setError('Localização indisponível.');
      } else if (err.code === err.TIMEOUT) {
        setStatus('error');
        setError('Tempo esgotado ao obter localização.');
      } else {
        setStatus('error');
        setError(err.message || 'Erro ao obter localização.');
      }
    };

    setStatus((prev) => (prev === 'granted' ? prev : 'loading'));

    if (watch) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });
    }

    return () => {
      cancelled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, timeout, maximumAge, enableHighAccuracy, tick]);

  useEffect(() => {
    if (autoStart) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status, error, loading: status === 'loading' || status === 'idle', refresh };
}
