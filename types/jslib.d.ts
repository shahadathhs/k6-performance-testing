/**
 * Ambient types for remote jslib.k6.io modules.
 *
 * k6 imports these URLs directly at runtime (verified working), but tsc
 * cannot resolve URL specifiers — these declarations keep type checking
 * green. https://grafana.com/docs/k6/latest/javascript-api/jslib/
 */

declare module "https://jslib.k6.io/k6-utils/1.2.0/index.js" {
  export function randomIntBetween(min: number, max: number): number;
  export function randomString(length: number, charset?: string): string;
  export function randomItem<S>(items: S[]): S;
  export function uuidv4(): string;
}

declare module "https://jslib.k6.io/papaparse/5.1.1/index.js" {
  export interface PapaParseResult<T> {
    data: T[];
    errors: unknown[];
    meta: { fields?: string[] };
  }
  export function parse<T>(csv: string, config: { header: boolean }): PapaParseResult<T>;
  const papaparse: { parse: typeof parse };
  export default papaparse;
}
