/**
 * The single import point for jslib.k6.io — Grafana's official k6
 * module library, fetched by URL at runtime (k6 has no npm support).
 *
 * URL imports live ONLY here; scenarios import this local module like
 * any other. Adding another jslib helper? Re-export it below and add its
 * type to types/jslib.d.ts.
 */

export {
  randomIntBetween,
  randomString,
  randomItem,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

export { default as papaparse } from "https://jslib.k6.io/papaparse/5.1.1/index.js";
