'use client';

import { MapPin, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatDistance } from './format';
import type { TimeClockConfig } from '../../types';
import type {
  GeolocationCoords,
  GeolocationStatus,
} from '../../hooks/useGeolocation';

interface Props {
  config?: TimeClockConfig | null;
  /** Estado vindo do pai (uma única instância de useGeolocation por página). */
  coords: GeolocationCoords | null;
  status: GeolocationStatus;
  error: string | null;
  loading: boolean;
  /** Reexecuta getCurrentPosition — reativa o prompt do navegador. */
  onRefresh: () => void;
}

export function LocationPrompt({ config, coords, status, error, loading, onRefresh }: Props) {
  const distanceM =
    coords && config
      ? haversineDistance(
          coords.latitude,
          coords.longitude,
          Number(config.latitude),
          Number(config.longitude),
        )
      : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Localização</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading && !coords && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {status === 'denied' && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="font-medium">Permissão de localização negada</p>
              <p className="opacity-90 text-xs">
                Esta loja exige geolocalização para registrar o ponto. Para liberar:
              </p>
              {typeof window !== 'undefined' && window.electronAPI ? (
                <ol className="text-xs opacity-90 list-decimal pl-4 space-y-1">
                  <li>Abra as configurações de localização do sistema operacional.</li>
                  <li>Permita que o Montshop acesse a localização.</li>
                  <li>Volte aqui e clique em &ldquo;Tentar novamente&rdquo;.</li>
                </ol>
              ) : (
                <ol className="text-xs opacity-90 list-decimal pl-4 space-y-1">
                  <li>Clique no ícone de cadeado/localização ao lado da URL.</li>
                  <li>Selecione &ldquo;Permitir&rdquo; para localização.</li>
                  <li>Volte aqui e clique em &ldquo;Tentar novamente&rdquo;.</li>
                </ol>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="mt-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {status === 'unsupported' && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Seu navegador não suporta geolocalização.</p>
          </div>
        )}

        {status === 'error' && error && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={onRefresh} className="mt-1">
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {coords && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latitude</span>
              <span className="font-mono">{coords.latitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longitude</span>
              <span className="font-mono">{coords.longitude.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precisão</span>
              <span>±{Math.round(coords.accuracyMeters)}m</span>
            </div>
            {config && distanceM !== null && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Distância da loja</span>
                <span
                  className={`font-medium flex items-center gap-1 ${
                    distanceM <= config.radiusMeters
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {distanceM <= config.radiusMeters && <CheckCircle2 className="h-3 w-3" />}
                  {formatDistance(distanceM)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Haversine local (cópia leve do util do backend para evitar acoplamento)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
