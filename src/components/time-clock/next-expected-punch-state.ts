import type { TimeClockType } from '../../types';

export type NextExpectedPunchState =
  | { kind: 'loading' }
  | { kind: 'idle' }
  | { kind: 'complete' }
  | { kind: 'next'; nextType: TimeClockType };

/**
 * Decide o que mostrar no card de próxima marcação.
 * `nextType === null` só significa jornada completa quando os dados de hoje já chegaram.
 */
export function resolveNextExpectedPunchState(opts: {
  loading?: boolean;
  /** true quando a resposta de my-today já está disponível */
  ready?: boolean;
  nextType?: TimeClockType | null;
}): NextExpectedPunchState {
  if (opts.loading) return { kind: 'loading' };
  if (!opts.ready) return { kind: 'idle' };
  if (opts.nextType) return { kind: 'next', nextType: opts.nextType };
  return { kind: 'complete' };
}
