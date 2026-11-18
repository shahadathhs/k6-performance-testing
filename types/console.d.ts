/**
 * Minimal `console` declaration for the k6 runtime.
 *
 * @types/k6 deliberately ships no console global (it's not part of ES), but
 * k6 provides one at runtime. Kept local so we don't pull in the whole DOM
 * lib for one object.
 */
declare var console: {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  debug(...data: unknown[]): void;
};
