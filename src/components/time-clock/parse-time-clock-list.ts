/** Resposta paginada de histórico/listagem de ponto. */
export function parseTimeClockListResponse(data: unknown): {
  items: any[];
  total: number;
} {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  if (!data || typeof data !== 'object') {
    return { items: [], total: 0 };
  }
  const obj = data as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.punches)
        ? obj.punches
        : [];
  const total =
    typeof obj.total === 'number' && Number.isFinite(obj.total)
      ? obj.total
      : items.length;
  return { items, total };
}
