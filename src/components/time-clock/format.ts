// Funções utilitárias de formatação para o time-clock.
// Mantidas fora dos componentes para reuso e testabilidade.

/** Converte minutos em "XhYY" (ex: 90 → "1h30", 480 → "8h00") */
export function formatMinutesAsHM(min: number | null | undefined): string {
  if (min === null || min === undefined || isNaN(min) || min < 0) return '0h00';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${m < 10 ? '0' : ''}${m}`;
}

/** Converte minutos em "Xh Ymin" (ex: 90 → "1h 30min") */
export function formatMinutesLong(min: number | null | undefined): string {
  if (min === null || min === undefined || isNaN(min) || min < 0) return '0h';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Dias trabalhados no formato "completos/total", sem undefined. */
export function formatWorkedDays(stats?: {
  workedDays?: number | null;
  totalDays?: number | null;
  completedDays?: number | null;
  incompleteDays?: number | null;
} | null): string {
  const worked = Number(stats?.workedDays ?? stats?.completedDays ?? 0);
  const incomplete = Number(stats?.incompleteDays ?? 0);
  const total = Number(
    stats?.totalDays ??
      (stats?.completedDays != null ? Number(stats.completedDays) + incomplete : 0),
  );
  const safeWorked = Number.isFinite(worked) ? worked : 0;
  const safeTotal = Number.isFinite(total) ? total : 0;
  return `${safeWorked}/${safeTotal}`;
}

/** Formata distância em metros com unidade adequada */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/** Folga máxima pela imprecisão do GPS (metros). Deve bater com a API. */
export const GPS_ACCURACY_SLOP_CAP_METERS = 75;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Mesma regra da API: raio da loja + precisão do GPS (limitada). */
export function isWithinRadius(
  distanceMeters: number,
  radiusMeters: number,
  accuracyMeters = 0,
): boolean {
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(radiusMeters)) {
    return false;
  }
  const slop = Math.min(Math.max(accuracyMeters || 0, 0), GPS_ACCURACY_SLOP_CAP_METERS);
  return distanceMeters <= radiusMeters + slop;
}
