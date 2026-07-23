// Declarações mínimas para os testes espelhados da web (Jest).
// O projeto desktop não tem Jest instalado (Task 6 não adiciona test runner);
// estas declarações apenas satisfazem o tsc quando o arquivo de teste
// está incluído em `tsc --noEmit`. Quando um test runner for adotado no
// desktop, basta substituir este arquivo pelos tipos oficiais do runner.

interface ExpectMatchers<R = unknown> {
  toBe(expected: unknown): R;
  toEqual(expected: unknown): R;
  toHaveLength(n: number): R;
  toBeUndefined(): R;
  toBeDefined(): R;
  toMatchObject(expected: Record<string, unknown>): R;
  toBeGreaterThan(n: number): R;
}

interface Expect {
  (value: unknown): ExpectMatchers;
  any(): unknown;
  any(constructor: unknown): unknown;
}

declare const expect: Expect;

interface ItEach {
  <T extends readonly unknown[]>(
    cases: readonly T[],
  ): (name: string, fn: (...args: T) => void | Promise<void>) => void;
}

interface ItFn {
  (name: string, fn: () => void | Promise<void>): void;
  each: ItEach;
}

declare const it: ItFn;

declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;
